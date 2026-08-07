require('dotenv').config();
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');

const authRoutes = require('./routes/auth');
const workerRoutes = require('./routes/workers');
const testRoutes = require('./routes/tests');
const scoringRoutes = require('./routes/scoring');
const kaamCardRoutes = require('./routes/kaamcards');
const analyticsRoutes = require('./routes/analytics');
const publicRoutes = require('./routes/public');
const adminRoutes = require('./routes/admin');
const reportRoutes = require('./routes/reports');

const app = express();

// ── Middleware ────────────────────────────────────────────────────────────────
app.use(cors({ origin: '*', credentials: true }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev'));

// ── Routes ────────────────────────────────────────────────────────────────────
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/workers', workerRoutes);
app.use('/api/v1/tests', testRoutes);
app.use('/api/v1/kaamcards', kaamCardRoutes);
app.use('/api/v1/verify', require('./routes/verify'));
app.use('/api/v1/analytics', analyticsRoutes);
app.use('/api/v1/public', publicRoutes);
app.use('/api/v1/admin', adminRoutes);
app.use('/api/v1/reports', reportRoutes);
// Mounted last and bare (no sub-path) since its routes mix /workers/:id/...
// and /certificates/:id prefixes — every other, more specific router above
// must get first shot at matching, otherwise this router's blanket
// `router.use(requireAuth)` would intercept and 401 traffic meant for the
// public/admin/verify routers before they ever run.
app.use('/api/v1', scoringRoutes);

// ── Health ────────────────────────────────────────────────────────────────────
app.get('/health', (_req, res) => res.json({ status: 'ok', timestamp: new Date() }));

// ── 404 ───────────────────────────────────────────────────────────────────────
app.use((_req, res) => res.status(404).json({ error: 'Route not found' }));

// ── Global Error Handler ──────────────────────────────────────────────────────
app.use((err, _req, res, _next) => {
  console.error(err.stack);
  const status = err.status || 500;
  res.status(status).json({ error: err.message || 'Internal Server Error' });
});

module.exports = app;
