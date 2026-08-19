const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const prisma = require('../utils/prisma');
const { hashAadhaar } = require('../utils/hash');
const { geocodeAddress } = require('../services/geocoding');

const VALID_TRADES = ['ELECTRICIAN', 'PLUMBER', 'CARPENTER', 'AC_TECHNICIAN', 'PAINTER', 'WELDER'];
const FIXED_OTP = '1234'; // TODO: integrate a real SMS OTP provider (e.g. MSG91/Twilio)

function signAccessToken(entity, role, extra = {}) {
  return jwt.sign({ id: entity.id, role, ...extra }, process.env.JWT_SECRET, { expiresIn: '1h' });
}

function signRefreshToken(entity, role) {
  return jwt.sign({ id: entity.id, role }, process.env.JWT_REFRESH_SECRET, { expiresIn: '30d' });
}

function serializeWorker(worker) {
  const { aadhaarHash, ...rest } = worker;
  return rest;
}

function serializeCustomer(customer) {
  return customer;
}

// ── Admin ──────────────────────────────────────────────────────────────────

async function login(req, res) {
  const { email, password } = req.body;
  if (!email || !password)
    return res.status(400).json({ error: 'Email and password required' });

  const admin = await prisma.admin.findUnique({ where: { email } });
  if (!admin) return res.status(401).json({ error: 'Invalid credentials' });

  const valid = await bcrypt.compare(password, admin.passwordHash);
  if (!valid) return res.status(401).json({ error: 'Invalid credentials' });

  const accessToken = signAccessToken(admin, admin.role, { email: admin.email });
  const refreshToken = signRefreshToken(admin, admin.role);

  res.json({
    accessToken,
    refreshToken,
    admin: { id: admin.id, email: admin.email, role: admin.role, city: admin.city },
  });
}

async function refresh(req, res) {
  const { refreshToken } = req.body;
  if (!refreshToken) return res.status(400).json({ error: 'Refresh token required' });

  try {
    const payload = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);

    if (payload.role === 'WORKER') {
      const worker = await prisma.worker.findUnique({ where: { id: payload.id } });
      if (!worker) return res.status(401).json({ error: 'Worker not found' });
      return res.json({ accessToken: signAccessToken(worker, 'WORKER') });
    }

    if (payload.role === 'CUSTOMER') {
      const customer = await prisma.customer.findUnique({ where: { id: payload.id } });
      if (!customer) return res.status(401).json({ error: 'Customer not found' });
      return res.json({ accessToken: signAccessToken(customer, 'CUSTOMER') });
    }

    const admin = await prisma.admin.findUnique({ where: { id: payload.id } });
    if (!admin) return res.status(401).json({ error: 'Admin not found' });
    return res.json({ accessToken: signAccessToken(admin, admin.role, { email: admin.email }) });
  } catch {
    res.status(401).json({ error: 'Invalid or expired refresh token' });
  }
}

async function logout(_req, res) {
  // Stateless JWT — just acknowledge. Client should discard tokens.
  res.json({ message: 'Logged out successfully' });
}

// ── Worker ─────────────────────────────────────────────────────────────────

// POST /api/v1/auth/worker/register
async function workerRegister(req, res) {
  try {
    const { fullName, phoneNumber, trade, city, locality, aadhaarHash, profilePhotoUrl } = req.body;

    if (!fullName || !phoneNumber || !trade || !city) {
      return res.status(400).json({ error: 'fullName, phoneNumber, trade and city are required' });
    }
    const normalizedTrade = String(trade).toUpperCase();
    if (!VALID_TRADES.includes(normalizedTrade)) {
      return res.status(400).json({ error: `trade must be one of ${VALID_TRADES.join(', ')}` });
    }

    const existing = await prisma.worker.findUnique({ where: { phoneNumber } });
    if (existing) return res.status(409).json({ error: 'Phone number already registered' });

    // Worker is listed as soon as they register, even at 0 score — no
    // finalScore/tier/KaamCard are assigned here; those come from real
    // assessments and manual admin review.
    const worker = await prisma.worker.create({
      data: {
        fullName,
        phoneNumber,
        trade: normalizedTrade,
        city,
        locality: locality || null,
        aadhaarHash: aadhaarHash || hashAadhaar(`${phoneNumber}_${Date.now()}`),
        profilePhotoUrl: profilePhotoUrl || null,
        status: 'ACTIVE',
      },
    });

    // Geocode city + locality in the background so the worker appears on the
    // customer map immediately. Fire-and-forget — never blocks the response.
    const geoQuery = [locality, city, 'India'].filter(Boolean).join(', ');
    geocodeAddress(geoQuery).then((coords) => {
      if (!coords) return;
      prisma.worker.update({
        where: { id: worker.id },
        data: { latitude: coords.lat, longitude: coords.lng },
      }).catch(() => {}); // silent — lat/lng is optional
    });

    const accessToken = signAccessToken(worker, 'WORKER');
    const refreshToken = signRefreshToken(worker, 'WORKER');
    res.status(201).json({ worker: serializeWorker(worker), accessToken, refreshToken });
  } catch (err) {
    if (err.code === 'P2002') return res.status(409).json({ error: 'Phone number already registered' });
    res.status(500).json({ error: err.message });
  }
}

// POST /api/v1/auth/worker/login
async function workerLogin(req, res) {
  try {
    const { phoneNumber, otp } = req.body;
    if (!phoneNumber || !otp) return res.status(400).json({ error: 'phoneNumber and otp are required' });
    const isValidOtp = otp === FIXED_OTP || /^\d{4,6}$/.test(otp);
    if (!isValidOtp) return res.status(401).json({ error: 'Invalid OTP' });

    const worker = await prisma.worker.findUnique({ where: { phoneNumber } });
    if (!worker) return res.status(404).json({ error: 'No worker registered with this phone number' });
    if (worker.status === 'SUSPENDED') return res.status(403).json({ error: 'This account has been suspended' });

    const accessToken = signAccessToken(worker, 'WORKER');
    const refreshToken = signRefreshToken(worker, 'WORKER');
    res.json({ worker: serializeWorker(worker), accessToken, refreshToken });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// ── Customer ───────────────────────────────────────────────────────────────

// POST /api/v1/auth/customer/register
async function customerRegister(req, res) {
  try {
    const { fullName, phoneNumber, city } = req.body;
    if (!fullName || !phoneNumber || !city) {
      return res.status(400).json({ error: 'fullName, phoneNumber and city are required' });
    }

    const existing = await prisma.customer.findUnique({ where: { phoneNumber } });
    if (existing) return res.status(409).json({ error: 'Phone number already registered' });

    const customer = await prisma.customer.create({ data: { fullName, phoneNumber, city } });

    const accessToken = signAccessToken(customer, 'CUSTOMER');
    const refreshToken = signRefreshToken(customer, 'CUSTOMER');
    res.status(201).json({ customer: serializeCustomer(customer), accessToken, refreshToken });
  } catch (err) {
    if (err.code === 'P2002') return res.status(409).json({ error: 'Phone number already registered' });
    res.status(500).json({ error: err.message });
  }
}

// POST /api/v1/auth/customer/login
async function customerLogin(req, res) {
  try {
    const { phoneNumber, otp } = req.body;
    if (!phoneNumber || !otp) return res.status(400).json({ error: 'phoneNumber and otp are required' });
    if (otp !== FIXED_OTP) return res.status(401).json({ error: 'Invalid OTP' });

    const customer = await prisma.customer.findUnique({ where: { phoneNumber } });
    if (!customer) return res.status(404).json({ error: 'No customer registered with this phone number' });

    const accessToken = signAccessToken(customer, 'CUSTOMER');
    const refreshToken = signRefreshToken(customer, 'CUSTOMER');
    res.json({ customer: serializeCustomer(customer), accessToken, refreshToken });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

module.exports = {
  login,
  refresh,
  logout,
  workerRegister,
  workerLogin,
  customerRegister,
  customerLogin,
};
