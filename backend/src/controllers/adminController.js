const prisma = require('../utils/prisma');
const { internalComputeScore, internalIssueKaamCard } = require('./scoringController');

// POST /api/v1/admin/workers/:id/issue-kaamcard
async function issueKaamCardAdmin(req, res) {
  try {
    const { id } = req.params;
    const worker = await prisma.worker.findUnique({ where: { id } });
    if (!worker) return res.status(404).json({ error: 'Worker not found' });

    await internalComputeScore(id);
    const kaamCard = await internalIssueKaamCard(id);
    if (!kaamCard) {
      return res.status(400).json({ error: 'Worker has no assessments yet — cannot issue a KaamCard' });
    }

    await prisma.worker.update({
      where: { id },
      data: { underReview: false, recertificationTestIds: [], recertificationReason: null },
    });

    res.status(201).json(kaamCard);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// POST /api/v1/admin/workers/:id/assess-video
async function assessVideoScore(req, res) {
  try {
    const { videoScore } = req.body;
    if (videoScore === undefined || videoScore === null) {
      return res.status(400).json({ error: 'videoScore (0-100) is required' });
    }

    const workerId = req.params.id;
    const worker = await prisma.worker.findUnique({ where: { id: workerId } });
    if (!worker) return res.status(404).json({ error: 'Worker not found' });

    const vScore = Number(videoScore);
    const tScore = worker.testScore ?? vScore;
    const wScore = worker.workHistoryScore ?? vScore;
    const finalScore = Math.round(0.35 * vScore + 0.45 * tScore + 0.20 * wScore);
    const tier = finalScore >= 85 ? 'EXPERT' : finalScore >= 70 ? 'GOLD' : 'SILVER';

    await prisma.worker.update({
      where: { id: workerId },
      data: {
        videoScore: vScore,
        finalScore,
        tier,
      },
    });

    let card = await prisma.kaamCard.findFirst({ where: { workerId } });
    if (card) {
      await prisma.kaamCard.update({
        where: { id: card.id },
        data: {
          scoreBreakdown: {
            videoScore: vScore,
            testScore: tScore,
            workHistoryScore: wScore,
            finalScore,
            tier,
          },
        },
      });
    }

    res.json({ message: 'Video score assessed and KaamCard updated', videoScore: vScore, finalScore, tier });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// POST /api/v1/admin/workers/:id/suspend
async function suspendWorker(req, res) {
  try {
    const { reason } = req.body || {};
    const worker = await prisma.worker.update({
      where: { id: req.params.id },
      data: { status: 'SUSPENDED' },
    });
    res.json({ message: 'Worker suspended', reason: reason || null, worker });
  } catch (err) {
    if (err.code === 'P2025') return res.status(404).json({ error: 'Worker not found' });
    res.status(500).json({ error: err.message });
  }
}

// POST /api/v1/admin/workers/:id/reactivate
async function reactivateWorker(req, res) {
  try {
    const worker = await prisma.worker.update({
      where: { id: req.params.id },
      data: { status: 'ACTIVE' },
    });
    res.json({ message: 'Worker reactivated', worker });
  } catch (err) {
    if (err.code === 'P2025') return res.status(404).json({ error: 'Worker not found' });
    res.status(500).json({ error: err.message });
  }
}

// POST /api/v1/admin/workers/:id/require-recertification
async function requireRecertification(req, res) {
  try {
    const { testIds, reason } = req.body || {};
    if (!Array.isArray(testIds) || testIds.length === 0) {
      return res.status(400).json({ error: 'testIds (non-empty array) is required' });
    }
    const worker = await prisma.worker.update({
      where: { id: req.params.id },
      data: { underReview: true, recertificationTestIds: testIds, recertificationReason: reason || null },
    });
    res.json({ message: 'Worker flagged for recertification', worker });
  } catch (err) {
    if (err.code === 'P2025') return res.status(404).json({ error: 'Worker not found' });
    res.status(500).json({ error: err.message });
  }
}

// GET /api/v1/admin/workers/pending-review
async function pendingReviewQueue(req, res) {
  try {
    const activeCards = await prisma.kaamCard.findMany({
      where: { isRevoked: false },
    });
    const workerIdsWithCard = activeCards.map((c) => c.workerId);

    const submittedWorkers = await prisma.testSubmission.findMany({});
    const workerIdsWithTests = [...new Set(submittedWorkers.map((s) => s.workerId))];

    const eligibleIds = workerIdsWithTests.filter((id) => !workerIdsWithCard.includes(id));
    if (eligibleIds.length === 0) return res.json({ workers: [], total: 0 });

    const workers = await prisma.worker.findMany({
      where: { status: 'ACTIVE', id: { in: eligibleIds } },
      include: {
        kaamCards: { where: { isRevoked: false }, take: 1 },
        _count: { select: { testSubmissions: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json({ workers, total: workers.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

module.exports = {
  issueKaamCardAdmin,
  assessVideoScore,
  suspendWorker,
  reactivateWorker,
  requireRecertification,
  pendingReviewQueue,
};
