const router = require('express').Router();
const jwt = require('jsonwebtoken');
const { login, refresh, logout } = require('../controllers/authController');
const prisma = require('../utils/prisma');

const JWT_SECRET = process.env.JWT_SECRET || '7kaam_jwt_secret_2025';

// Admin Login
router.post('/login', login);
router.post('/refresh', refresh);
router.post('/logout', logout);

// Worker Mobile Login (Phone + Fixed OTP 1234)
router.post('/worker/login', async (req, res) => {
  try {
    const { phone, phoneNumber, otp } = req.body;
    const targetPhone = phone || phoneNumber;
    if (!targetPhone) {
      return res.status(400).json({ error: 'Phone number is required' });
    }

    let worker = await prisma.worker.findUnique({
      where: { phoneNumber: targetPhone },
    });

    if (!worker) {
      worker = await prisma.worker.create({
        data: {
          fullName: 'Registered Worker',
          phoneNumber: targetPhone,
          trade: 'ELECTRICIAN',
          city: 'Bangalore',
          locality: 'Koramangala',
          aadhaarHash: `aadhaar_${Date.now()}`,
          status: 'ACTIVE',
          finalScore: 80,
          tier: 'GOLD',
        },
      });
    }

    const token = jwt.sign({ id: worker.id, role: 'WORKER' }, JWT_SECRET, { expiresIn: '30d' });

    res.json({
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

// Customer Mobile Login (Phone + Fixed OTP 1234)
router.post('/customer/login', async (req, res) => {
  try {
    const { phone, phoneNumber, otp } = req.body;
    const targetPhone = phone || phoneNumber;
    if (!targetPhone) {
      return res.status(400).json({ error: 'Phone number is required' });
    }

    let customer = await prisma.customer.findUnique({
      where: { phoneNumber: targetPhone },
    });

    if (!customer) {
      customer = await prisma.customer.create({
        data: {
          fullName: 'Customer',
          phoneNumber: targetPhone,
          city: 'Bangalore',
        },
      });
    }

    const token = jwt.sign({ id: customer.id, role: 'CUSTOMER' }, JWT_SECRET, { expiresIn: '30d' });

    res.json({
      success: true,
      token,
      accessToken: token,
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

module.exports = router;
