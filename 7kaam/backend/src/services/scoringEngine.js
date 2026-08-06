/**
 * Scoring Engine — 3-Signal AI Pipeline
 */

/** Mock computer vision score: realistic 55–95 range */
function mockVideoScore() {
  return Math.floor(Math.random() * 40) + 55;
}

/**
 * Work History Score Formula (Part 5):
 * 1. Total experience years (max 40 pts):
 *    < 1 year = 10 pts, 1-3 years = 20 pts, 3-5 years = 30 pts, 5+ years = 40 pts
 * 2. Project scale bonus (max 30 pts):
 *    SMALL = +3 pts (max 5 counted), MEDIUM = +5 pts (max 4 counted), LARGE = +8 pts (max 3 counted)
 * 3. Variety bonus (max 15 pts):
 *    Count of unique clientTypes × 5 pts
 * 4. Verified bonus (max 15 pts):
 *    Verified entries × 5 pts (max 3 counted)
 * Total capped at 100.
 */
function computeWorkHistoryScore(workHistories) {
  if (!workHistories || workHistories.length === 0) return 0;

  // 1. Total experience duration in years
  let totalMonths = 0;
  for (const w of workHistories) {
    if (w.durationMonths) {
      totalMonths += w.durationMonths;
    } else {
      const start = new Date(w.startDate || w.createdAt || Date.now());
      const end = w.endDate ? new Date(w.endDate) : new Date();
      const months = Math.max(1, Math.round((end - start) / (1000 * 60 * 60 * 24 * 30.4375)));
      totalMonths += months;
    }
  }
  const totalYears = totalMonths / 12;
  let experiencePts = 0;
  if (totalYears > 0 && totalYears < 1) experiencePts = 10;
  else if (totalYears >= 1 && totalYears < 3) experiencePts = 20;
  else if (totalYears >= 3 && totalYears < 5) experiencePts = 30;
  else if (totalYears >= 5) experiencePts = 40;

  // 2. Project scale bonus
  let smallCount = 0, mediumCount = 0, largeCount = 0;
  for (const w of workHistories) {
    const scale = (w.projectScale || 'SMALL').toUpperCase();
    if (scale === 'SMALL') smallCount++;
    else if (scale === 'MEDIUM') mediumCount++;
    else if (scale === 'LARGE') largeCount++;
  }
  const smallPts = Math.min(smallCount, 5) * 3;
  const mediumPts = Math.min(mediumCount, 4) * 5;
  const largePts = Math.min(largeCount, 3) * 8;
  const scalePts = Math.min(30, smallPts + mediumPts + largePts);

  // 3. Variety bonus
  const clientTypes = new Set(workHistories.map(w => w.clientType || 'HOUSEHOLD'));
  const varietyPts = Math.min(15, clientTypes.size * 5);

  // 4. Verified bonus
  const verifiedCount = workHistories.filter(w => w.isVerified || w.verified).length;
  const verifiedPts = Math.min(15, verifiedCount * 5);

  const total = experiencePts + scalePts + varietyPts + verifiedPts;
  return Math.min(100, Math.round(total * 10) / 10);
}

/**
 * Weighted fusion: Video 35% | Test 45% | Work History 20%
 */
function computeFinalScore(videoScore, testScore, workHistoryScore) {
  const finalScore = videoScore * 0.35 + testScore * 0.45 + workHistoryScore * 0.2;
  return Math.round(finalScore * 10) / 10;
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
