const prisma = require('../utils/prisma');

// ── Simple 60-second in-memory TTL cache ──────────────────────────────────────
// Prevents 11+ parallel DB queries on every dashboard load.
const _cache = new Map();
function _getCached(key) {
  const entry = _cache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.ts > 60_000) { _cache.delete(key); return null; }
  return entry.data;
}
function _setCached(key, data) {
  _cache.set(key, { data, ts: Date.now() });
  return data;
}

// GET /api/v1/analytics/overview
async function overview(req, res) {
  try {
    const cached = _getCached('overview');
    if (cached) return res.json(cached);

    const startOfToday = new Date(new Date().setHours(0, 0, 0, 0));
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const [
      totalWorkers,
      activeWorkers,
      suspendedWorkers,
      totalKaamCardsIssued,
      certifiedToday,
      avgScoreData,
      cities,
      tierCounts,
      newRegistrationsThisWeek,
      testsAttemptedToday,
      certificatesIssuedToday,
    ] = await Promise.all([
      prisma.worker.count(),
      prisma.worker.count({ where: { status: 'ACTIVE' } }),
      prisma.worker.count({ where: { status: 'SUSPENDED' } }),
      prisma.kaamCard.count({ where: { isRevoked: false } }),
      prisma.kaamCard.count({ where: { issuedAt: { gte: startOfToday } } }),
      prisma.worker.aggregate({ _avg: { finalScore: true }, where: { finalScore: { not: null } } }),
      prisma.worker.groupBy({ by: ['city'], _count: true }),
      prisma.worker.groupBy({ by: ['tier'], _count: true, where: { tier: { not: null } } }),
      prisma.worker.count({ where: { createdAt: { gte: sevenDaysAgo } } }),
      prisma.testSubmission.count({ where: { submittedAt: { gte: startOfToday } } }),
      prisma.skillCertificate.count({ where: { issuedAt: { gte: startOfToday } } }),
    ]);

    const payload = {
      totalWorkers,
      activeWorkers,
      suspendedWorkers,
      totalKaamCardsIssued,
      certifiedToday,
      averageScore: Math.round(avgScoreData._avg.finalScore || 0),
      activeCities: cities.length,
      tierBreakdown: tierCounts.map((t) => ({ tier: t.tier, count: t._count })),
      newRegistrationsThisWeek,
      testsAttemptedToday,
      certificatesIssuedToday,
    };
    res.json(_setCached('overview', payload));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}


// GET /api/v1/analytics/by-trade
async function byTrade(req, res) {
  try {
    const cached = _getCached('byTrade');
    if (cached) return res.json(cached);
    const data = await prisma.worker.groupBy({
      by: ['trade'],
      _count: true,
      _avg: { finalScore: true },
    });
    res.json(_setCached('byTrade', data.map((d) => ({ trade: d.trade, count: d._count, avgScore: Math.round(d._avg.finalScore || 0) }))));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// GET /api/v1/analytics/by-city
async function byCity(req, res) {
  try {
    const cached = _getCached('byCity');
    if (cached) return res.json(cached);

    const data = await prisma.worker.groupBy({
      by: ['city'],
      _count: true,
      _avg: { finalScore: true },
    });
    const certified = await prisma.kaamCard.groupBy({
      by: ['workerId'],
      where: { isRevoked: false },
    });
    const certifiedWorkerIds = new Set(certified.map((c) => c.workerId));

    const workers = await prisma.worker.findMany({ select: { city: true, id: true } });
    const cityMap = {};
    workers.forEach((w) => {
      if (!cityMap[w.city]) cityMap[w.city] = { total: 0, certified: 0 };
      cityMap[w.city].total++;
      if (certifiedWorkerIds.has(w.id)) cityMap[w.city].certified++;
    });

    const payload = data.map((d) => ({
      city: d.city,
      workers: d._count,
      certified: cityMap[d.city]?.certified || 0,
      avgScore: Math.round(d._avg.finalScore || 0),
    }));
    res.json(_setCached('byCity', payload));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}


// GET /api/v1/analytics/score-distribution
async function scoreDistribution(req, res) {
  try {
    const cached = _getCached('scoreDistribution');
    if (cached) return res.json(cached);

    const workers = await prisma.worker.findMany({
      where: { finalScore: { not: null } },
      select: { finalScore: true },
    });

    const bands = [
      { label: '0-20', min: 0, max: 20, count: 0 },
      { label: '20-40', min: 20, max: 40, count: 0 },
      { label: '40-60', min: 40, max: 60, count: 0 },
      { label: '60-80', min: 60, max: 80, count: 0 },
      { label: '80-100', min: 80, max: 100, count: 0 },
    ];

    workers.forEach(({ finalScore }) => {
      const band = bands.find((b) => finalScore >= b.min && finalScore < b.max + (b.max === 100 ? 1 : 0));
      if (band) band.count++;
    });

    res.json(_setCached('scoreDistribution', bands));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}


// GET /api/v1/analytics/certifications-over-time?days=30
// `days` param lets the dashboard date range picker request different windows
async function certificationsOverTime(req, res) {
  try {
    const days = Math.min(Math.max(parseInt(req.query.days) || 30, 7), 365);
    const cacheKey = `certOverTime_${days}`;
    const cached = _getCached(cacheKey);
    if (cached) return res.json(cached);

    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);

    const cards = await prisma.kaamCard.findMany({
      where: { issuedAt: { gte: cutoff } },
      select: { issuedAt: true },
      orderBy: { issuedAt: 'asc' },
    });

    const map = {};
    cards.forEach((c) => {
      const date = (typeof c.issuedAt === 'string' ? c.issuedAt : new Date(c.issuedAt).toISOString()).substring(0, 10);
      map[date] = (map[date] || 0) + 1;
    });

    const result = [];
    for (let i = 0; i < days; i++) {
      const d = new Date();
      d.setDate(d.getDate() - (days - 1 - i));
      const key = d.toISOString().substring(0, 10);
      result.push({ date: key, count: map[key] || 0 });
    }

    res.json(_setCached(cacheKey, result));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}


module.exports = { overview, byTrade, byCity, scoreDistribution, certificationsOverTime };
