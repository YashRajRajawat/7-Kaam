const router = require('express').Router();
const multer = require('multer');
const { createWorker, listWorkers, getWorker, updateWorker, deleteWorker } = require('../controllers/workerController');
const { authenticate } = require('../middleware/auth');
const prisma = require('../utils/prisma');
const jwt = require('jsonwebtoken');

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

// Public Worker Registration Endpoint
router.post('/register', async (req, res) => {
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

    const token = jwt.sign({ id: worker.id, role: 'WORKER' }, process.env.JWT_SECRET || '7kaam_jwt_secret_2025', { expiresIn: '30d' });

    res.status(201).json({
      success: true,
      token,
      jwtToken: token,
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

// Protected routes
router.use(authenticate);

router.post('/', upload.single('profilePhoto'), createWorker);
router.get('/', listWorkers);
router.get('/:id', getWorker);
router.patch('/:id', updateWorker);
router.delete('/:id', deleteWorker);

module.exports = router;
