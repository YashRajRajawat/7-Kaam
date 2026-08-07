const prisma = require('../utils/prisma');
const { haversineKm } = require('../services/geo');

const VALID_TRADES = ['ELECTRICIAN', 'PLUMBER', 'CARPENTER', 'AC_TECHNICIAN', 'PAINTER', 'WELDER'];

// SkillCertificate/VideoAssessment counts degrade to 0 rather than 500ing if
// those tables aren't migrated in yet on this environment.
async function safeGroupByWorker(model, workerIds) {
  try {
    return await model.groupBy({ by: ['workerId'], where: { workerId: { in: workerIds } }, _count: true });
  } catch {
    return [];
  }
}

async function safeCount(model, where) {
  try {
    return await model.count({ where });
  } catch {
    return 0;
  }
}

async function safeFindMany(model, args) {
  try {
    return await model.findMany(args);
  } catch {
    return [];
  }
}

function credibilityFor(testsCount = 0, videosCount = 0) {
  const total = testsCount + videosCount;
  if (total >= 5) return 'EXPERT';
  if (total >= 2) return 'ESTABLISHED';
  return 'EMERGING';
}

function summarizeWorker(w, distanceKm) {
  const activeCard = w.kaamCards?.[0] || null;
  const testsCount = w._count?.testSubmissions ?? 0;
  const videosCount = w._count?.videoAssessments ?? 0;
  const certsCount = w._count?.skillCertificates ?? 0;

  return {
    id: w.id,
    fullName: w.fullName,
    trade: w.trade,
    city: w.city,
    locality: w.locality,
    profilePhotoUrl: w.profilePhotoUrl,
    finalScore: w.finalScore,
    tier: w.tier,
    certificatesEarned: certsCount,
    credibilityLevel: credibilityFor(testsCount, videosCount),
    hasKaamCard: !!activeCard,
    kaamCardTier: activeCard ? w.tier : null,
    ...(distanceKm != null ? { distanceKm: Math.round(distanceKm * 10) / 10 } : {}),
    status: w.status,
    underReview: w.underReview,
  };
}

// GET /api/v1/public/workers
async function listPublicWorkers(req, res) {
  try {
    const {
      trade,
      city,
      lat,
      lng,
      radiusKm = 10,
      hasKaamCard,
      minScore,
      search,
      sortBy = 'score',
      page = 1,
      limit = 20,
    } = req.query;

    const where = { status: 'ACTIVE' };
    if (trade && trade !== 'all') {
      const normalizedTrade = String(trade).toUpperCase();
      if (!VALID_TRADES.includes(normalizedTrade)) {
        return res.status(400).json({ error: `trade must be one of ${VALID_TRADES.join(', ')} or 'all'` });
      }
      where.trade = normalizedTrade;
    }
    if (city) where.city = { contains: city, mode: 'insensitive' };
    if (search) where.fullName = { contains: search, mode: 'insensitive' };
    if (minScore) where.finalScore = { gte: Number(minScore) };

    // Worker->SkillCertificate and Worker->VideoAssessment have no FK PostgREST
    // can embed on, so those two counts are fetched separately below rather
    // than via `include` (kaamCards and testSubmissions embed fine).
    let workers = await prisma.worker.findMany({
      where,
      include: {
        kaamCards: { where: { isRevoked: false }, take: 1, orderBy: { issuedAt: 'desc' } },
        _count: { select: { testSubmissions: true } },
      },
    });

    if (hasKaamCard === 'true') {
      workers = workers.filter((w) => w.kaamCards && w.kaamCards.length > 0);
    }

    const workerIds = workers.map((w) => w.id);
    const [certGroups, videoGroups] = await Promise.all([
      workerIds.length ? safeGroupByWorker(prisma.skillCertificate, workerIds) : [],
      workerIds.length ? safeGroupByWorker(prisma.videoAssessment, workerIds) : [],
    ]);
    const certCountByWorker = Object.fromEntries(certGroups.map((g) => [g.workerId, g._count]));
    const videoCountByWorker = Object.fromEntries(videoGroups.map((g) => [g.workerId, g._count]));
    workers = workers.map((w) => ({
      ...w,
      _count: {
        testSubmissions: w._count?.testSubmissions ?? 0,
        skillCertificates: certCountByWorker[w.id] ?? 0,
        videoAssessments: videoCountByWorker[w.id] ?? 0,
      },
    }));

    const useGeo = lat !== undefined && lng !== undefined && lat !== '' && lng !== '';
    let withDistance = workers;
    if (useGeo) {
      const latNum = Number(lat);
      const lngNum = Number(lng);
      const radius = Number(radiusKm) || 10;
      withDistance = workers
        .filter((w) => w.latitude != null && w.longitude != null)
        .map((w) => ({ ...w, distanceKm: haversineKm(latNum, lngNum, w.latitude, w.longitude) }))
        .filter((w) => w.distanceKm <= radius);
    }

    const sorted = [...withDistance].sort((a, b) => {
      if (sortBy === 'recent') return new Date(b.createdAt) - new Date(a.createdAt);
      if (sortBy === 'name') return a.fullName.localeCompare(b.fullName);
      if (useGeo && sortBy !== 'score') return a.distanceKm - b.distanceKm;
      if (useGeo && sortBy === 'score') return (b.finalScore ?? 0) - (a.finalScore ?? 0);
      return (b.finalScore ?? 0) - (a.finalScore ?? 0);
    });

    const total = sorted.length;
    const pageNum = Math.max(1, Number(page) || 1);
    const limitNum = Math.max(1, Number(limit) || 20);
    const start = (pageNum - 1) * limitNum;
    const pageItems = sorted.slice(start, start + limitNum);

    res.json({
      workers: pageItems.map((w) => summarizeWorker(w, useGeo ? w.distanceKm : undefined)),
      total,
      page: pageNum,
      totalPages: Math.max(1, Math.ceil(total / limitNum)),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// GET /api/v1/public/workers/:id — auth optional, phone only if authenticated as CUSTOMER
async function getPublicWorkerProfile(req, res) {
  try {
    // Worker->SkillCertificate and Worker->VideoAssessment have no FK
    // PostgREST can embed on, so those are queried directly below.
    const worker = await prisma.worker.findUnique({
      where: { id: req.params.id },
      include: {
        kaamCards: { where: { isRevoked: false }, take: 1, orderBy: { issuedAt: 'desc' } },
        workHistories: true,
        _count: { select: { testSubmissions: true } },
      },
    });

    if (!worker || worker.status === 'SUSPENDED') {
      return res.status(404).json({ error: 'Worker not found' });
    }

    const [certificates, videosCount] = await Promise.all([
      safeFindMany(prisma.skillCertificate, { where: { workerId: worker.id } }),
      safeCount(prisma.videoAssessment, { workerId: worker.id }),
    ]);

    const activeCard = worker.kaamCards?.[0] || null;
    const testsCount = worker._count?.testSubmissions ?? 0;

    const profile = {
      id: worker.id,
      fullName: worker.fullName,
      trade: worker.trade,
      city: worker.city,
      locality: worker.locality,
      profilePhotoUrl: worker.profilePhotoUrl,
      finalScore: worker.finalScore,
      tier: worker.tier,
      videoScore: worker.videoScore,
      testScore: worker.testScore,
      workHistoryScore: worker.workHistoryScore,
      totalTestsTaken: testsCount,
      totalVideosTaken: videosCount,
      certificatesEarned: certificates.length,
      credibilityLevel: credibilityFor(testsCount, videosCount),
      kaamCard: activeCard
        ? {
            issuedAt: activeCard.issuedAt,
            expiresAt: activeCard.expiresAt,
            tier: worker.tier,
            score: worker.finalScore,
          }
        : null,
      certificates: certificates.map((c) => ({
        title: c.testTitle,
        category: c.category,
        difficulty: c.difficulty,
        score: c.score,
        issuedAt: c.issuedAt,
      })),
      workHistory: (worker.workHistories || []).map((h) => ({
        clientName: h.clientName,
        projectTitle: h.projectTitle,
        durationMonths: h.durationMonths,
        projectScale: h.projectScale,
      })),
      aadhaarVerified: worker.aadhaarVerified,
      status: worker.status,
      underReview: worker.underReview,
    };

    if (req.auth?.role === 'CUSTOMER') {
      profile.phoneNumber = worker.phoneNumber;
    }

    res.json(profile);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

module.exports = { listPublicWorkers, getPublicWorkerProfile };
