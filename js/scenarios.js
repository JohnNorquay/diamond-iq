// Diamond IQ - Scenario Loading & Evaluation

async function loadScenarios(position = null) {
  const sb = getSupabase();
  const { data, error } = await sb
    .from('diq_scenarios')
    .select('*, actions:diq_scenario_actions(*)')
    .eq('is_active', true)
    .order('difficulty', { ascending: true });

  if (error) {
    console.error('Failed to load scenarios:', error);
    return [];
  }
  return data || [];
}

// Pick a scenario that matches the current inning state
function pickScenarioForInning(scenarios, currentRunners, playerPosition, recentHitZones = [], forceFielder = false) {
  const sortedRunners = [...currentRunners].sort();

  // Try exact runner match
  let matches = scenarios.filter(s => {
    const sRunners = [...(s.runners_on || [])].sort();
    return JSON.stringify(sRunners) === JSON.stringify(sortedRunners);
  });

  // If no exact match, try subsets
  if (matches.length === 0 && sortedRunners.length > 1) {
    for (const runner of sortedRunners) {
      const subset = scenarios.filter(s => {
        const sRunners = s.runners_on || [];
        return sRunners.length === 1 && sRunners[0] === runner;
      });
      if (subset.length > 0) { matches = subset; break; }
    }
  }

  // Fall back to "nobody on"
  if (matches.length === 0) {
    matches = scenarios.filter(s => !s.runners_on || s.runners_on.length === 0);
  }

  if (matches.length === 0) return scenarios[0];

  // If we need to force a ball hit to the player, filter for those
  if (forceFielder) {
    const fielderMatches = matches.filter(s => s.ball_hit_zone === playerPosition);
    if (fielderMatches.length > 0) matches = fielderMatches;
  }

  // Avoid recently used hit zones (don't hit to SS three times in a row)
  const freshMatches = matches.filter(s => !recentHitZones.includes(s.ball_hit_zone));
  if (freshMatches.length > 0) matches = freshMatches;

  // Score scenarios by how interesting they are for this player
  matches.forEach(s => {
    const act = s.actions?.find(ac => ac.position_code === playerPosition);
    let score = Math.random() * 2; // base randomness
    if (act?.action_type === 'field_and_throw') score += 4;
    else if (act?.target_zone?.startsWith('cutoff')) score += 3;
    else if (act?.target_zone && !act.target_zone.startsWith('stay')) score += 2;
    s._pickScore = score;
  });

  matches.sort((a, b) => b._pickScore - a._pickScore);

  // Pick from top 3 with some randomness
  const topN = Math.min(matches.length, 3);
  const picked = matches[Math.floor(Math.random() * topN)];

  // Apply dynamic cutoff positions based on game situation
  if (picked) applyDynamicCutoffs(picked);

  return picked;
}

function getPlayerAction(scenario, positionCode) {
  return scenario.actions?.find(a => a.position_code === positionCode) || null;
}

// ==========================================
// DYNAMIC CUTOFF POSITIONING
// ==========================================
// Calculates the cutoff position as the midpoint between the outfielder
// and the target base, based on the game situation (runners on base).

const BASE_POSITIONS = {
  '1B': { x: 72, y: 58 },
  '2B': { x: 50, y: 38 },
  '3B': { x: 28, y: 58 },
  'home': { x: 50, y: 90 },
};

// Determine which base the cutoff is lining up toward
function getCutoffTargetBase(scenario, action) {
  const zone = action.target_zone || '';
  const runners = scenario.runners_on || [];
  const hitZone = scenario.ball_hit_zone;
  const isLeftSide = ['LF', 'LCF'].includes(hitZone);
  const isRightSide = ['RF', 'RCF'].includes(hitZone);

  // Explicit zone names tell us the target
  if (zone.includes('home')) return 'home';
  if (zone.includes('3B') || zone.includes('to_3B')) return '3B';

  // Context-based: left side cutoff (SS)
  if (isLeftSide) {
    if (runners.includes('2B') && !runners.includes('1B')) {
      // Runner on 2nd only — cutoff to home (runner tags up to score)
      return 'home';
    }
    if (runners.includes('2B') && runners.includes('1B')) {
      // 1st and 2nd — cutoff between 2nd and 3rd (split the difference)
      return '2B-3B';
    }
    // Default: cutoff toward 2nd base
    return '2B';
  }

  // Context-based: right side cutoff (2B)
  if (isRightSide) {
    if (runners.includes('2B') && !runners.includes('1B')) {
      // Runner on 2nd tagging — cutoff toward 3rd
      return '3B';
    }
    if (runners.includes('2B') && runners.includes('1B')) {
      // 1st and 2nd — cutoff between 2nd and 3rd
      return '2B-3B';
    }
    // Default: cutoff toward 2nd base
    return '2B';
  }

  return '2B'; // fallback
}

// Calculate midpoint between outfielder and target base
function calculateCutoffPosition(outfielderPos, targetBase) {
  let basePos;
  if (targetBase === '2B-3B') {
    // Split between 2nd and 3rd — average of those two bases
    basePos = {
      x: (BASE_POSITIONS['2B'].x + BASE_POSITIONS['3B'].x) / 2,
      y: (BASE_POSITIONS['2B'].y + BASE_POSITIONS['3B'].y) / 2
    };
  } else {
    basePos = BASE_POSITIONS[targetBase];
  }

  if (!basePos || !outfielderPos) return null;

  return {
    x: Math.round((outfielderPos.x + basePos.x) / 2),
    y: Math.round((outfielderPos.y + basePos.y) / 2)
  };
}

// Apply dynamic cutoff positions to all actions in a scenario
function applyDynamicCutoffs(scenario) {
  if (!scenario.actions) return;

  const hitZone = scenario.ball_hit_zone;
  const outfielderPos = DEFAULT_POSITIONS[hitZone];
  if (!outfielderPos) return; // not an outfield hit

  const outfieldPositions = ['LF', 'LCF', 'RCF', 'RF'];
  if (!outfieldPositions.includes(hitZone)) return; // only for outfield hits

  scenario.actions.forEach(action => {
    if (!action.target_zone || !action.target_zone.startsWith('cutoff')) return;

    const targetBase = getCutoffTargetBase(scenario, action);
    const pos = calculateCutoffPosition(outfielderPos, targetBase);

    if (pos) {
      action.target_x = pos.x;
      action.target_y = pos.y;

      // Update label to reflect the target
      const baseLabel = targetBase === '2B-3B' ? '2nd/3rd' :
        targetBase === 'home' ? 'Home' :
        targetBase === '3B' ? '3rd' : '2nd';
      action.target_label = `Cutoff (→${baseLabel})`;
    }
  });
}

function evaluateMove(tapX, tapY, action) {
  const targetX = action.target_x;
  const targetY = action.target_y;
  const tolerance = action.position_tolerance || 8;
  const correct = isInZone(tapX, tapY, targetX, targetY, tolerance);

  return {
    correct,
    targetX,
    targetY,
    targetLabel: action.target_label,
    explanation: action.explanation,
    distance: Math.sqrt((tapX - targetX) ** 2 + (tapY - targetY) ** 2)
  };
}

function evaluateThrow(selectedPosition, action) {
  const correct = selectedPosition === action.throw_to_position;
  return {
    correct,
    correctTarget: action.throw_to_position,
    throwToLabel: action.throw_to_label || `Throw to ${action.throw_to_position}`,
    explanation: action.explanation
  };
}

function describeScenario(scenario) {
  const hitTo = POSITION_NAMES[scenario.ball_hit_zone] || scenario.ball_hit_zone;
  const runners = scenario.runners_on || [];

  let runnerText = 'Nobody on base';
  if (runners.length > 0) {
    const bases = runners.map(r => r === '1B' ? '1st' : r === '2B' ? '2nd' : r === '3B' ? '3rd' : r);
    runnerText = `Runner${bases.length > 1 ? 's' : ''} on ${bases.join(' and ')}`;
  }

  return { title: scenario.name, hitTo: `Ball hit to ${hitTo}`, runners: runnerText };
}

function getInstruction(action) {
  if (action.action_type === 'field_and_throw') {
    return "You've got the ball! Who do you throw to?";
  }
  return 'Where should you go? Tap a target!';
}
