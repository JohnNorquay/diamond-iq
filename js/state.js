// Diamond IQ - Game State Machine (Inning Mode)

const Game = {
  state: 'HOME',
  session: {
    playerId: null,
    playerName: '',
    teamId: null,
    position: null,
    sessionId: crypto.randomUUID(),
    scenarios: [],

    // Inning state
    outs: 0,
    runners: [],       // e.g. ['1B', '2B'] — dynamic, carries between plays
    runsScored: 0,
    playsCompleted: 0,
    inningNumber: 1,

    // Scoring
    streak: 0,
    bestStreak: 0,
    totalPoints: 0,
    correctCount: 0,
    totalAnswered: 0,

    // Current play
    currentScenario: null,
    currentAction: null,
    timerStart: null,
    timerInterval: null,
    playerAnswered: false,
    playerAnswerCorrect: false,
    playerAnswerTime: null,
  },

  init() {
    const saved = localStorage.getItem('diq_player');
    if (saved) {
      try {
        const data = JSON.parse(saved);
        this.session.playerId = data.playerId;
        this.session.playerName = data.playerName;
        this.session.teamId = data.teamId;
        this.session.teamName = data.teamName || '';
        this.session.teamCode = data.teamCode || '';
      } catch (e) { /* ignore */ }
    }
    this.transition('HOME');
  },

  transition(newState, data = {}) {
    console.log(`State: ${this.state} → ${newState}`, data);
    this.state = newState;
    this.render(newState, data);
  },

  render(state, data) {
    document.querySelectorAll('.screen, .game-container, .summary-container').forEach(el => el.classList.remove('active'));
    // Hide leaderboard/instructions when switching screens
    document.getElementById('leaderboard-section')?.classList.add('hidden');
    document.getElementById('instructions-section')?.classList.add('hidden');
    const readyEl = document.getElementById('ready-overlay');
    if (readyEl) { readyEl.classList.remove('active'); readyEl.innerHTML = ''; }
    document.getElementById('feedback-overlay')?.classList.remove('active');

    switch (state) {
      case 'HOME': this.renderHome(); break;
      case 'TEAM_CODE': this.renderTeamCode(); break;
      case 'PLAYER_SELECT': this.renderPlayerSelect(); break;
      case 'SECRET_WORD': this.renderSecretWord(data); break;
      case 'COACH_LOGIN': this.renderCoachLogin(); break;
      case 'CREATE_TEAM': this.renderCreateTeam(); break;
      case 'COACH_MANAGE': this.renderCoachManage(data); break;
      case 'POSITION_SELECT': this.renderPositionSelect(); break;
      case 'LOADING': this.renderLoading(); break;
      case 'READY': this.renderReady(data); break;
      case 'PLAYING': this.renderPlaying(data); break;
      case 'FEEDBACK': this.renderFeedback(data); break;
      case 'SUMMARY': this.renderSummary(); break;
    }
  },

  renderHome() {
    const screen = document.getElementById('screen-home');
    screen.classList.add('active');

    const loggedIn = document.getElementById('home-logged-in');
    const notLoggedIn = document.getElementById('home-not-logged-in');

    if (this.session.playerId && this.session.playerName) {
      loggedIn.classList.remove('hidden');
      notLoggedIn.classList.add('hidden');
      document.getElementById('home-player-name').textContent = `Welcome back, ${this.session.playerName}!`;
      document.getElementById('home-team-name').textContent = this.session.teamName || '';
    } else {
      loggedIn.classList.add('hidden');
      notLoggedIn.classList.remove('hidden');
    }
  },

  renderTeamCode() {
    document.getElementById('screen-team-code').classList.add('active');
    document.getElementById('team-code-error').classList.add('hidden');
    const input = document.getElementById('team-code-input');
    input.value = '';
    setTimeout(() => input.focus(), 100);
  },

  renderSecretWord(data) {
    document.getElementById('screen-secret-word').classList.add('active');
    document.getElementById('secret-word-error').classList.add('hidden');
    const input = document.getElementById('secret-word-input');
    input.value = '';

    const player = data?.player;
    const isNewPlayer = !player?.secret_word;

    if (isNewPlayer) {
      document.getElementById('secret-word-title').textContent = `Hey ${player?.name}!`;
      document.getElementById('secret-word-desc').textContent =
        "Pick a secret word so only you can use your name. It can be anything — your middle name, your pet's name, a favorite word!";
      document.getElementById('btn-secret-word').textContent = "That's My Word!";
    } else {
      document.getElementById('secret-word-title').textContent = `Welcome back, ${player?.name}!`;
      document.getElementById('secret-word-desc').textContent = "Enter your secret word to continue.";
      document.getElementById('btn-secret-word').textContent = "Let's Go!";
    }

    this._pendingPlayer = player;
    this._isNewPlayer = isNewPlayer;
    setTimeout(() => input.focus(), 100);
  },

  renderCoachLogin() {
    document.getElementById('screen-coach-login').classList.add('active');
    document.getElementById('coach-login-error').classList.add('hidden');
    document.getElementById('coach-team-code').value = '';
    document.getElementById('coach-pin-input').value = '';
  },

  renderCreateTeam() {
    document.getElementById('screen-create-team').classList.add('active');
    document.getElementById('create-team-error').classList.add('hidden');
    document.getElementById('create-team-name').value = '';
    document.getElementById('create-team-pin').value = '';
  },

  async renderCoachManage(data) {
    document.getElementById('screen-coach-manage').classList.add('active');
    const team = data?.team;
    if (!team) return;

    this._coachTeam = team;
    document.getElementById('coach-manage-title').textContent = team.name;
    document.getElementById('coach-team-code-display').textContent = team.team_code;
    document.getElementById('add-player-error').classList.add('hidden');

    await this.refreshCoachRoster();
  },

  async refreshCoachRoster() {
    const team = this._coachTeam;
    if (!team) return;

    const sb = getSupabase();
    const { data: players } = await sb
      .from('diq_players').select('*').eq('team_id', team.id).eq('is_active', true).order('name');

    const roster = document.getElementById('coach-roster');
    if (!players || players.length === 0) {
      roster.innerHTML = '<div class="text-muted" style="padding: var(--space-sm);">No players yet. Add some!</div>';
      return;
    }

    roster.innerHTML = players.map(p => `
      <div class="roster-item">
        <span class="name">${p.avatar_emoji || '⚾'} ${p.name}</span>
        <button class="remove-btn" onclick="removePlayerFromTeam('${p.id}')">Remove</button>
      </div>
    `).join('');
  },

  async renderPlayerSelect() {
    const screen = document.getElementById('screen-player-select');
    screen.classList.add('active');
    const list = document.getElementById('player-list');
    list.innerHTML = '<div class="text-center text-muted">Loading players...</div>';

    const teamId = this.session.teamId;
    document.getElementById('player-select-team').textContent = this.session.teamName || '';

    const sb = getSupabase();
    let query = sb.from('diq_players').select('*').eq('is_active', true).order('name');
    if (teamId) query = query.eq('team_id', teamId);

    const { data: players, error } = await query;

    if (error || !players || players.length === 0) {
      list.innerHTML = '<div class="text-center text-muted">No players found. Ask your coach!</div>';
      return;
    }

    list.innerHTML = '';
    players.forEach(p => {
      const card = document.createElement('div');
      card.className = 'player-card';
      card.innerHTML = `
        <span class="emoji">${p.avatar_emoji || '⚾'}</span>
        <div>
          <div class="name">${p.name}</div>
          <div class="position">${POSITION_NAMES[p.primary_position] || 'All Positions'}</div>
        </div>`;
      card.addEventListener('click', () => {
        // Check if this player has a secret word set
        if (p.secret_word) {
          // Existing player — verify secret word
          this.transition('SECRET_WORD', { player: p });
        } else {
          // New player — set a secret word
          this.transition('SECRET_WORD', { player: p });
        }
      });
      list.appendChild(card);
    });
  },

  renderPositionSelect() {
    document.getElementById('screen-position-select').classList.add('active');
  },

  // Start a full 9-inning game — different position each inning
  selectPosition(position) {
    // Build position rotation: 9 of the 10 positions, shuffled
    const allPositions = Object.keys(DEFAULT_POSITIONS);
    const shuffled = allPositions.sort(() => Math.random() - 0.5);
    const rotation = shuffled.slice(0, 9); // 9 positions for 9 innings

    // If they picked a specific position, make sure it's first
    if (position !== 'ALL' && rotation.includes(position)) {
      const idx = rotation.indexOf(position);
      rotation.splice(idx, 1);
      rotation.unshift(position);
    } else if (position === 'ALL') {
      // Already shuffled, good to go
    }

    this.session.positionRotation = rotation;
    this.session.inningNumber = 1;
    this.session.position = rotation[0];

    // Game-wide stats
    this.session.gamePoints = 0;
    this.session.gameCorrect = 0;
    this.session.gameAnswered = 0;
    this.session.gameBestStreak = 0;
    this.session.gameRunsAllowed = 0;
    this.session.inningResults = [];
    this.session.speedLevel = currentSpeed === SPEED_LEVELS.allstar ? 'allstar' : 'rookie';

    // Start the first inning
    this.startInning();
  },

  // Start a single inning (resets inning state, keeps game state)
  startInning() {
    this.session.outs = 0;
    this.session.runners = [];
    this.session.runsScored = 0;
    this.session.playsCompleted = 0;
    this.session.streak = 0;
    this.session.bestStreak = 0;
    this.session.totalPoints = 0;
    this.session.correctCount = 0;
    this.session.totalAnswered = 0;
    this.session.scenarios = [];
    this.session.playHistory = [];
    this.session.recentHitZones = [];
    this.session.sessionId = crypto.randomUUID();
    this.session.position = this.session.positionRotation[this.session.inningNumber - 1];
    this.transition('LOADING');
  },

  async renderLoading() {
    document.getElementById('screen-loading').classList.add('active');

    if (this.session.scenarios.length === 0) {
      this.session.scenarios = await loadScenarios();
    }

    // Guarantee at least one ball hit to the player per inning
    const hadBallHitToMe = (this.session.playHistory || []).some(p =>
      p.wasFielder
    );
    const forceFielder = !hadBallHitToMe && this.session.playsCompleted >= 2;

    // Find a scenario matching current runner state
    const scenario = pickScenarioForInning(
      this.session.scenarios, this.session.runners,
      this.session.position, this.session.recentHitZones || [],
      forceFielder
    );

    if (!scenario) {
      alert('No scenarios available!');
      this.transition('HOME');
      return;
    }

    this.session.currentScenario = scenario;
    this.session.currentAction = getPlayerAction(scenario, this.session.position);
    this.session.playsCompleted++;

    // Track recent hit zones to avoid repeats
    if (!this.session.recentHitZones) this.session.recentHitZones = [];
    this.session.recentHitZones.push(scenario.ball_hit_zone);
    if (this.session.recentHitZones.length > 3) this.session.recentHitZones.shift();
    this.session.playerAnswered = false;

    this.transition('READY', { scenario, action: this.session.currentAction });
  },

  renderReady(data) {
    const { scenario, action } = data;
    const container = document.getElementById('game-screen');
    container.classList.add('active');

    this.updateHUD();

    // Hide timer and scenario banner during ready
    document.getElementById('scenario-banner').classList.add('hidden');
    document.getElementById('timer-bar-container').classList.add('hidden');

    // Draw the diamond so the player can SEE the field and runners
    const dc = document.getElementById('diamond-container');
    if (!document.getElementById('diamond-svg')) {
      dc.innerHTML = '';
      dc.appendChild(createDiamondSVG());
    }

    clearFeedback();
    clearBall();
    clearThrowTargets();
    clearTargetZones();
    drawPlayers(this.session.position);
    drawRunners(this.session.runners);

    const tapLayer = document.getElementById('tap-layer');
    if (tapLayer) tapLayer.style.display = 'none';

    // Build the ready card content (compact, sits OVER the visible field)
    const runners = this.session.runners;
    let runnersHTML = '';
    if (runners.length === 0) {
      runnersHTML = '<span class="ready-bases-empty">Bases Empty</span>';
    } else {
      const baseNames = runners.map(r => r === '1B' ? '1st' : r === '2B' ? '2nd' : r === '3B' ? '3rd' : r);
      runnersHTML = baseNames.map(b => `<span class="ready-base-tag">${b}</span>`).join(' ');
    }

    const desc = describeScenario(scenario);

    // Set position in the HUD (so it's always correct)
    document.getElementById('you-are').textContent = `YOU ARE: ${POSITION_NAMES[this.session.position]}`;

    const readyCard = document.getElementById('ready-overlay');
    const isAllStar = this.session.speedLevel === 'allstar';

    if (isAllStar) {
      // All-Star: minimal — just a pitch button, they know the drill
      readyCard.innerHTML = `
        <div class="ready-card-compact ready-allstar">
          <button id="btn-pitch" class="btn btn-primary ready-pitch-btn">⚾ PITCH!</button>
        </div>
      `;
    } else {
      // Rookie: full situation awareness card
      readyCard.innerHTML = `
        <div class="ready-card-compact">
          <div class="ready-top-row">
            <div class="ready-outs-badge">${this.session.outs} OUT${this.session.outs !== 1 ? 'S' : ''}</div>
            <div class="ready-runners-row">${runnersHTML}</div>
            <div class="ready-hit-info">${desc.hitTo}</div>
          </div>
          <button id="btn-pitch" class="btn btn-primary ready-pitch-btn">⚾ PITCH!</button>
        </div>
      `;
    }
    readyCard.classList.add('active');

    document.getElementById('btn-pitch').onclick = () => {
      // Initialize audio on first user interaction (browser policy)
      if (typeof getAudioCtx === 'function') getAudioCtx();
      readyCard.classList.remove('active');
      readyCard.innerHTML = '';
      this.transition('PLAYING', { scenario, action });
    };
  },

  renderPlaying(data) {
    const { scenario, action } = data;
    const container = document.getElementById('game-screen');
    container.classList.add('active');

    document.getElementById('scenario-banner').classList.remove('hidden');
    document.getElementById('timer-bar-container').classList.remove('hidden');

    this.updateHUD();

    const desc = describeScenario(scenario);
    document.getElementById('scenario-title').textContent = desc.hitTo;
    document.getElementById('scenario-runners').textContent = desc.runners;
    document.getElementById('you-are').textContent = `YOU ARE: ${POSITION_NAMES[this.session.position]}`;
    document.getElementById('scenario-instruction').textContent = 'Watch the play...';

    const dc = document.getElementById('diamond-container');
    if (!document.getElementById('diamond-svg')) {
      dc.innerHTML = '';
      dc.appendChild(createDiamondSVG());
    }

    clearFeedback();
    clearBall();
    clearThrowTargets();
    clearTargetZones();
    drawPlayers(this.session.position);
    drawRunners(this.session.runners);

    const tapLayer = document.getElementById('tap-layer');
    if (tapLayer) tapLayer.style.display = 'none';

    // Play state flags
    this.session.playerAnswered = false;
    this.session.playerResult = null;
    this.session.playResolved = false;
    this.session.ballArrived = false;
    this.session.throwComplete = false;

    // Is this an outfield hit? (base hit, no outs on outfield grounders/liners)
    const outfieldPositions = ['LF', 'LCF', 'RCF', 'RF'];
    this.session.isOutfieldHit = outfieldPositions.includes(scenario.ball_hit_zone);

    // === THE PLAY SEQUENCE ===

    // 1. Ball hit — animate ball
    const ballPromise = animateBall(scenario.ball_hit_zone);

    // Batter and runners start after a short delay (reaction time — drop the bat, start sprinting)
    const batterDelay = 600;
    setTimeout(() => {
      addBatterRunner();
      animateRunners(this.session.runners);
    }, batterDelay);

    // 2. Show targets and enable input after 600ms
    setTimeout(() => {
      if (this.session.playResolved) return;
      if (action.action_type === 'field_and_throw') {
        document.getElementById('scenario-instruction').textContent = "You've got the ball! Who do you throw to?";
        moveAIPlayers(scenario.actions, this.session.position);
        highlightThrowTargets(scenario.actions, this.session.position);
        this.enableThrowInput();
      } else {
        document.getElementById('scenario-instruction').textContent = 'Where should you go? Tap a target!';
        showTargetZones(action, scenario.actions);
        this.enableZoneTapInput();
      }
      this.startTimer();
    }, 600);

    // 3. After ball arrives at fielder, AI throws to base
    ballPromise.then(() => {
      this.session.ballArrived = true;
      const fielderAction = scenario.actions.find(a => a.action_type === 'field_and_throw');

      if (fielderAction) {
        // Move AI players to positions
        moveAIPlayers(scenario.actions, this.session.position);

        const throwTarget = fielderAction.throw_to_position;
        if (throwTarget && !this.session.isOutfieldHit) {
          // Infield play: throw to base, race the runner
          setTimeout(() => {
            animateThrow(fielderAction.position_code, throwTarget).then(() => {
              this.session.throwComplete = true;
              this.onPlayComplete();
            });
          }, 300);
        } else {
          // Outfield hit: no throw to a base for an out
          // Fielder holds or throws to cutoff (visual only)
          setTimeout(() => {
            this.session.throwComplete = true;
            this.onPlayComplete();
          }, 1000);
        }
      } else {
        this.session.throwComplete = true;
        this.onPlayComplete();
      }
    });
  },

  // Called when the throw is complete — resolve the play if player has answered
  onPlayComplete() {
    if (this.session.playResolved) return;

    if (this.session.playerAnswered) {
      // Player already answered — resolve now
      this.finalizePlay();
    }
    // If player hasn't answered yet, we wait — timer will catch them
  },

  // Called when player answers — if play is done, resolve. Otherwise wait.
  onPlayerAnswered(isCorrect, timeMs, details) {
    this.session.playerAnswered = true;
    this.session.playerResult = { isCorrect, timeMs, details };

    // Show immediate visual feedback on the field
    if (details.targetX != null && details.targetY != null) {
      if (!isCorrect && details.tapX != null) {
        showZoneHighlight(details.tapX, details.tapY, false);
      }
      showZoneHighlight(details.targetX, details.targetY, true);
      if (!isCorrect && details.tapX != null) {
        showCorrectionArrow(details.tapX, details.tapY, details.targetX, details.targetY);
      }
    }

    // Update instruction to show result
    const instrEl = document.getElementById('scenario-instruction');
    instrEl.textContent = isCorrect ? '✅ Great positioning!' : '❌ Wrong spot!';

    if (this.session.throwComplete || this.session.isOutfieldHit) {
      // Play already finished, or outfield hit (no need to wait for throw)
      this.finalizePlay();
    }
    // Otherwise, wait for infield throw to complete visually
  },

  // Final resolution — both player answered and play animated
  finalizePlay() {
    if (this.session.playResolved) return;
    this.session.playResolved = true;
    this.stopTimer();

    // Determine if this play results in an out for the on-field visual
    const action = this.session.currentAction;
    const fielderAction = this.session.currentScenario?.actions?.find(a => a.action_type === 'field_and_throw');
    const throwTo = fielderAction?.throw_to_position;
    const isCritical = (action?.action_type === 'field_and_throw' || this.session.position === throwTo);
    const isOutfieldHit = this.session.isOutfieldHit;
    const playerCorrect = this.session.playerResult?.isCorrect;

    let isOut;
    if (isOutfieldHit) {
      isOut = false; // base hit
    } else if (isCritical) {
      isOut = playerCorrect; // player determines the out
    } else {
      isOut = true; // AI handles the out
    }

    // Show OUT/SAFE/BASE HIT on the field, then resolve after a pause
    showFieldResult(isOut, isOutfieldHit);

    setTimeout(() => {
      this._doResolve();
    }, 1200);
  },

  _doResolve() {
    const { isCorrect, timeMs, details } = this.session.playerResult || {
      isCorrect: false,
      timeMs: SCORING.TIMER_MS,
      details: {
        explanation: this.session.currentAction?.explanation || "Time's up!",
        targetLabel: this.session.currentAction?.target_label || '',
        targetX: this.session.currentAction?.target_x,
        targetY: this.session.currentAction?.target_y
      }
    };

    this.resolvePlay(isCorrect, timeMs, details);
  },

  // Enable tapping on target zone X marks
  enableZoneTapInput() {
    const zones = document.querySelectorAll('.target-zone-marker');
    zones.forEach(zone => {
      const handler = (e) => {
        e.stopPropagation();
        e.preventDefault();
        if (this.session.playerAnswered) return;
        this.session.playerAnswered = true;

        // Remove handlers from all zones
        zones.forEach(z => {
          const clone = z.cloneNode(true);
          z.parentNode.replaceChild(clone, z);
        });

        const zoneX = parseFloat(zone.dataset.zoneX);
        const zoneY = parseFloat(zone.dataset.zoneY);
        this.handleMoveAnswer(zoneX, zoneY);
      };
      zone.addEventListener('click', handler);
      zone.addEventListener('touchend', (e) => { e.preventDefault(); handler(e); });
      zone.style.cursor = 'pointer';
    });
  },

  enableThrowInput() {
    document.querySelectorAll('.player-dot.throwable').forEach(dot => {
      const handler = (e) => {
        e.stopPropagation();
        e.preventDefault();
        if (this.session.playerAnswered) return;
        this.session.playerAnswered = true;

        document.querySelectorAll('.player-dot.throwable').forEach(d => {
          d.replaceWith(d.cloneNode(true));
        });
        clearThrowTargets();
        this.handleThrowAnswer(dot.dataset.position);
      };
      dot.addEventListener('click', handler);
      dot.addEventListener('touchend', (e) => { e.preventDefault(); handler(e); });
    });
  },

  handleMoveAnswer(tapX, tapY) {
    this.stopTimer();
    const timeMs = Date.now() - this.session.timerStart;
    const action = this.session.currentAction;
    const result = evaluateMove(tapX, tapY, action);

    this.onPlayerAnswered(result.correct, timeMs, {
      explanation: result.explanation,
      targetLabel: result.targetLabel,
      tapX, tapY,
      targetX: result.targetX,
      targetY: result.targetY
    });
  },

  handleThrowAnswer(selectedPosition) {
    this.stopTimer();
    const timeMs = Date.now() - this.session.timerStart;
    const action = this.session.currentAction;
    const result = evaluateThrow(selectedPosition, action);

    this.onPlayerAnswered(result.correct, timeMs, {
      explanation: result.explanation,
      targetLabel: result.throwToLabel
    });
  },

  // Resolve the play — determine the inning outcome
  resolvePlay(isCorrect, timeMs, details) {
    // Update streak and score
    if (isCorrect) {
      this.session.streak++;
      this.session.bestStreak = Math.max(this.session.bestStreak, this.session.streak);
      this.session.correctCount++;
    } else {
      this.session.streak = 0;
    }
    this.session.totalAnswered++;

    const score = calculateScore(isCorrect, timeMs, this.session.streak);
    this.session.totalPoints += score.total;

    // === INNING OUTCOME ===
    const scenario = this.session.currentScenario;
    const oldRunners = [...this.session.runners];
    const action = this.session.currentAction;
    let outcomeText = '';

    // Determine if the player is CRITICAL to the out
    // Critical = fielder (field_and_throw) OR the throw target
    const fielderAction = scenario.actions.find(a => a.action_type === 'field_and_throw');
    const throwTo = fielderAction?.throw_to_position;
    const isCriticalToOut = (
      action.action_type === 'field_and_throw' ||  // Player IS the fielder
      this.session.position === throwTo              // Player IS the throw target
    );

    // Outfield hits are always base hits (no fly outs yet)
    const isOutfieldHit = this.session.isOutfieldHit;

    if (isOutfieldHit) {
      // Base hit — runners advance, batter reaches base. No out.
      const result = this.advanceRunnersOnSafe(oldRunners);
      this.session.runners = result.runners;
      this.session.runsScored += result.runsScored;

      if (isCorrect) {
        outcomeText = `Base hit! Great positioning!${result.runsScored > 0 ? ` ${result.runsScored} run${result.runsScored > 1 ? 's' : ''} scored.` : ''}`;
      } else {
        outcomeText = `Base hit — and you were out of position!${result.runsScored > 0 ? ` ${result.runsScored} run${result.runsScored > 1 ? 's' : ''} scored.` : ''}`;
      }
    } else if (isCriticalToOut) {
      // Infield play — player's answer determines the out
      if (isCorrect) {
        this.session.outs++;
        const newRunners = this.advanceRunnersOnOut(oldRunners, scenario);
        this.session.runners = newRunners;
        outcomeText = `OUT! (${this.session.outs}/3)`;
        if (this.session.outs >= 3) outcomeText = "That's 3 outs! Inning over!";
      } else {
        const result = this.advanceRunnersOnSafe(oldRunners);
        this.session.runners = result.runners;
        this.session.runsScored += result.runsScored;
        outcomeText = `Runner SAFE!${result.runsScored > 0 ? ` ${result.runsScored} run${result.runsScored > 1 ? 's' : ''} scored!` : ''}`;
      }
    } else {
      // Infield play, player not critical — out happens via AI
      this.session.outs++;
      const newRunners = this.advanceRunnersOnOut(oldRunners, scenario);
      this.session.runners = newRunners;

      if (isCorrect) {
        outcomeText = `OUT! Great positioning! (${this.session.outs}/3)`;
        if (this.session.outs >= 3) outcomeText = "That's 3 outs! Great positioning all inning!";
      } else {
        outcomeText = `OUT! But you were in the wrong spot.`;
        if (this.session.outs >= 3) outcomeText = "3 outs — but work on your positioning!";
      }
    }

    // Show feedback on field
    if (details.targetX != null && details.targetY != null) {
      if (!isCorrect && details.tapX != null) {
        showZoneHighlight(details.tapX, details.tapY, false);
        showCorrectionArrow(details.tapX, details.tapY, details.targetX, details.targetY);
      }
      showZoneHighlight(details.targetX, details.targetY, true);
    }

    if (isCorrect) {
      fireConfetti();
      if (this.session.streak >= 5) fireStarBurst();
      if (this.session.streak >= 7) screenShake();
    }

    this.saveScore(isCorrect, score.total, timeMs);

    // Track play history for inning summary
    if (!this.session.playHistory) this.session.playHistory = [];
    this.session.playHistory.push({
      scenario: describeScenario(scenario).hitTo,
      position: POSITION_NAMES[this.session.position],
      correct: isCorrect,
      explanation: details.explanation || '',
      targetLabel: details.targetLabel || action.target_label || '',
      isCritical: isCriticalToOut,
      wasFielder: action.action_type === 'field_and_throw'
    });

    // Update HUD to show current outs before transitioning
    this.updateHUD();

    this.transition('FEEDBACK', {
      isCorrect,
      score,
      timeMs,
      explanation: details.explanation,
      targetLabel: details.targetLabel,
      streak: this.session.streak,
      streakMessage: getStreakMessage(this.session.streak),
      outcomeText,
      inningOver: this.session.outs >= 3
    });
  },

  // When the defense makes the out: remove the forced runner, others may advance
  advanceRunnersOnOut(runners, scenario) {
    const fielderAction = scenario.actions.find(a => a.action_type === 'field_and_throw');
    const throwTo = fielderAction?.throw_to_position;

    if (throwTo === 'home' || throwTo === 'C') {
      // Force out at home — runner from 3rd is out
      const result = [];
      if (runners.includes('2B')) result.push('3B');
      if (runners.includes('1B')) result.push('2B');
      result.push('1B'); // batter reaches 1st
      return this.dedupeRunners(result);
    }

    if (throwTo === '1B' || throwTo === 'P') {
      // Batter is out at 1st. Existing runners stay.
      return [...runners];
    }

    if (throwTo === '2B' || throwTo === 'SS') {
      // Force out at 2nd — runner from 1st is out
      // Batter reaches 1st. Other runners advance if forced.
      const result = [];
      const had1B = runners.includes('1B');
      const had2B = runners.includes('2B');
      const had3B = runners.includes('3B');

      // Runner from 1B → OUT (force at 2nd)
      // Runner from 2B → advances to 3B (only if was forced, i.e. 1B was occupied)
      if (had2B) result.push('3B');
      // Runner from 3B → holds or scores if forced
      if (had3B && had2B && had1B) {
        // Bases loaded, forced — runner scores
        this.session.runsScored++;
      } else if (had3B) {
        result.push('3B');
      }
      // Batter reaches 1st
      result.push('1B');
      return this.dedupeRunners(result);
    }

    if (throwTo === '3B') {
      // Force out at 3rd — runner from 2nd is out
      const result = [];
      const had1B = runners.includes('1B');
      const had3B = runners.includes('3B');

      // Runner from 2B → OUT (force at 3rd)
      // Runner from 1B → advances to 2nd
      if (had1B) result.push('2B');
      // Runner from 3B → holds (or scores if was forced — only if bases loaded)
      if (had3B) result.push('3B');
      // Batter reaches 1st
      result.push('1B');
      return this.dedupeRunners(result);
    }

    // Default: batter is out, runners stay
    return [...runners];
  },

  // When defense fails: all runners advance one base, batter reaches 1st
  advanceRunnersOnSafe(runners) {
    let runsScored = 0;
    const newRunners = [];

    // Advance all existing runners one base (process from lead runner back)
    // Sort so 3B processes first, then 2B, then 1B
    const sorted = [...runners].sort((a, b) => {
      const order = { '3B': 0, '2B': 1, '1B': 2 };
      return (order[a] ?? 9) - (order[b] ?? 9);
    });

    sorted.forEach(r => {
      const next = NEXT_BASE[r];
      if (next === 'HOME') {
        runsScored++;
      } else if (next) {
        newRunners.push(next);
      }
    });

    // Batter reaches 1st
    newRunners.push('1B');

    return { runners: this.dedupeRunners(newRunners), runsScored };
  },

  // Prevent two runners on the same base
  dedupeRunners(runners) {
    const seen = new Set();
    const result = [];
    // Process from lead runner back (3B, 2B, 1B)
    const order = { '3B': 0, '2B': 1, '1B': 2 };
    const sorted = [...runners].sort((a, b) => (order[a] ?? 9) - (order[b] ?? 9));
    sorted.forEach(r => {
      if (!seen.has(r)) {
        seen.add(r);
        result.push(r);
      }
      // If base occupied, push runner to next available base
      // (in real baseball this wouldn't happen, but for safety)
    });
    return result;
  },

  renderFeedback(data) {
    const overlay = document.getElementById('feedback-overlay');
    overlay.classList.add('active');

    document.getElementById('feedback-icon').textContent = data.isCorrect ? '✅' : '❌';
    const textEl = document.getElementById('feedback-text');
    textEl.textContent = data.isCorrect ? getRandomMessage(true) : getRandomMessage(false);
    textEl.className = `feedback-text ${data.isCorrect ? 'correct' : 'wrong'}`;

    document.getElementById('feedback-explanation').textContent = data.explanation || '';

    // Show outcome
    const outcomeEl = document.getElementById('feedback-outcome');
    if (outcomeEl) {
      outcomeEl.textContent = data.outcomeText || '';
      outcomeEl.className = `feedback-outcome ${data.isCorrect ? 'out-recorded' : 'runner-safe'}`;
      outcomeEl.classList.remove('hidden');
    }

    if (data.isCorrect && data.score.total > 0) {
      document.getElementById('feedback-points').textContent = `+${data.score.total}`;
      document.getElementById('feedback-points').classList.remove('hidden');
    } else {
      document.getElementById('feedback-points').classList.add('hidden');
    }

    const streakEl = document.getElementById('feedback-streak');
    if (data.streakMessage) {
      streakEl.textContent = data.streakMessage;
      streakEl.classList.remove('hidden');
    } else {
      streakEl.classList.add('hidden');
    }

    const nextBtn = document.getElementById('btn-next');
    nextBtn.textContent = data.inningOver ? 'See Results' : 'OK';
    nextBtn.onclick = () => {
      overlay.classList.remove('active');
      if (data.inningOver) {
        this.transition('SUMMARY');
      } else {
        this.transition('LOADING');
      }
    };

    // No auto-advance — let the kid read the explanation and tap OK
  },

  renderSummary() {
    const container = document.getElementById('summary-screen');
    container.classList.add('active');

    // Update HUD to show 3 outs
    this.updateHUD();

    // Save inning result to game history
    this.session.inningResults.push({
      inning: this.session.inningNumber,
      position: this.session.position,
      points: this.session.totalPoints,
      correct: this.session.correctCount,
      total: this.session.totalAnswered,
      runsAllowed: this.session.runsScored,
      plays: this.session.playsCompleted
    });

    // Accumulate game-wide stats
    this.session.gamePoints += this.session.totalPoints;
    this.session.gameCorrect += this.session.correctCount;
    this.session.gameAnswered += this.session.totalAnswered;
    this.session.gameRunsAllowed += this.session.runsScored;
    this.session.gameBestStreak = Math.max(this.session.gameBestStreak, this.session.bestStreak);

    const isGameOver = this.session.inningNumber >= 9;
    const accuracy = this.session.totalAnswered > 0 ? this.session.correctCount / this.session.totalAnswered : 0;

    let stars = '⭐';
    if (accuracy >= 0.4) stars = '⭐⭐';
    if (accuracy >= 0.6) stars = '⭐⭐⭐';
    if (accuracy >= 0.8) stars = '⭐⭐⭐⭐';
    if (accuracy >= 1.0) stars = '⭐⭐⭐⭐⭐';

    // Inning header
    document.getElementById('summary-header').textContent =
      isGameOver ? 'Game Over!' : `Inning ${this.session.inningNumber} Complete!`;
    document.getElementById('summary-score').textContent = this.session.totalPoints.toLocaleString();
    document.getElementById('summary-stars').textContent = stars;
    document.getElementById('summary-correct').textContent =
      `${this.session.correctCount} / ${this.session.totalAnswered} correct as ${POSITION_NAMES[this.session.position]}`;
    document.getElementById('summary-streak').textContent =
      `Best streak: ${this.session.bestStreak}`;

    // Play-by-play review
    const history = this.session.playHistory || [];
    const statsEl = document.getElementById('summary-inning-stats');
    let html = `
      <div class="summary-headline">
        <span>${this.session.playsCompleted} plays</span>
        <span class="summary-runs">${this.session.runsScored} run${this.session.runsScored !== 1 ? 's' : ''} allowed</span>
      </div>
    `;

    if (history.length > 0) {
      html += '<div class="summary-review-title">Play-by-Play</div>';
      html += '<div class="summary-plays">';
      history.forEach((play, i) => {
        html += `
          <div class="summary-play ${play.correct ? 'play-correct' : 'play-wrong'}">
            <div class="play-header">
              <span class="play-number">#${i + 1}</span>
              <span class="play-icon">${play.correct ? '✅' : '❌'}</span>
              <span class="play-scenario">${play.scenario}</span>
            </div>
            ${!play.correct ? `<div class="play-lesson">${play.explanation}</div>` : ''}
          </div>`;
      });
      html += '</div>';
    }

    // If game over, save the completed game and show scoreboard
    if (isGameOver) {
      this.saveCompletedGame();
      html += this.buildGameScoreboard();
    } else {
      // Show upcoming position for next inning
      const nextPos = this.session.positionRotation[this.session.inningNumber]; // 0-indexed, inningNumber is current (1-based)
      html += `<div class="next-inning-preview">
        Next: Inning ${this.session.inningNumber + 1} — You'll play <strong>${POSITION_NAMES[nextPos]}</strong>
      </div>`;
    }

    statsEl.innerHTML = html;

    // Buttons
    const btnContainer = document.getElementById('summary-buttons');
    if (isGameOver) {
      btnContainer.innerHTML = `
        <button class="btn btn-primary btn-large" onclick="Game.transition('POSITION_SELECT')">Play Again!</button>
        <button class="btn btn-secondary" onclick="Game.goHome()">Home</button>
      `;
    } else {
      btnContainer.innerHTML = `
        <button class="btn btn-primary btn-large" onclick="Game.nextInning()">Next Inning!</button>
        <button class="btn btn-secondary" onclick="Game.goHome()">Quit Game</button>
      `;
    }
  },

  buildGameScoreboard() {
    const results = this.session.inningResults;
    let html = '<div class="summary-review-title" style="margin-top: var(--space-lg);">Full Game Scoreboard</div>';
    html += '<div class="game-scoreboard">';
    html += '<div class="scoreboard-header"><span>Inn</span><span>Position</span><span>Pts</span><span>Runs</span></div>';
    results.forEach(r => {
      const pct = r.total > 0 ? Math.round((r.correct / r.total) * 100) : 0;
      html += `<div class="scoreboard-row">
        <span class="sb-inning">${r.inning}</span>
        <span class="sb-pos">${POSITION_NAMES[r.position]}</span>
        <span class="sb-pts">${r.points}</span>
        <span class="sb-runs ${r.runsAllowed > 0 ? 'runs-bad' : 'runs-good'}">${r.runsAllowed}</span>
      </div>`;
    });
    // Totals row
    html += `<div class="scoreboard-row scoreboard-total">
      <span class="sb-inning">TOT</span>
      <span class="sb-pos">9 Positions</span>
      <span class="sb-pts">${this.session.gamePoints}</span>
      <span class="sb-runs">${this.session.gameRunsAllowed}</span>
    </div>`;
    html += '</div>';
    return html;
  },

  nextInning() {
    this.session.inningNumber++;
    this.startInning();
  },

  updateHUD() {
    // Show game total points, not just inning points
    const gameTotal = (this.session.gamePoints || 0) + this.session.totalPoints;
    document.getElementById('hud-score').textContent = gameTotal.toLocaleString();
    document.getElementById('hud-streak').textContent = this.session.streak > 0 ? `${this.session.streak}🔥` : '';
    document.getElementById('hud-round').textContent =
      `Inn ${this.session.inningNumber} | ${this.session.outs} Out${this.session.outs !== 1 ? 's' : ''}`;
  },

  startTimer() {
    this.session.timerStart = Date.now();
    const timerBar = document.getElementById('timer-bar');
    if (!timerBar) return;
    timerBar.style.width = '100%';
    timerBar.className = 'timer-bar';

    this.session.timerInterval = setInterval(() => {
      const elapsed = Date.now() - this.session.timerStart;
      const remaining = Math.max(0, 1 - elapsed / SCORING.TIMER_MS);
      timerBar.style.width = `${remaining * 100}%`;

      if (remaining < 0.2) timerBar.className = 'timer-bar danger';
      else if (remaining < 0.5) timerBar.className = 'timer-bar warning';

      if (remaining <= 0) {
        this.stopTimer();
        if (!this.session.playerAnswered) {
          this.onPlayerAnswered(false, SCORING.TIMER_MS, {
            explanation: this.session.currentAction?.explanation || "Time's up! Get to your spot faster!",
            targetLabel: this.session.currentAction?.target_label || '',
            targetX: this.session.currentAction?.target_x,
            targetY: this.session.currentAction?.target_y
          });
        }
      }
    }, 50);
  },

  stopTimer() {
    if (this.session.timerInterval) {
      clearInterval(this.session.timerInterval);
      this.session.timerInterval = null;
    }
  },

  async saveScore(isCorrect, points, timeMs) {
    if (!this.session.playerId) return;
    try {
      const sb = getSupabase();
      await sb.from('diq_scores').insert({
        player_id: this.session.playerId,
        scenario_id: this.session.currentScenario?.id,
        position_played: this.session.position,
        action_type: this.session.currentAction?.action_type || 'move_to',
        is_correct: isCorrect,
        points_earned: points,
        time_ms: timeMs,
        streak_at_time: this.session.streak,
        session_id: this.session.sessionId
      });
    } catch (e) {
      console.error('Failed to save score:', e);
    }
  },

  async saveCompletedGame() {
    if (!this.session.playerId) return;
    try {
      const sb = getSupabase();
      await sb.from('diq_games').insert({
        player_id: this.session.playerId,
        total_points: this.session.gamePoints,
        speed_level: this.session.speedLevel || 'rookie',
        correct_count: this.session.gameCorrect,
        total_answered: this.session.gameAnswered,
        runs_allowed: this.session.gameRunsAllowed,
        innings_played: 9,
        best_streak: this.session.gameBestStreak
      });
    } catch (e) {
      console.error('Failed to save game:', e);
    }
  },

  goHome() {
    this.stopTimer();
    this.transition('HOME');
  }
};
