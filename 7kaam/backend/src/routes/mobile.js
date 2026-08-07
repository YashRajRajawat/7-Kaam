const router = require('express').Router();
const prisma = require('../utils/prisma');

// GET /api/v1/mobile/workers/nearby
router.get('/workers/nearby', async (req, res) => {
  try {
    const { trade, city, search, tier, limit = 20 } = req.query;
    const where = { status: { in: ['ACTIVE', 'PENDING'] } };
    if (trade && trade !== 'ALL') where.trade = trade.toUpperCase();
    if (tier && tier !== 'ANY') where.tier = tier.toUpperCase();
    if (city) where.city = { contains: city, mode: 'insensitive' };
    if (search) {
      where.OR = [
        { fullName: { contains: search, mode: 'insensitive' } },
        { locality: { contains: search, mode: 'insensitive' } },
      ];
    }

    const workers = await prisma.worker.findMany({
      where,
      take: Number(limit),
      orderBy: { finalScore: 'desc' },
      select: {
        id: true,
        fullName: true,
        phoneNumber: true,
        trade: true,
        city: true,
        locality: true,
        tier: true,
        finalScore: true,
        videoScore: true,
        testScore: true,
        workHistoryScore: true,
        profilePhotoUrl: true,
        aadhaarVerified: true,
        status: true,
        kaamCards: {
          where: { isRevoked: false },
          take: 1,
          orderBy: { issuedAt: 'desc' },
          select: { qrToken: true, pdfUrl: true, issuedAt: true, expiresAt: true },
        },
        workHistories: {
          select: { employerName: true, role: true, rating: true, isVerified: true },
        },
      },
    });

    const formattedWorkers = workers.map(w => {
      const activeCard = w.kaamCards && w.kaamCards.length > 0 ? w.kaamCards[0] : null;
      return {
        id: w.id,
        name: w.fullName,
        phone: w.phoneNumber,
        trade: w.trade,
        city: w.city,
        locality: w.locality || w.city,
        photoUrl: w.profilePhotoUrl || 'https://i.pravatar.cc/150?img=12',
        score: Math.round(w.finalScore || 80),
        tier: w.tier || 'GOLD',
        scoreBreakdown: {
          videoScore: Math.round(w.videoScore || 75),
          testScore: Math.round(w.testScore || 80),
          workHistoryScore: Math.round(w.workHistoryScore || 85),
        },
        hasKaamCard: activeCard !== null,
        kaamCardUrl: activeCard ? activeCard.pdfUrl : null,
        qrToken: activeCard ? activeCard.qrToken : '',
        aadhaarVerified: w.aadhaarVerified,
        status: w.status,
        workHistories: w.workHistories || [],
      };
    });

    res.json({ success: true, count: formattedWorkers.length, data: formattedWorkers });
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
        id: true,
        fullName: true,
        phoneNumber: true,
        trade: true,
        city: true,
        locality: true,
        tier: true,
        finalScore: true,
        videoScore: true,
        testScore: true,
        workHistoryScore: true,
        profilePhotoUrl: true,
        aadhaarVerified: true,
        status: true,
        kaamCards: {
          where: { isRevoked: false },
          take: 1,
          orderBy: { issuedAt: 'desc' },
          select: { qrToken: true, pdfUrl: true, issuedAt: true, expiresAt: true },
        },
        workHistories: {
          select: { employerName: true, role: true, rating: true, isVerified: true },
        },
      },
    });

    if (!worker) return res.status(404).json({ error: 'Worker not found' });

    const activeCard = worker.kaamCards && worker.kaamCards.length > 0 ? worker.kaamCards[0] : null;
    const formatted = {
      id: worker.id,
      name: worker.fullName,
      phone: worker.phoneNumber,
      trade: worker.trade,
      city: worker.city,
      locality: worker.locality || worker.city,
      photoUrl: worker.profilePhotoUrl || 'https://i.pravatar.cc/150?img=12',
      score: Math.round(worker.finalScore || 80),
      tier: worker.tier || 'GOLD',
      scoreBreakdown: {
        videoScore: Math.round(worker.videoScore || 75),
        testScore: Math.round(worker.testScore || 80),
        workHistoryScore: Math.round(worker.workHistoryScore || 85),
      },
      hasKaamCard: activeCard !== null,
      kaamCardUrl: activeCard ? activeCard.pdfUrl : null,
      qrToken: activeCard ? activeCard.qrToken : '',
      aadhaarVerified: worker.aadhaarVerified,
      status: worker.status,
      workHistories: worker.workHistories || [],
    };

    res.json({ success: true, data: formatted });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/v1/mobile/customers/register
router.post('/customers/register', async (req, res) => {
  try {
    const { name, fullName, phone, phoneNumber, city } = req.body;
    const targetName = name || fullName || 'Customer';
    const targetPhone = phone || phoneNumber;

    if (!targetPhone) {
      return res.status(400).json({ error: 'Phone number is required' });
    }

    const customer = await prisma.customer.upsert({
      where: { phoneNumber: targetPhone },
      update: { fullName: targetName, city: city || 'Bangalore' },
      create: { phoneNumber: targetPhone, fullName: targetName, city: city || 'Bangalore' },
    });

    const jwt = require('jsonwebtoken');
    const token = jwt.sign({ id: customer.id, role: 'CUSTOMER' }, process.env.JWT_SECRET || '7kaam_jwt_secret_2025', { expiresIn: '30d' });

    res.status(201).json({
      success: true,
      token,
      customer: {
        id: customer.id,
        name: customer.fullName,
        phone: customer.phoneNumber,
        city: customer.city,
      },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/v1/mobile/workers/register
router.post('/workers/register', async (req, res) => {
  try {
    const { name, fullName, phone, phoneNumber, trade, city, locality, aadhaarHash, profilePhotoUrl } = req.body;
    const targetName = name || fullName || 'Worker Name';
    const targetPhone = phone || phoneNumber;

    if (!targetPhone) {
      return res.status(400).json({ error: 'Phone number is required' });
    }

    const worker = await prisma.worker.upsert({
      where: { phoneNumber: targetPhone },
      update: {
        fullName: targetName,
        trade: trade ? trade.toUpperCase() : 'ELECTRICIAN',
        city: city || 'Bangalore',
        locality: locality || 'Koramangala',
        profilePhotoUrl,
      },
      create: {
        fullName: targetName,
        phoneNumber: targetPhone,
        trade: trade ? trade.toUpperCase() : 'ELECTRICIAN',
        city: city || 'Bangalore',
        locality: locality || 'Koramangala',
        aadhaarHash: aadhaarHash || `aadhaar_${Date.now()}`,
        profilePhotoUrl,
        status: 'ACTIVE',
        finalScore: 80,
        tier: 'GOLD',
      },
    });

    const jwt = require('jsonwebtoken');
    const token = jwt.sign({ id: worker.id, role: 'WORKER' }, process.env.JWT_SECRET || '7kaam_jwt_secret_2025', { expiresIn: '30d' });

    res.status(201).json({
      success: true,
      token,
      worker: {
        id: worker.id,
        name: worker.fullName,
        phone: worker.phoneNumber,
        trade: worker.trade,
        city: worker.city,
        locality: worker.locality,
        score: worker.finalScore || 80,
        tier: worker.tier || 'GOLD',
        isCertified: worker.status === 'ACTIVE',
      },
    });
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
