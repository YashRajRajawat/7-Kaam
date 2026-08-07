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
    const workers = await prisma.worker.findMany({
      where: { status: 'ACTIVE' },
      include: {
        kaamCards: { where: { isRevoked: false }, take: 1 },
        _count: { select: { testSubmissions: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    const pending = workers.filter(
      (w) => (w.kaamCards?.length ?? 0) === 0 && (w._count?.testSubmissions ?? 0) >= 1
    );

    res.json({ workers: pending, total: pending.length });
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
