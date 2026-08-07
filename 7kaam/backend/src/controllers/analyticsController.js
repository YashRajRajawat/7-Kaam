const prisma = require('../utils/prisma');

// GET /api/v1/analytics/overview
async function overview(req, res) {
  try {
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

    res.json({
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
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// GET /api/v1/analytics/by-trade
async function byTrade(req, res) {
  try {
    const data = await prisma.worker.groupBy({
      by: ['trade'],
      _count: true,
      _avg: { finalScore: true },
    });
    res.json(data.map((d) => ({ trade: d.trade, count: d._count, avgScore: Math.round(d._avg.finalScore || 0) })));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// GET /api/v1/analytics/by-city
async function byCity(req, res) {
  try {
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

    // Get per-city certified count by fetching workers
    const workers = await prisma.worker.findMany({ select: { city: true, id: true } });
    const cityMap = {};
    workers.forEach((w) => {
      if (!cityMap[w.city]) cityMap[w.city] = { total: 0, certified: 0 };
      cityMap[w.city].total++;
      if (certifiedWorkerIds.has(w.id)) cityMap[w.city].certified++;
    });

    res.json(
      data.map((d) => ({
        city: d.city,
        workers: d._count,
        certified: cityMap[d.city]?.certified || 0,
        avgScore: Math.round(d._avg.finalScore || 0),
      }))
    );
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// GET /api/v1/analytics/score-distribution
async function scoreDistribution(req, res) {
  try {
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

    res.json(bands);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// GET /api/v1/analytics/certifications-over-time
async function certificationsOverTime(req, res) {
  try {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const cards = await prisma.kaamCard.findMany({
      where: { issuedAt: { gte: thirtyDaysAgo } },
      select: { issuedAt: true },
      orderBy: { issuedAt: 'asc' },
    });

    // Group by date
    const map = {};
    cards.forEach((c) => {
      const date = (typeof c.issuedAt === 'string' ? c.issuedAt : new Date(c.issuedAt).toISOString()).substring(0, 10);
      map[date] = (map[date] || 0) + 1;
    });

    // Fill in missing days with 0
    const result = [];
    for (let i = 0; i < 30; i++) {
      const d = new Date();
      d.setDate(d.getDate() - (29 - i));
      const key = d.toISOString().substring(0, 10);
      result.push({ date: key, count: map[key] || 0 });
    }

    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

module.exports = { overview, byTrade, byCity, scoreDistribution, certificationsOverTime };
