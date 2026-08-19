const prisma = require('../utils/prisma');
const { haversineKm } = require('../services/geo');
const {
  PUBLIC_DIRECTORY,
  SELF_SIGNUP,
  isUnclaimed,
  isClaimable,
  isSuppressed,
} = require('../utils/listing');

const VALID_TRADES = ['ELECTRICIAN', 'PLUMBER', 'CARPENTER', 'AC_TECHNICIAN', 'PAINTER', 'WELDER'];
const VALID_SOURCES = [SELF_SIGNUP, PUBLIC_DIRECTORY];

// Kill switch (spec §D.3). When `false`, EVERY unclaimed public-directory
// listing is removed from listPublicWorkers and getPublicWorkerProfile 404s it,
// regardless of query params. The code default is `true` so dev/staging
// exercise the real path; PRODUCTION MUST SET THIS TO `false` until the DPDP
// Act 2023 notice-at-first-contact and opt-out are signed off (§J.1).
const DIRECTORY_LISTINGS_PUBLIC = process.env.SEVENKAAM_DIRECTORY_LISTINGS_PUBLIC !== 'false';

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

// Both columns are NOT NULL with a DB default; these fall back to the column
// default (never to a trust-flattering value) if a row predates the migration.
function listingSourceOf(w) { return w?.listingSource ?? SELF_SIGNUP; }
function claimStatusOf(w) { return w?.claimStatus ?? 'CLAIMED'; }

function summarizeWorker(w, distanceKm) {
  const unclaimed = isUnclaimed(w);
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
    // An unclaimed directory listing carries NO trust data. These are hard-nulled
    // here as well as at the database (§A.5 CHECK). Never `?? 0`, never a
    // default tier, never a Google rating mapped into a 7 Kaam value.
    finalScore: unclaimed ? null : w.finalScore,
    tier: unclaimed ? null : w.tier,
    certificatesEarned: unclaimed ? 0 : certsCount,
    // `null`, not a sentinel string — a sentinel would be rendered as text by
    // any client that treats this field as displayable (§D.2).
    credibilityLevel: unclaimed ? null : credibilityFor(testsCount, videosCount),
    hasKaamCard: unclaimed ? false : !!activeCard,
    kaamCardTier: unclaimed || !activeCard ? null : w.tier,
    // NEW (§D.2) — the customer app's map was empty without these.
    latitude: w.latitude ?? null,
    longitude: w.longitude ?? null,
    // Invariant I3: these four keys are ALWAYS present, never conditional.
    isUnclaimed: unclaimed,
    isClaimable: isClaimable(w),
    listingSource: listingSourceOf(w),
    claimStatus: claimStatusOf(w),
    sourceName: w.sourceName ?? null,
    ...(distanceKm != null ? { distanceKm: Math.round(distanceKm * 10) / 10 } : {}),
    status: w.status,
    underReview: w.underReview,
  };
}

// Verified/scored workers are ALWAYS above unclaimed listings, in every sortBy
// mode (§D.4). The partition is the primary key of the comparator.
const byPartition = (a, b) => (a.isUnclaimed === b.isUnclaimed ? 0 : (a.isUnclaimed ? 1 : -1));
// Deterministic tiebreak: Array.prototype.sort is not guaranteed stable and this
// list is recomputed on every keystroke; without it the unclaimed block
// visibly reshuffles.
const byId = (a, b) => String(a.id).localeCompare(String(b.id));

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
      verifiedOnly = 'false',
      source,
    } = req.query;

    const where = { status: 'ACTIVE' };
    if (trade && trade !== 'all') {
      const normalizedTrade = String(trade).toUpperCase();
      if (!VALID_TRADES.includes(normalizedTrade)) {
        return res.status(400).json({ error: `trade must be one of ${VALID_TRADES.join(', ')} or 'all'` });
      }
      where.trade = normalizedTrade;
    }
    if (source && !VALID_SOURCES.includes(String(source))) {
      return res.status(400).json({ error: `source must be one of ${VALID_SOURCES.join(', ')}` });
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

    // ── Listing-source / suppression filtering ────────────────────────────────
    // Deliberately done in JS on the fetched array, NOT pushed into `where`:
    // applyWhere (src/utils/prisma.js:84-110) has no OR support, and a bad
    // filter would be swallowed and returned as [] (§D.2).

    // Always applied, never parameterised — a suppressed row is a person who
    // asked to be removed.
    workers = workers.filter((w) => !isSuppressed(w));

    if (!DIRECTORY_LISTINGS_PUBLIC) {
      workers = workers.filter((w) => !isUnclaimed(w));
    }
    if (String(verifiedOnly) === 'true') {
      workers = workers.filter((w) => !isUnclaimed(w));
    }
    if (source) {
      workers = workers.filter((w) => listingSourceOf(w) === String(source));
    }
    // Explicit, not coercion: an unclaimed listing has finalScore === null and
    // can never satisfy a minimum score (§D.3).
    if (minScore !== undefined && minScore !== '') {
      const min = Number(minScore);
      workers = workers.filter((w) => !isUnclaimed(w) && w.finalScore != null && w.finalScore >= min);
    }

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

    // Summarise first, then sort: the comparator's primary key is the
    // isUnclaimed partition, which only exists on the summarised object.
    const decorated = withDistance.map((w) => ({
      row: w,
      summary: summarizeWorker(w, useGeo ? w.distanceKm : undefined),
    }));

    decorated.sort((a, b) => {
      const p = byPartition(a.summary, b.summary);
      if (p !== 0) return p;
      if (sortBy === 'recent') {
        const d = new Date(b.row.createdAt) - new Date(a.row.createdAt);
        if (d) return d;
      } else if (sortBy === 'name') {
        const n = String(a.summary.fullName || '').localeCompare(String(b.summary.fullName || ''));
        if (n) return n;
      } else if (sortBy === 'distance' || (useGeo && sortBy !== 'score')) {
        const d = (a.summary.distanceKm ?? Infinity) - (b.summary.distanceKm ?? Infinity);
        if (d) return d;
      } else {
        // -1, NOT 0: with `?? 0` a genuinely-assessed worker scoring 0 would tie
        // with every unscored row. -1 is outside the valid score domain.
        const s = (b.summary.finalScore ?? -1) - (a.summary.finalScore ?? -1);
        if (s) return s;
      }
      return byId(a.summary, b.summary);
    });

    const total = decorated.length;
    const pageNum = Math.max(1, Number(page) || 1);
    const limitNum = Math.max(1, Number(limit) || 20);
    const start = (pageNum - 1) * limitNum;
    const pageItems = decorated.slice(start, start + limitNum);
    const workersPayload = pageItems.map((d) => d.summary);

    // `counts` describes EXACTLY the `workers` array returned below — the same
    // page the client renders — and nothing else. Critique "counts vs the
    // client-filtered list": a whole-result-set breakdown alongside a
    // page-1-only list produces the subheader "14 results / 245 unverified".
    // The two numbers must never describe different populations. `counts.total`
    // is deliberately absent (critique D3 — it collided with `total` below).
    const counts = {
      verified: workersPayload.filter((w) => !w.isUnclaimed).length,
      unclaimed: workersPayload.filter((w) => w.isUnclaimed).length,
    };

    res.json({
      workers: workersPayload,
      counts,
      total,
      page: pageNum,
      totalPages: Math.max(1, Math.ceil(total / limitNum)),
    });
  } catch (err) {
    if (err.statusCode) return res.status(err.statusCode).json({ error: err.message, code: err.code });
    res.status(500).json({ error: err.message });
  }
}

// GET /api/v1/public/workers/:id — auth optional. The phone number is NEVER
// returned for an unclaimed directory listing (see below).
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
    // Suppressed = the person asked to be removed. Gone from every public read.
    if (isSuppressed(worker)) {
      return res.status(404).json({ error: 'Worker not found' });
    }
    const unclaimed = isUnclaimed(worker);
    if (unclaimed && !DIRECTORY_LISTINGS_PUBLIC) {
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
      latitude: worker.latitude ?? null,
      longitude: worker.longitude ?? null,
      // Every trust-bearing value is hard-nulled for an unclaimed listing.
      finalScore: unclaimed ? null : worker.finalScore,
      tier: unclaimed ? null : worker.tier,
      videoScore: unclaimed ? null : worker.videoScore,
      testScore: unclaimed ? null : worker.testScore,
      workHistoryScore: unclaimed ? null : worker.workHistoryScore,
      totalTestsTaken: unclaimed ? 0 : testsCount,
      totalVideosTaken: unclaimed ? 0 : videosCount,
      certificatesEarned: unclaimed ? 0 : certificates.length,
      credibilityLevel: unclaimed ? null : credibilityFor(testsCount, videosCount),
      kaamCard: unclaimed || !activeCard
        ? null
        : {
            issuedAt: activeCard.issuedAt,
            expiresAt: activeCard.expiresAt,
            tier: worker.tier,
            score: worker.finalScore,
          },
      certificates: unclaimed
        ? []
        : certificates.map((c) => ({
            title: c.testTitle,
            category: c.category,
            difficulty: c.difficulty,
            score: c.score,
            issuedAt: c.issuedAt,
          })),
      workHistory: unclaimed
        ? []
        : (worker.workHistories || []).map((h) => ({
            clientName: h.clientName,
            projectTitle: h.projectTitle,
            durationMonths: h.durationMonths,
            projectScale: h.projectScale,
          })),
      aadhaarVerified: unclaimed ? false : worker.aadhaarVerified === true,
      // Invariant I3 — always present.
      isUnclaimed: unclaimed,
      isClaimable: isClaimable(worker),
      listingSource: listingSourceOf(worker),
      claimStatus: claimStatusOf(worker),
      sourceName: worker.sourceName ?? null,
      // Detail-only provenance keys (§D.5).
      sourceUrl: worker.sourceUrl ?? null,
      sourceAddress: worker.sourceAddress ?? null,
      tradeInferred: worker.tradeInferred === true,
      importedAt: worker.importedAt ?? null,
      phoneNumberSource: listingSourceOf(worker) === PUBLIC_DIRECTORY ? 'PUBLIC_DIRECTORY' : 'SELF_PROVIDED',
      status: worker.status,
      underReview: worker.underReview,
    };

    // Phone disclosure (critique B6). POST /auth/customer/register mints a
    // CUSTOMER token from {fullName, phoneNumber, city} with no verification
    // whatsoever, so "authenticated customer" is NOT a meaningful gate — one
    // request would otherwise harvest all 245 scraped phone numbers. The number
    // of a real business that never consented to being listed is therefore
    // withheld until the listing is CLAIMED by its owner (or product/legal
    // signs off — §J.3). `phoneNumberSource` above still tells the client where
    // a number would have come from.
    if (req.auth?.role === 'CUSTOMER' && !unclaimed) {
      profile.phoneNumber = worker.phoneNumber;
    }

    res.json(profile);
  } catch (err) {
    if (err.statusCode) return res.status(err.statusCode).json({ error: err.message, code: err.code });
    res.status(500).json({ error: err.message });
  }
}

module.exports = { listPublicWorkers, getPublicWorkerProfile };
