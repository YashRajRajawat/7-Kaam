const prisma = require('../utils/prisma');
const { hashAadhaar } = require('../utils/hash');
const { uploadBuffer } = require('../services/supabaseStorage');
const multer = require('multer');

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });
exports.upload = upload;

// POST /api/v1/workers
async function createWorker(req, res) {
  try {
    const { fullName, phoneNumber, trade, city, locality, aadhaar, aadhaarVerified } = req.body;

    const aadhaarHash = hashAadhaar(aadhaar || phoneNumber + '_placeholder');

    // Handle profile photo upload
    let profilePhotoUrl = null;
    if (req.file) {
      const path = `photos/${Date.now()}_${req.file.originalname}`;
      profilePhotoUrl = await uploadBuffer(req.file.buffer, path, req.file.mimetype);
    }

    const worker = await prisma.worker.create({
      data: {
        fullName,
        phoneNumber,
        trade,
        city,
        locality,
        aadhaarHash,
        aadhaarVerified: aadhaarVerified === 'true' || aadhaarVerified === true,
        profilePhotoUrl,
      },
    });

    res.status(201).json(worker);
  } catch (err) {
    if (err.code === 'P2002') {
      return res.status(409).json({ error: 'Phone number or Aadhaar already registered' });
    }
    console.error(err);
    res.status(500).json({ error: err.message });
  }
}

// GET /api/v1/workers
async function listWorkers(req, res) {
  try {
    const { trade, city, tier, status, search, page = 1, limit = 10 } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    const where = {};
    if (trade) where.trade = trade;
    if (city) where.city = { contains: city, mode: 'insensitive' };
    if (tier) where.tier = tier;
    if (status) where.status = status;
    if (search) {
      where.OR = [
        { fullName: { contains: search, mode: 'insensitive' } },
        { phoneNumber: { contains: search } },
      ];
    }

    const [workers, total] = await Promise.all([
      prisma.worker.findMany({
        where,
        skip,
        take: Number(limit),
        orderBy: { createdAt: 'desc' },
        include: { kaamCards: { take: 1, orderBy: { issuedAt: 'desc' } } },
      }),
      prisma.worker.count({ where }),
    ]);

    res.json({ data: workers, total, page: Number(page), limit: Number(limit) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// GET /api/v1/workers/:id
async function getWorker(req, res) {
  try {
    const worker = await prisma.worker.findUnique({
      where: { id: req.params.id },
      include: {
        workHistories: true,
        testSubmissions: { include: { test: true }, orderBy: { submittedAt: 'desc' } },
        kaamCards: { orderBy: { issuedAt: 'desc' } },
        scoringLogs: { orderBy: { scoredAt: 'desc' } },
      },
    });
    if (!worker) return res.status(404).json({ error: 'Worker not found' });
    res.json(worker);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// PATCH /api/v1/workers/:id
const ADMIN_ROLES = ['SUPER_ADMIN', 'CITY_ADMIN', 'REVIEWER'];

async function updateWorker(req, res) {
  try {
    const isAdmin = ADMIN_ROLES.includes(req.auth?.role);
    const allowed = isAdmin
      ? ['fullName', 'city', 'locality', 'profilePhotoUrl', 'status', 'aadhaarVerified']
      : ['fullName', 'city', 'locality', 'profilePhotoUrl'];
    const data = {};
    allowed.forEach((k) => { if (req.body[k] !== undefined) data[k] = req.body[k]; });

    const worker = await prisma.worker.update({
      where: { id: req.params.id },
      data,
    });
    res.json(worker);
  } catch (err) {
    if (err.code === 'P2025') return res.status(404).json({ error: 'Worker not found' });
    res.status(500).json({ error: err.message });
  }
}

// DELETE /api/v1/workers/:id  (soft delete — suspend)
async function deleteWorker(req, res) {
  try {
    const worker = await prisma.worker.update({
      where: { id: req.params.id },
      data: { status: 'SUSPENDED' },
    });
    res.json({ message: 'Worker suspended', worker });
  } catch (err) {
    if (err.code === 'P2025') return res.status(404).json({ error: 'Worker not found' });
    res.status(500).json({ error: err.message });
  }
}

module.exports = { createWorker, listWorkers, getWorker, updateWorker, deleteWorker };
