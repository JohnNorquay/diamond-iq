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
  return matches[Math.floor(Math.random() * topN)];
}

function getPlayerAction(scenario, positionCode) {
  return scenario.actions?.find(a => a.position_code === positionCode) || null;
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
