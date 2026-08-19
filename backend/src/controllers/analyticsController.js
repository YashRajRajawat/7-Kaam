const prisma = require('../utils/prisma');
const { PUBLIC_DIRECTORY, isUnclaimed } = require('../utils/listing');

// ── Unclaimed-listing exclusion (§D.8 + critique MINOR) ───────────────────────
// Every "how many workers do we have" metric must exclude unclaimed
// public-directory listings. Otherwise all 245 scraped businesses land in
// totalWorkers, activeWorkers, this week's newRegistrations, and the per-city /
// per-trade breakdowns — i.e. the company reports 245 workers it does not have.
// `averageScore` / `tierBreakdown` / `scoreDistribution` are already safe: they
// filter `finalScore`/`tier` `not: null`, which no unclaimed row can satisfy.

const UNCLAIMED_WHERE = { listingSource: PUBLIC_DIRECTORY, claimStatus: { not: 'CLAIMED' } };

// Never throws: on a database where the migration has not been applied yet the
// columns do not exist — and neither do any directory listings, so 0 is the
// correct exclusion.
async function countWorkersSafe(where) {
  try {
    return await prisma.worker.count({ where });
  } catch {
    return 0;
  }
}

// The REST proxy's groupBy() already fetches every row and groups in JS
// (src/utils/prisma.js:335-374), so grouping here costs nothing extra — and it
// is the only way to express "exclude unclaimed", which needs an OR that
// applyWhere (src/utils/prisma.js:84-110) cannot build.
async function fetchWorkersExcludingUnclaimed() {
  const rows = await prisma.worker.findMany({});
  return rows.filter((w) => !isUnclaimed(w));
}

function groupRows(rows, key, avgField) {
  const groups = new Map();
  for (const r of rows) {
    const k = r[key];
    if (!groups.has(k)) groups.set(k, { key: k, count: 0, sum: 0, n: 0 });
    const g = groups.get(k);
    g.count++;
    if (avgField && r[avgField] != null) { g.sum += r[avgField]; g.n++; }
  }
  return [...groups.values()];
}

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
      allWorkers,
      allActiveWorkers,
      suspendedWorkers,
      totalKaamCardsIssued,
      certifiedToday,
      avgScoreData,
      claimedWorkerRows,
      tierCounts,
      allNewRegistrationsThisWeek,
      testsAttemptedToday,
      certificatesIssuedToday,
      unclaimedTotal,
      unclaimedActive,
      unclaimedThisWeek,
      directoryListingsTotal,
      directoryListingsClaimed,
    ] = await Promise.all([
      prisma.worker.count(),
      prisma.worker.count({ where: { status: 'ACTIVE' } }),
      prisma.worker.count({ where: { status: 'SUSPENDED' } }),
      prisma.kaamCard.count({ where: { isRevoked: false } }),
      prisma.kaamCard.count({ where: { issuedAt: { gte: startOfToday } } }),
      prisma.worker.aggregate({ _avg: { finalScore: true }, where: { finalScore: { not: null } } }),
      fetchWorkersExcludingUnclaimed(),
      prisma.worker.groupBy({ by: ['tier'], _count: true, where: { tier: { not: null } } }),
      prisma.worker.count({ where: { createdAt: { gte: sevenDaysAgo } } }),
      prisma.testSubmission.count({ where: { submittedAt: { gte: startOfToday } } }),
      prisma.skillCertificate.count({ where: { issuedAt: { gte: startOfToday } } }),
      countWorkersSafe(UNCLAIMED_WHERE),
      countWorkersSafe({ status: 'ACTIVE', ...UNCLAIMED_WHERE }),
      countWorkersSafe({ createdAt: { gte: sevenDaysAgo }, ...UNCLAIMED_WHERE }),
      countWorkersSafe({ listingSource: PUBLIC_DIRECTORY }),
      countWorkersSafe({ listingSource: PUBLIC_DIRECTORY, claimStatus: 'CLAIMED' }),
    ]);

    const payload = {
      // Unclaimed directory listings are not 7 Kaam workers and are subtracted
      // out of every headcount (§D.8).
      totalWorkers: allWorkers - unclaimedTotal,
      activeWorkers: allActiveWorkers - unclaimedActive,
      suspendedWorkers,
      totalKaamCardsIssued,
      certifiedToday,
      averageScore: Math.round(avgScoreData._avg.finalScore || 0),
      activeCities: new Set(claimedWorkerRows.map((w) => w.city)).size,
      tierBreakdown: tierCounts.map((t) => ({ tier: t.tier, count: t._count })),
      newRegistrationsThisWeek: allNewRegistrationsThisWeek - unclaimedThisWeek,
      testsAttemptedToday,
      certificatesIssuedToday,
      // Reported separately and honestly, never folded into the worker counts.
      directoryListingsTotal,
      directoryListingsClaimed,
    };
    res.json(_setCached('overview', payload));
  } catch (err) {
    if (err.statusCode) return res.status(err.statusCode).json({ error: err.message, code: err.code });
    res.status(500).json({ error: err.message });
  }
}


// GET /api/v1/analytics/by-trade
async function byTrade(req, res) {
  try {
    const cached = _getCached('byTrade');
    if (cached) return res.json(cached);
    // Critique MINOR — this breakdown counted all 245 imports as workers.
    const rows = await fetchWorkersExcludingUnclaimed();
    const data = groupRows(rows, 'trade', 'finalScore');
    res.json(_setCached('byTrade', data.map((d) => ({
      trade: d.key,
      count: d.count,
      avgScore: Math.round(d.n ? d.sum / d.n : 0),
    }))));
  } catch (err) {
    if (err.statusCode) return res.status(err.statusCode).json({ error: err.message, code: err.code });
    res.status(500).json({ error: err.message });
  }
}

// GET /api/v1/analytics/by-city
async function byCity(req, res) {
  try {
    const cached = _getCached('byCity');
    if (cached) return res.json(cached);

    // Critique MINOR — this breakdown counted all 245 imports as workers.
    const workers = await fetchWorkersExcludingUnclaimed();
    const data = groupRows(workers, 'city', 'finalScore');

    const certified = await prisma.kaamCard.groupBy({
      by: ['workerId'],
      where: { isRevoked: false },
    });
    const certifiedWorkerIds = new Set(certified.map((c) => c.workerId));

    const cityMap = {};
    workers.forEach((w) => {
      if (!cityMap[w.city]) cityMap[w.city] = { total: 0, certified: 0 };
      cityMap[w.city].total++;
      if (certifiedWorkerIds.has(w.id)) cityMap[w.city].certified++;
    });

    const payload = data.map((d) => ({
      city: d.key,
      workers: d.count,
      certified: cityMap[d.key]?.certified || 0,
      avgScore: Math.round(d.n ? d.sum / d.n : 0),
    }));
    res.json(_setCached('byCity', payload));
  } catch (err) {
    if (err.statusCode) return res.status(err.statusCode).json({ error: err.message, code: err.code });
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
    if (err.statusCode) return res.status(err.statusCode).json({ error: err.message, code: err.code });
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
    if (err.statusCode) return res.status(err.statusCode).json({ error: err.message, code: err.code });
    res.status(500).json({ error: err.message });
  }
}


module.exports = { overview, byTrade, byCity, scoreDistribution, certificationsOverTime };
