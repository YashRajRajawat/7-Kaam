/**
 * Scoring Engine — 3-Signal AI Pipeline
 */

/** Mock computer vision score: realistic 55–95 range */
function mockVideoScore() {
  return Math.floor(Math.random() * 40) + 55;
}

/**
 * Work History Score:
 *   base  = average(ratings) mapped from 1–5 → 0–100
 *   bonus = verified entries × 5 (capped at 15)
 */
function computeWorkHistoryScore(workHistories) {
  if (!workHistories || workHistories.length === 0) return 0;
  const avg = workHistories.reduce((sum, w) => sum + w.rating, 0) / workHistories.length;
  const base = ((avg - 1) / 4) * 100;
  const verifiedCount = workHistories.filter((w) => w.verified).length;
  const bonus = Math.min(verifiedCount * 5, 15);
  return Math.min(100, base + bonus);
}

/**
 * Weighted fusion: Video 35% | Test 45% | Work History 20%
 */
function computeFinalScore(videoScore, testScore, workHistoryScore) {
  return videoScore * 0.35 + testScore * 0.45 + workHistoryScore * 0.2;
}

/**
 * Tier classification
 */
function computeTier(finalScore) {
  if (finalScore >= 80) return 'EXPERT';
  if (finalScore >= 60) return 'GOLD';
  if (finalScore >= 40) return 'SILVER';
  return 'BRONZE';
}

module.exports = {
  mockVideoScore,
  computeWorkHistoryScore,
  computeFinalScore,
  computeTier,
};
