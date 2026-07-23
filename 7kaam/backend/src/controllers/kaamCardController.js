const prisma = require('../utils/prisma');

// GET /api/v1/kaamcards
async function listKaamCards(req, res) {
  try {
    const cards = await prisma.kaamCard.findMany({
      include: { worker: { select: { fullName: true, trade: true, finalScore: true, tier: true } } },
      orderBy: { issuedAt: 'desc' },
    });
    res.json(cards);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// GET /api/v1/kaamcards/:workerId
async function getKaamCardByWorker(req, res) {
  try {
    const card = await prisma.kaamCard.findFirst({
      where: { workerId: req.params.workerId },
      orderBy: { issuedAt: 'desc' },
      include: { worker: true },
    });
    if (!card) return res.status(404).json({ error: 'No KaamCard found for this worker' });
    res.json(card);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// POST /api/v1/kaamcards/:id/revoke
async function revokeKaamCard(req, res) {
  try {
    const { reason } = req.body;
    if (!reason) return res.status(400).json({ error: 'Revocation reason is required' });

    const card = await prisma.kaamCard.update({
      where: { id: req.params.id },
      data: { isRevoked: true, revokedReason: reason },
    });
    res.json(card);
  } catch (err) {
    if (err.code === 'P2025') return res.status(404).json({ error: 'KaamCard not found' });
    res.status(500).json({ error: err.message });
  }
}

// GET /api/v1/verify/:qrToken  (PUBLIC — no auth)
async function verifyKaamCard(req, res) {
  try {
    const card = await prisma.kaamCard.findUnique({
      where: { qrToken: req.params.qrToken },
      include: { worker: { select: { fullName: true, trade: true, city: true, aadhaarVerified: true, profilePhotoUrl: true } } },
    });

    if (!card) return res.status(404).json({ error: 'KaamCard not found' });

    const now = new Date();
    const status = card.isRevoked
      ? 'REVOKED'
      : new Date(card.expiresAt) < now
      ? 'EXPIRED'
      : 'VALID';

    res.json({ ...card, verificationStatus: status, verifiedAt: now });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

module.exports = { listKaamCards, getKaamCardByWorker, revokeKaamCard, verifyKaamCard };
