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
const mobileRoutes = require('./routes/mobile');

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
app.use('/api/v1', scoringRoutes);         // /api/v1/workers/:id/...
app.use('/api/v1/kaamcards', kaamCardRoutes);
app.use('/api/v1/verify', require('./routes/verify'));
app.use('/api/v1/analytics', analyticsRoutes);
app.use('/api/v1/mobile', mobileRoutes);

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
