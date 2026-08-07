const prisma = require('../utils/prisma');
const { internalComputeScore, internalIssueKaamCard } = require('./scoringController');

// POST /api/v1/admin/workers/:id/issue-kaamcard
async function issueKaamCardAdmin(req, res) {
  try {
    const { id } = req.params;
    const worker = await prisma.worker.findUnique({ where: { id } });
    if (!worker) return res.status(404).json({ error: 'Worker not found' });

    // Recompute from all current assessments before issuing, so the card
    // reflects the worker's latest scores.
    await internalComputeScore(id);
    const kaamCard = await internalIssueKaamCard(id);
    if (!kaamCard) {
      return res.status(400).json({ error: 'Worker has no assessments yet — cannot issue a KaamCard' });
    }

    // Clear the underReview flag once the card is issued — admin has completed
    // their review cycle.
    await prisma.worker.update({
      where: { id },
      data: { underReview: false, recertificationTestIds: [], recertificationReason: null },
    });

    res.status(201).json(kaamCard);
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

// GET /api/v1/admin/workers/pending-review — workers ready for a KaamCard decision:
// active, at least one test submission, no active KaamCard yet.
async function pendingReviewQueue(req, res) {
  try {
    // Step 1: find workerIds that already have an active KaamCard (in DB)
    const activeCards = await prisma.kaamCard.findMany({
      where: { isRevoked: false },
    });
    const workerIdsWithCard = activeCards.map((c) => c.workerId);

    // Step 2: find workerIds that have at least one test submission
    const submittedWorkers = await prisma.testSubmission.findMany({});
    const workerIdsWithTests = [...new Set(submittedWorkers.map((s) => s.workerId))];

    // Step 3: fetch ACTIVE workers who have tests but no card yet
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
  suspendWorker,
  reactivateWorker,
  requireRecertification,
  pendingReviewQueue,
};
