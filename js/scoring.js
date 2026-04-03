// Diamond IQ - Scoring System

const SCORING = {
  BASE_POINTS: 100,
  MAX_SPEED_BONUS: 50,
  TIMER_MS: 15000,
  STREAK_BONUS_PCT: 0.10,  // 10% per streak
  MAX_STREAK_MULTIPLIER: 2.0,
  ROUNDS_PER_SUMMARY: 5,
};

function calculateScore(isCorrect, timeMs, streak) {
  if (!isCorrect) return { points: 0, speedBonus: 0, streakMultiplier: 1, total: 0 };

  // Speed bonus: faster = more points
  const speedRatio = Math.max(0, 1 - (timeMs / SCORING.TIMER_MS));
  const speedBonus = Math.round(SCORING.MAX_SPEED_BONUS * speedRatio);

  // Streak multiplier
  const streakMultiplier = Math.min(
    SCORING.MAX_STREAK_MULTIPLIER,
    1 + (streak * SCORING.STREAK_BONUS_PCT)
  );

  const total = Math.floor(SCORING.BASE_POINTS * streakMultiplier + speedBonus);

  return {
    points: SCORING.BASE_POINTS,
    speedBonus,
    streakMultiplier: Math.round(streakMultiplier * 100) / 100,
    total
  };
}

// Encouraging messages for wrong answers
const WRONG_MESSAGES = [
  "Almost! Here's where to go next time.",
  "Good try! Check out the right spot.",
  "So close! You'll get it next time!",
  "Nice effort! Let's learn this one.",
  "Keep going! Every play makes you better!",
  "That's a tough one! Now you know!",
];

const CORRECT_MESSAGES = [
  "Nailed it!",
  "Perfect play!",
  "You know your stuff!",
  "Great baseball IQ!",
  "That's the right move!",
  "Coach would be proud!",
  "All-star play!",
];

const STREAK_MESSAGES = {
  3: "Hot streak! 🔥",
  5: "ON FIRE! 💥",
  7: "UNSTOPPABLE! ⚡",
  10: "LEGENDARY! 🌟",
};

function getRandomMessage(isCorrect) {
  const msgs = isCorrect ? CORRECT_MESSAGES : WRONG_MESSAGES;
  return msgs[Math.floor(Math.random() * msgs.length)];
}

function getStreakMessage(streak) {
  // Find the highest threshold met
  let msg = '';
  Object.entries(STREAK_MESSAGES).forEach(([threshold, text]) => {
    if (streak >= parseInt(threshold)) msg = text;
  });
  return msg;
}
