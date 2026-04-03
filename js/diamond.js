// Diamond IQ - SVG Baseball Diamond Renderer

const FIELD = {
  WIDTH: 400,
  HEIGHT: 400,
  HOME: { x: 200, y: 360 },
  FIRST: { x: 300, y: 240 },
  SECOND: { x: 200, y: 150 },
  THIRD: { x: 100, y: 240 },
  MOUND: { x: 200, y: 255 },
};

const NEXT_BASE = { '1B': '2B', '2B': '3B', '3B': 'HOME' };
const BASE_SVG = {
  '1B': FIELD.FIRST,
  '2B': FIELD.SECOND,
  '3B': FIELD.THIRD,
  'HOME': FIELD.HOME,
};

function toSVG(px, py) {
  return { x: (px / 100) * FIELD.WIDTH, y: (py / 100) * FIELD.HEIGHT };
}

function toPercent(sx, sy) {
  return { x: (sx / FIELD.WIDTH) * 100, y: (sy / FIELD.HEIGHT) * 100 };
}

// Zone definitions (percentage coords)
const ZONES = {
  'home': { x: 50, y: 90, label: 'Home Plate' },
  '1B': { x: 72, y: 58, label: '1st Base' },
  '2B': { x: 50, y: 38, label: '2nd Base' },
  '3B': { x: 28, y: 58, label: '3rd Base' },
  'cutoff_LF': { x: 32, y: 45, label: 'Cutoff (LF)' },
  'cutoff_LCF': { x: 42, y: 38, label: 'Cutoff (LCF)' },
  'cutoff_RCF': { x: 58, y: 38, label: 'Cutoff (RCF)' },
  'cutoff_RF': { x: 68, y: 45, label: 'Cutoff (RF)' },
  'cutoff_RF_to_3B': { x: 60, y: 45, label: 'Cutoff (RF→3B)' },
  'cutoff_home_LCF': { x: 42, y: 55, label: 'Cutoff (→Home)' },
  'backup_1B': { x: 82, y: 50, label: 'Back up 1st' },
  'backup_2B': { x: 50, y: 28, label: 'Back up 2nd' },
  'backup_3B': { x: 18, y: 50, label: 'Back up 3rd' },
  'backup_home': { x: 50, y: 97, label: 'Back up Home' },
  'backup_SS': { x: 35, y: 35, label: 'Back up SS' },
  'stay_P': { x: 50, y: 62, label: 'Stay (Pitcher)' },
  'stay_C': { x: 50, y: 93, label: 'Stay (Catcher)' },
  'stay_1B': { x: 70, y: 60, label: 'Stay (1B)' },
  'stay_2B': { x: 60, y: 45, label: 'Stay (2B)' },
  'stay_3B': { x: 30, y: 60, label: 'Stay (3B)' },
  'stay_SS': { x: 40, y: 45, label: 'Stay (SS)' },
};

const DEFAULT_POSITIONS = {
  'P':   { x: 50, y: 62 },
  'C':   { x: 50, y: 93 },
  '1B':  { x: 70, y: 60 },
  '2B':  { x: 60, y: 45 },
  '3B':  { x: 30, y: 60 },
  'SS':  { x: 40, y: 45 },
  'LF':  { x: 20, y: 25 },
  'LCF': { x: 38, y: 18 },
  'RCF': { x: 62, y: 18 },
  'RF':  { x: 80, y: 25 },
};

const POSITION_NAMES = {
  'P': 'Pitcher', 'C': 'Catcher', '1B': '1st Base', '2B': '2nd Base',
  '3B': '3rd Base', 'SS': 'Shortstop', 'LF': 'Left Field', 'LCF': 'Left-Center',
  'RCF': 'Right-Center', 'RF': 'Right Field'
};

// Speed settings per difficulty level
const SPEED_LEVELS = {
  rookie: {
    BALL_TRAVEL_MS: 2200,    // Ball gets to fielder
    THROW_TRAVEL_MS: 2500,   // Throw to base
    RUNNER_TRAVEL_MS: 6500,  // Runner per base
    label: 'Rookie',
  },
  allstar: {
    BALL_TRAVEL_MS: 1400,
    THROW_TRAVEL_MS: 1600,
    RUNNER_TRAVEL_MS: 4500,
    label: 'All-Star',
  }
};

let currentSpeed = SPEED_LEVELS.rookie; // Start in Rookie mode

function setSpeedLevel(level) {
  currentSpeed = SPEED_LEVELS[level] || SPEED_LEVELS.rookie;
}

function createDiamondSVG() {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', `0 0 ${FIELD.WIDTH} ${FIELD.HEIGHT}`);
  svg.setAttribute('class', 'diamond-field');
  svg.setAttribute('id', 'diamond-svg');

  // Outfield grass
  svg.appendChild(svgEl('rect', { x: 0, y: 0, width: 400, height: 400, fill: '#1a8c3f' }));
  svg.appendChild(svgEl('ellipse', {
    cx: 200, cy: 360, rx: 220, ry: 220,
    fill: 'none', stroke: '#1f9e47', 'stroke-width': 2
  }));

  // Infield dirt
  svg.appendChild(svgEl('path', {
    d: `M ${FIELD.HOME.x} ${FIELD.HOME.y} L ${FIELD.FIRST.x} ${FIELD.FIRST.y} L ${FIELD.SECOND.x} ${FIELD.SECOND.y} L ${FIELD.THIRD.x} ${FIELD.THIRD.y} Z`,
    fill: '#c4883e', opacity: 0.7
  }));

  // Infield grass
  svg.appendChild(svgEl('path', {
    d: `M ${FIELD.HOME.x} ${FIELD.HOME.y - 40} L ${FIELD.FIRST.x - 30} ${FIELD.FIRST.y} L ${FIELD.SECOND.x} ${FIELD.SECOND.y + 30} L ${FIELD.THIRD.x + 30} ${FIELD.THIRD.y} Z`,
    fill: '#1f9e47'
  }));

  // Base paths
  [[FIELD.HOME, FIELD.FIRST], [FIELD.FIRST, FIELD.SECOND], [FIELD.SECOND, FIELD.THIRD], [FIELD.THIRD, FIELD.HOME]].forEach(([a, b]) => {
    svg.appendChild(svgEl('line', {
      x1: a.x, y1: a.y, x2: b.x, y2: b.y,
      stroke: '#ffffff', 'stroke-width': 2, opacity: 0.6
    }));
  });

  // Bases
  [FIELD.FIRST, FIELD.SECOND, FIELD.THIRD].forEach(b => {
    svg.appendChild(svgEl('rect', {
      x: b.x - 5, y: b.y - 5, width: 10, height: 10,
      fill: '#ffffff', transform: `rotate(45, ${b.x}, ${b.y})`
    }));
  });

  // Home plate
  svg.appendChild(svgEl('polygon', {
    points: `${FIELD.HOME.x},${FIELD.HOME.y - 6} ${FIELD.HOME.x + 6},${FIELD.HOME.y - 2} ${FIELD.HOME.x + 4},${FIELD.HOME.y + 4} ${FIELD.HOME.x - 4},${FIELD.HOME.y + 4} ${FIELD.HOME.x - 6},${FIELD.HOME.y - 2}`,
    fill: '#ffffff'
  }));

  // Mound
  svg.appendChild(svgEl('circle', { cx: FIELD.MOUND.x, cy: FIELD.MOUND.y, r: 8, fill: '#c4883e', stroke: '#a07030', 'stroke-width': 1 }));
  svg.appendChild(svgEl('rect', { x: FIELD.MOUND.x - 5, y: FIELD.MOUND.y - 1.5, width: 10, height: 3, fill: '#ffffff' }));

  // Layers (order = z-order, later = on top)
  // target-zones-layer ABOVE players so zone markers are tappable
  ['zones-layer', 'runners-layer', 'players-layer', 'target-zones-layer', 'ball-layer', 'feedback-layer'].forEach(id => {
    svg.appendChild(svgEl('g', { id }));
  });

  // Tap target layer
  svg.appendChild(svgEl('rect', {
    id: 'tap-layer', x: 0, y: 0, width: 400, height: 400,
    fill: 'transparent', style: 'cursor: crosshair; display: none;'
  }));

  return svg;
}

// Draw players
function drawPlayers(playerPosition, teamColor = '#1e40af') {
  const group = document.getElementById('players-layer');
  group.innerHTML = '';

  Object.entries(DEFAULT_POSITIONS).forEach(([code, pos]) => {
    const { x, y } = toSVG(pos.x, pos.y);
    const isYou = code === playerPosition;
    const r = isYou ? 16 : 12;

    const g = svgEl('g', {
      class: `player-dot ${isYou ? 'is-you' : ''}`,
      'data-position': code,
      transform: `translate(${x}, ${y})`
    });
    g.appendChild(svgEl('circle', {
      r, fill: isYou ? teamColor : '#475569',
      stroke: isYou ? '#ffffff' : '#94a3b8',
      'stroke-width': isYou ? 3 : 1.5
    }));
    const label = svgEl('text', {
      'text-anchor': 'middle', 'dominant-baseline': 'central',
      fill: '#ffffff', 'font-size': isYou ? '11' : '9', 'font-weight': '800'
    });
    label.textContent = code;
    g.appendChild(label);
    group.appendChild(g);
  });
}

function movePlayer(positionCode, targetPctX, targetPctY) {
  const dot = document.querySelector(`.player-dot[data-position="${positionCode}"]`);
  if (!dot) return;
  const { x, y } = toSVG(targetPctX, targetPctY);
  dot.setAttribute('transform', `translate(${x}, ${y})`);
}

function moveAIPlayers(actions, playerPosition) {
  actions.forEach(action => {
    if (action.position_code === playerPosition) return;
    if (action.target_x != null && action.target_y != null) {
      movePlayer(action.position_code, action.target_x, action.target_y);
    }
  });
}

// ==========================================
// TARGET ZONE MARKERS (X marks on the field)
// ==========================================

// Show tappable target zone markers for the player's possible positions
function showTargetZones(action, allActions) {
  const group = document.getElementById('target-zones-layer');
  group.innerHTML = '';

  if (action.action_type === 'field_and_throw') return;

  const relevantZones = getRelevantZones(action);

  relevantZones.forEach(zone => {
    const { x, y } = toSVG(zone.x, zone.y);

    const g = svgEl('g', {
      class: `target-zone-marker ${zone.isBase ? 'base-target' : 'cutoff-target'}`,
      'data-zone-x': zone.x,
      'data-zone-y': zone.y,
      'data-zone-label': zone.label
    });

    if (zone.isBase) {
      // Bases get a pulsing glow ring (no X mark — base is already visible)
      g.appendChild(svgEl('circle', {
        cx: x, cy: y, r: 18,
        fill: 'rgba(59, 130, 246, 0.25)',
        stroke: '#3b82f6', 'stroke-width': 3,
        class: 'base-glow'
      }));
      // Label for base
      const label = svgEl('text', {
        x: x, y: y + 26,
        'text-anchor': 'middle', fill: '#3b82f6',
        'font-size': '9', 'font-weight': '800',
        'paint-order': 'stroke', stroke: '#0f172a', 'stroke-width': 3
      });
      label.textContent = zone.label;
      g.appendChild(label);
    } else {
      // Cutoff/backup positions get bold X marks
      g.appendChild(svgEl('circle', {
        cx: x, cy: y, r: 18,
        fill: 'rgba(251, 191, 36, 0.2)',
        stroke: '#fbbf24', 'stroke-width': 2,
        'stroke-dasharray': '4 3'
      }));

      const size = 8;
      g.appendChild(svgEl('line', {
        x1: x - size, y1: y - size, x2: x + size, y2: y + size,
        stroke: '#fbbf24', 'stroke-width': 3, 'stroke-linecap': 'round'
      }));
      g.appendChild(svgEl('line', {
        x1: x + size, y1: y - size, x2: x - size, y2: y + size,
        stroke: '#fbbf24', 'stroke-width': 3, 'stroke-linecap': 'round'
      }));

      // Label
      const label = svgEl('text', {
        x: x, y: y + 26,
        'text-anchor': 'middle', fill: '#fbbf24',
        'font-size': '9', 'font-weight': '800',
        'paint-order': 'stroke', stroke: '#0f172a', 'stroke-width': 3
      });
      label.textContent = zone.label;
      g.appendChild(label);
    }

    group.appendChild(g);
  });
}

// Get relevant zones to display as options
function getRelevantZones(action) {
  const correctZone = {
    x: action.target_x,
    y: action.target_y,
    label: action.target_label || 'Here',
    isCorrect: true,
    isBase: isBasePosition(action.target_zone)
  };

  const alternatives = [];

  // Add bases as tappable options (glow style, not X)
  ['1B', '2B', '3B'].forEach(key => {
    const z = ZONES[key];
    if (z && !isSameSpot(z.x, z.y, correctZone.x, correctZone.y, 5)) {
      alternatives.push({ x: z.x, y: z.y, label: z.label, isCorrect: false, isBase: true });
    }
  });

  // Add cutoff/backup positions (X style)
  const cutoffBackupZones = [
    'cutoff_LF', 'cutoff_RF', 'cutoff_LCF', 'cutoff_RCF',
    'cutoff_RF_to_3B', 'cutoff_home_LCF',
    'backup_1B', 'backup_2B', 'backup_3B', 'backup_home'
  ];
  cutoffBackupZones.forEach(key => {
    const z = ZONES[key];
    if (z && !isSameSpot(z.x, z.y, correctZone.x, correctZone.y, 5)) {
      alternatives.push({ x: z.x, y: z.y, label: z.label, isCorrect: false, isBase: false });
    }
  });

  // Pick 3-4 alternatives (mix of bases and cutoffs)
  const bases = alternatives.filter(a => a.isBase).sort(() => Math.random() - 0.5).slice(0, 2);
  const cutoffs = alternatives.filter(a => !a.isBase).sort(() => Math.random() - 0.5).slice(0, 2);
  const selected = [...bases, ...cutoffs];

  return [correctZone, ...selected].sort(() => Math.random() - 0.5);
}

function isBasePosition(zoneKey) {
  return ['1B', '2B', '3B', 'home'].includes(zoneKey);
}

function isSameSpot(x1, y1, x2, y2, tolerance = 5) {
  return Math.sqrt((x1 - x2) ** 2 + (y1 - y2) ** 2) < tolerance;
}

function clearTargetZones() {
  const group = document.getElementById('target-zones-layer');
  if (group) group.innerHTML = '';
}

// ==========================================
// RUNNERS
// ==========================================

function drawRunners(runnersOn = []) {
  const group = document.getElementById('runners-layer');
  group.innerHTML = '';

  runnersOn.forEach(base => {
    const pos = BASE_SVG[base];
    if (!pos) return;

    const g = svgEl('g', { class: 'runner-group', 'data-runner-base': base });
    g.appendChild(svgEl('circle', { cx: pos.x, cy: pos.y - 14, r: 8, class: 'runner-dot' }));
    const label = svgEl('text', {
      x: pos.x, y: pos.y - 14,
      'text-anchor': 'middle', 'dominant-baseline': 'central',
      fill: '#ffffff', 'font-size': '8', 'font-weight': '800'
    });
    label.textContent = 'R';
    g.appendChild(label);
    group.appendChild(g);
  });
}

// Animate runners advancing — returns promise, resolves with ms elapsed
function animateRunners(runnersOn = []) {
  if (runnersOn.length === 0) return Promise.resolve();

  const promises = runnersOn.map(base => {
    const nextBase = NEXT_BASE[base];
    if (!nextBase) return Promise.resolve();

    const runnerGroup = document.querySelector(`.runner-group[data-runner-base="${base}"]`);
    if (!runnerGroup) return Promise.resolve();

    const circle = runnerGroup.querySelector('circle');
    const text = runnerGroup.querySelector('text');
    if (!circle || !text) return Promise.resolve();

    const from = BASE_SVG[base];
    const to = BASE_SVG[nextBase];

    return new Promise(resolve => {
      const startTime = performance.now();
      function step(now) {
        const elapsed = now - startTime;
        const progress = Math.min(elapsed / currentSpeed.RUNNER_TRAVEL_MS, 1);
        const eased = 1 - (1 - progress) * (1 - progress);

        const cx = from.x + (to.x - from.x) * eased;
        const cy = (from.y - 14) + ((to.y - 14) - (from.y - 14)) * eased;

        circle.setAttribute('cx', cx);
        circle.setAttribute('cy', cy);
        text.setAttribute('x', cx);
        text.setAttribute('y', cy);

        if (progress < 1) {
          requestAnimationFrame(step);
        } else {
          resolve();
        }
      }
      requestAnimationFrame(step);
    });
  });

  return Promise.all(promises);
}

// Add batter running to first
function addBatterRunner() {
  const group = document.getElementById('runners-layer');
  const g = svgEl('g', { class: 'runner-group', 'data-runner-base': 'batter' });
  g.appendChild(svgEl('circle', { cx: FIELD.HOME.x, cy: FIELD.HOME.y - 14, r: 8, class: 'runner-dot batter-dot' }));
  const label = svgEl('text', {
    x: FIELD.HOME.x, y: FIELD.HOME.y - 14,
    'text-anchor': 'middle', 'dominant-baseline': 'central',
    fill: '#ffffff', 'font-size': '8', 'font-weight': '800'
  });
  label.textContent = 'B';
  g.appendChild(label);
  group.appendChild(g);

  // Animate batter to 1st
  const circle = g.querySelector('circle');
  const text = g.querySelector('text');
  const from = FIELD.HOME;
  const to = FIELD.FIRST;

  return new Promise(resolve => {
    const startTime = performance.now();
    function step(now) {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / currentSpeed.RUNNER_TRAVEL_MS, 1);
      const eased = 1 - (1 - progress) * (1 - progress);

      const cx = from.x + (to.x - from.x) * eased;
      const cy = (from.y - 14) + ((to.y - 14) - (from.y - 14)) * eased;

      circle.setAttribute('cx', cx);
      circle.setAttribute('cy', cy);
      text.setAttribute('x', cx);
      text.setAttribute('y', cy);

      if (progress < 1) {
        requestAnimationFrame(step);
      } else {
        resolve();
      }
    }
    requestAnimationFrame(step);
  });
}

// ==========================================
// BALL ANIMATIONS
// ==========================================

// Animate ball hit from home plate to field position
function animateBall(hitZone) {
  const group = document.getElementById('ball-layer');
  group.innerHTML = '';

  const targetPos = DEFAULT_POSITIONS[hitZone];
  if (!targetPos) return Promise.resolve();

  const target = toSVG(targetPos.x, targetPos.y);
  const start = { x: FIELD.HOME.x, y: FIELD.HOME.y - 10 };

  const trail = svgEl('g', { id: 'ball-trail' });
  group.appendChild(trail);

  const ball = svgEl('circle', {
    cx: start.x, cy: start.y, r: 6,
    fill: '#ffffff', stroke: '#888888', 'stroke-width': 1.5
  });
  group.appendChild(ball);

  // Bat crack at the start!
  if (typeof playBatCrack === 'function') playBatCrack();

  return new Promise(resolve => {
    const startTime = performance.now();
    let lastTrailTime = 0;

    function step(now) {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / currentSpeed.BALL_TRAVEL_MS, 1);
      const eased = 1 - Math.pow(1 - progress, 2);

      const cx = start.x + (target.x - start.x) * eased;
      const cy = start.y + (target.y - start.y) * eased;

      ball.setAttribute('cx', cx);
      ball.setAttribute('cy', cy);

      if (now - lastTrailTime > 80 && progress < 0.95) {
        lastTrailTime = now;
        const dot = svgEl('circle', { cx, cy, r: 3, fill: '#ffffff', opacity: 0.5 });
        trail.appendChild(dot);
        setTimeout(() => { dot.setAttribute('opacity', '0.2'); setTimeout(() => dot.remove(), 300); }, 200);
      }

      if (progress < 1) {
        requestAnimationFrame(step);
      } else {
        // Glove snap when fielder catches it
        if (typeof playGloveSnap === 'function') playGloveSnap();
        ball.setAttribute('r', '7');
        setTimeout(() => ball.setAttribute('r', '6'), 150);
        resolve();
      }
    }
    requestAnimationFrame(step);
  });
}

// Throw speed multiplier by position (SS/3B throw harder than 2B/P)
const THROW_SPEED_MULTIPLIER = {
  'SS': 0.75,   // Fastest arm on the infield
  '3B': 0.8,    // Strong arm, long throws
  'C':  0.8,    // Catchers have cannons
  '1B': 0.9,
  '2B': 1.0,    // Shorter throws, normal speed
  'P':  1.0,
  'LF': 1.0,
  'LCF': 1.0,
  'RCF': 1.0,
  'RF': 0.85,   // RF usually has the strongest outfield arm
};

// Get where a player dot currently is on the field (after moveAIPlayers)
function getPlayerCurrentPosition(positionCode) {
  const dot = document.querySelector(`.player-dot[data-position="${positionCode}"]`);
  if (!dot) return null;
  const transform = dot.getAttribute('transform');
  const match = transform?.match(/translate\(([\d.]+),\s*([\d.]+)\)/);
  if (!match) return null;
  return { x: parseFloat(match[1]), y: parseFloat(match[2]) };
}

// Animate throw from fielder to a base position
function animateThrow(fromPositionCode, toPositionCode) {
  const group = document.getElementById('ball-layer');

  // Grab ball position BEFORE clearing
  const existingBall = group.querySelector('circle');
  let from;
  if (existingBall) {
    from = { x: parseFloat(existingBall.getAttribute('cx')), y: parseFloat(existingBall.getAttribute('cy')) };
  } else {
    const fromPos = DEFAULT_POSITIONS[fromPositionCode];
    if (!fromPos) return Promise.resolve();
    from = toSVG(fromPos.x, fromPos.y);
  }

  // Now clear
  group.innerHTML = '';

  // Throw target: use the player's CURRENT position on the field (where they moved to),
  // not their default fielding spot. This handles SS covering 2B, etc.
  const playerPos = getPlayerCurrentPosition(toPositionCode);
  let to;
  if (playerPos) {
    to = playerPos; // Already in SVG coordinates
  } else {
    const toZone = ZONES[toPositionCode] || DEFAULT_POSITIONS[toPositionCode];
    if (!toZone) return Promise.resolve();
    to = toSVG(toZone.x, toZone.y);
  }

  // Apply position-based throw speed
  const speedMult = THROW_SPEED_MULTIPLIER[fromPositionCode] || 1.0;
  const throwDuration = currentSpeed.THROW_TRAVEL_MS * speedMult;

  const ball = svgEl('circle', {
    cx: from.x, cy: from.y, r: 5,
    fill: '#ffffff', stroke: '#fbbf24', 'stroke-width': 2
  });
  group.appendChild(ball);

  // Throw line (shows the path)
  const throwLine = svgEl('line', {
    x1: from.x, y1: from.y, x2: from.x, y2: from.y,
    stroke: '#fbbf24', 'stroke-width': 1.5, opacity: 0.4,
    'stroke-dasharray': '4 3'
  });
  group.insertBefore(throwLine, ball);

  return new Promise(resolve => {
    const startTime = performance.now();

    function step(now) {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / throwDuration, 1);
      // Throw is more linear (faster, direct line)
      const eased = progress;

      const cx = from.x + (to.x - from.x) * eased;
      const cy = from.y + (to.y - from.y) * eased;

      ball.setAttribute('cx', cx);
      ball.setAttribute('cy', cy);
      throwLine.setAttribute('x2', cx);
      throwLine.setAttribute('y2', cy);

      if (progress < 1) {
        requestAnimationFrame(step);
      } else {
        // Glove snap when throw is caught
        if (typeof playGloveSnap === 'function') playGloveSnap();
        ball.setAttribute('stroke', '#22c55e');
        ball.setAttribute('r', '7');
        setTimeout(() => ball.setAttribute('r', '5'), 200);
        resolve();
      }
    }
    requestAnimationFrame(step);
  });
}

function clearBall() {
  const group = document.getElementById('ball-layer');
  if (group) group.innerHTML = '';
}

// ==========================================
// FEEDBACK
// ==========================================

function showZoneHighlight(targetX, targetY, isCorrect = true) {
  const group = document.getElementById('feedback-layer');
  const { x, y } = toSVG(targetX, targetY);

  group.appendChild(svgEl('circle', {
    cx: x, cy: y, r: 24,
    fill: isCorrect ? '#22c55e' : '#ef4444',
    opacity: 0.4, class: 'correct-marker'
  }));

  const check = svgEl('text', {
    x, y, 'text-anchor': 'middle', 'dominant-baseline': 'central',
    fill: '#ffffff', 'font-size': '20', 'font-weight': '900',
    class: 'correct-marker'
  });
  check.textContent = isCorrect ? '✓' : '✗';
  group.appendChild(check);
}

function showCorrectionArrow(fromX, fromY, toX, toY) {
  const group = document.getElementById('feedback-layer');
  const from = toSVG(fromX, fromY);
  const to = toSVG(toX, toY);
  group.appendChild(svgEl('line', {
    x1: from.x, y1: from.y, x2: to.x, y2: to.y,
    class: 'correction-arrow'
  }));
}

function clearFeedback() {
  const group = document.getElementById('feedback-layer');
  if (group) group.innerHTML = '';
}

// Show big OUT! or SAFE! or BASE HIT! on the field
function showFieldResult(isOut, isBaseHit = false) {
  const group = document.getElementById('feedback-layer');

  const label = isOut ? 'OUT!' : (isBaseHit ? 'BASE HIT!' : 'SAFE!');
  const color = isOut ? 'rgba(34, 197, 94, 0.9)' : 'rgba(239, 68, 68, 0.9)';
  const fontSize = isBaseHit ? '36' : '48';

  group.appendChild(svgEl('rect', {
    x: 80, y: 160, width: 240, height: 80, rx: 16,
    fill: color, class: 'correct-marker'
  }));

  const text = svgEl('text', {
    x: 200, y: 208,
    'text-anchor': 'middle', 'dominant-baseline': 'central',
    fill: '#ffffff', 'font-size': fontSize, 'font-weight': '900',
    class: 'correct-marker'
  });
  text.textContent = label;
  group.appendChild(text);
}

// ==========================================
// INPUT HELPERS
// ==========================================

function getTapPosition(svg, event) {
  const pt = svg.createSVGPoint();
  const touch = event.touches ? event.touches[0] : event;
  pt.x = touch.clientX;
  pt.y = touch.clientY;
  const svgPt = pt.matrixTransform(svg.getScreenCTM().inverse());
  return toPercent(svgPt.x, svgPt.y);
}

function isInZone(tapX, tapY, targetX, targetY, tolerance = 8) {
  return Math.sqrt((tapX - targetX) ** 2 + (tapY - targetY) ** 2) <= tolerance;
}

function findNearestZone(tapX, tapY) {
  let nearest = null;
  let minDist = Infinity;
  Object.entries(ZONES).forEach(([key, zone]) => {
    const dist = Math.sqrt((tapX - zone.x) ** 2 + (tapY - zone.y) ** 2);
    if (dist < minDist) { minDist = dist; nearest = { key, ...zone, distance: dist }; }
  });
  return nearest;
}

function addTapRipple(svg, tapX, tapY) {
  const { x, y } = toSVG(tapX, tapY);
  const group = document.getElementById('feedback-layer');
  const ripple = svgEl('circle', { cx: x, cy: y, r: 5, class: 'tap-ripple' });
  group.appendChild(ripple);
  setTimeout(() => ripple.remove(), 600);
}

function highlightThrowTargets(actions, playerPosition) {
  // Make ALL player dots throwable — including yourself (for "step on the bag" plays)
  document.querySelectorAll('.player-dot').forEach(dot => {
    dot.classList.add('throwable');
  });
}

function clearThrowTargets() {
  document.querySelectorAll('.player-dot.throwable').forEach(dot => dot.classList.remove('throwable'));
}

function resetPlayers() {
  Object.entries(DEFAULT_POSITIONS).forEach(([code, pos]) => movePlayer(code, pos.x, pos.y));
}

function svgEl(tag, attrs = {}) {
  const el = document.createElementNS('http://www.w3.org/2000/svg', tag);
  Object.entries(attrs).forEach(([k, v]) => el.setAttribute(k, v));
  return el;
}
