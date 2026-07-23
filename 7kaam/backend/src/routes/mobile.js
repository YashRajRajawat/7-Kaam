const router = require('express').Router();
const prisma = require('../utils/prisma');

// GET /api/v1/mobile/workers/nearby
router.get('/workers/nearby', async (req, res) => {
  try {
    const { trade, city, limit = 10 } = req.query;
    const where = { status: 'ACTIVE' };
    if (trade) where.trade = trade;
    if (city) where.city = { contains: city, mode: 'insensitive' };

    const workers = await prisma.worker.findMany({
      where,
      take: Number(limit),
      orderBy: { finalScore: 'desc' },
      select: { id: true, fullName: true, trade: true, city: true, tier: true, finalScore: true, profilePhotoUrl: true },
    });
    res.json(workers);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/v1/mobile/workers/:id/public
router.get('/workers/:id/public', async (req, res) => {
  try {
    const worker = await prisma.worker.findUnique({
      where: { id: req.params.id },
      select: {
        id: true, fullName: true, trade: true, city: true, locality: true,
        tier: true, finalScore: true, profilePhotoUrl: true, aadhaarVerified: true,
        kaamCards: { where: { isRevoked: false }, take: 1, orderBy: { issuedAt: 'desc' }, select: { qrToken: true, expiresAt: true } },
      },
    });
    if (!worker) return res.status(404).json({ error: 'Worker not found' });
    res.json(worker);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/v1/mobile/customers/register
router.post('/customers/register', async (req, res) => {
  try {
    const { phoneNumber, fullName, city } = req.body;
    const customer = await prisma.customer.upsert({
      where: { phoneNumber },
      update: { fullName, city },
      create: { phoneNumber, fullName, city },
    });
    res.status(201).json(customer);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/v1/mobile/bookings
router.post('/bookings', async (req, res) => {
  try {
    const { customerId, workerId, trade, scheduledAt, address, notes } = req.body;
    const booking = await prisma.booking.create({
      data: { customerId, workerId, trade, scheduledAt: new Date(scheduledAt), address, notes },
    });
    res.status(201).json(booking);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/v1/mobile/bookings/:id
router.get('/bookings/:id', async (req, res) => {
  try {
    const booking = await prisma.booking.findUnique({
      where: { id: req.params.id },
      include: {
        worker: { select: { fullName: true, trade: true, phoneNumber: true } },
        customer: { select: { fullName: true, phoneNumber: true } },
      },
    });
    if (!booking) return res.status(404).json({ error: 'Booking not found' });
    res.json(booking);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
