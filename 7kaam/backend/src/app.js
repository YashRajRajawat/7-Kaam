require('dotenv').config();
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const crypto = require('crypto');

const authRoutes = require('./routes/auth');
const workerRoutes = require('./routes/workers');
const testRoutes = require('./routes/tests');
const scoringRoutes = require('./routes/scoring');
const kaamCardRoutes = require('./routes/kaamcards');
const analyticsRoutes = require('./routes/analytics');
const publicRoutes = require('./routes/public');
const adminRoutes = require('./routes/admin');
const reportRoutes = require('./routes/reports');
const customerRoutes = require('./routes/customers');

const app = express();

// ── Security Headers (Helmet) ─────────────────────────────────────────────────
app.use(helmet({
  contentSecurityPolicy: false, // disabled — API-only server, no HTML served
  crossOriginResourcePolicy: { policy: 'cross-origin' },
}));

// ── CORS ──────────────────────────────────────────────────────────────────────
// Allow dashboard + Flutter apps. Defaults to all origins in development.
const allowedOrigins = process.env.CORS_ORIGINS
  ? process.env.CORS_ORIGINS.split(',').map((o) => o.trim())
  : ['http://localhost:3000', 'http://localhost:8081', 'http://localhost:19006'];

app.use(cors({
  origin: (origin, cb) => {
    // Allow requests with no origin (mobile apps, curl, Postman)
    if (!origin || allowedOrigins.includes(origin)) return cb(null, true);
    cb(null, true); // permissive for now; swap to cb(new Error('CORS')) when domains are finalised
  },
  credentials: true,
}));

// ── Compression (gzip) ────────────────────────────────────────────────────────
app.use(compression());

// ── Request ID (for log tracing) ──────────────────────────────────────────────
app.use((req, _res, next) => {
  req.id = crypto.randomUUID().slice(0, 8);
  next();
});

// ── Logging ───────────────────────────────────────────────────────────────────
app.use(morgan(':method :url :status :response-time ms'));

// ── Body Parsing ──────────────────────────────────────────────────────────────
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// ── Rate Limiting on Auth endpoints ───────────────────────────────────────────
// 20 requests per 15 minutes per IP — blocks OTP brute-force attempts
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests — please wait 15 minutes and try again.' },
});

// Stricter limit on OTP send (prevent SMS spam)
const otpSendLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 3,
  message: { error: 'Too many OTP requests — please wait 1 minute.' },
});

// ── Routes ────────────────────────────────────────────────────────────────────
app.use('/api/v1/auth', authLimiter, authRoutes);
app.use('/api/v1/kaamcards', kaamCardRoutes);
app.use('/api/v1/verify', require('./routes/verify'));
app.use('/api/v1/workers', workerRoutes);
app.use('/api/v1/tests', testRoutes);
app.use('/api/v1/analytics', analyticsRoutes);
app.use('/api/v1/public', publicRoutes);
app.use('/api/v1/admin', adminRoutes);
app.use('/api/v1/reports', reportRoutes);
app.use('/api/v1/customers', customerRoutes);
app.use('/api/v1', scoringRoutes);

// ── Health ────────────────────────────────────────────────────────────────────
app.get('/health', (_req, res) => res.json({ status: 'ok', timestamp: new Date() }));

// ── 404 ───────────────────────────────────────────────────────────────────────
app.use((_req, res) => res.status(404).json({ error: 'Route not found' }));

// ── Global Error Handler ──────────────────────────────────────────────────────
app.use((err, _req, res, _next) => {
  console.error(`[${err.status || 500}]`, err.message);
  const status = err.status || 500;
  res.status(status).json({ error: err.message || 'Internal Server Error' });
});

module.exports = app;


