const prisma = require('../utils/prisma');
const { PUBLIC_DIRECTORY, SELF_SIGNUP, isClaimable, isSuppressed } = require('../utils/listing');

const VALID_CLAIM_STATUSES = ['UNCLAIMED', 'CLAIM_PENDING', 'CLAIMED'];
const VALID_REQUEST_TYPES = ['CLAIM', 'REMOVAL'];

// ── Per-listing rate limit — 5 requests per hour per :id ──────────────────────
// The route-level express-rate-limit in routes/public.js covers the IP axis;
// this covers the :id axis so one listing cannot be hammered from a botnet.
const RATE_WINDOW_MS = 60 * 60 * 1000;
const RATE_MAX = 5;
const _requestsById = new Map();

function rateLimitById(id) {
  const now = Date.now();
  const hits = (_requestsById.get(id) || []).filter((t) => now - t < RATE_WINDOW_MS);
  if (hits.length >= RATE_MAX) return false;
  hits.push(now);
  _requestsById.set(id, hits);
  // Opportunistic sweep so the map cannot grow without bound.
  if (_requestsById.size > 5000) {
    for (const [k, v] of _requestsById) {
      if (!v.some((t) => now - t < RATE_WINDOW_MS)) _requestsById.delete(k);
    }
  }
  return true;
}

function httpError(message, statusCode, code) {
  const e = new Error(message);
  e.statusCode = statusCode;
  e.code = code;
  return e;
}

/**
 * Write to Worker and PROVE the write landed (critique B2 — BLOCKER).
 *
 * src/utils/prisma.js is a hand-written Supabase PostgREST proxy, not Prisma.
 * On "Could not find the '<col>' column" it DELETES that column from the
 * payload and retries (src/utils/prisma.js:277-282). So a resolved update()
 * does NOT prove anything was written: if PostgREST's schema cache is stale for
 * `suppressedAt`, the column is silently stripped, the retry succeeds, and a
 * naive handler returns 202 {status:'REMOVED'} while the row is untouched and
 * still public. That is a DPDP opt-out that lies.
 *
 * So: read the row back and assert each field actually changed. 500 loudly if
 * not — never report success for a write that did nothing.
 */
async function updateWorkerAndVerify(id, data, expectations, context) {
  const updated = await prisma.worker.update({ where: { id }, data });
  if (!updated) throw httpError('Worker not found', 404, 'NOT_FOUND');

  const readBack = await prisma.worker.findUnique({ where: { id } });
  if (!readBack) throw httpError('Worker not found', 404, 'NOT_FOUND');

  for (const [field, predicate] of Object.entries(expectations)) {
    if (!predicate(readBack[field])) {
      throw httpError(
        `${context} did NOT persist: "${field}" read back as ${JSON.stringify(readBack[field] ?? null)}. ` +
          'The PostgREST schema cache is probably stale for this column — run ' +
          "NOTIFY pgrst, 'reload schema'; and retry. Nothing was changed.",
        500,
        'WRITE_NOT_PERSISTED'
      );
    }
  }
  return readBack;
}

function requireNonEmptyString(value, field) {
  if (typeof value !== 'string' || !value.trim()) {
    throw httpError(`${field} is required`, 400, 'INVALID_BODY');
  }
  return value.trim();
}

// POST /api/v1/public/workers/:id/listing-request   (authenticateOptional)
// Body: { type: 'CLAIM' | 'REMOVAL', contactName, contactPhone, note? }
async function submitListingRequest(req, res) {
  try {
    const { id } = req.params;
    const { type, contactName, contactPhone, note } = req.body || {};

    if (!VALID_REQUEST_TYPES.includes(type)) {
      return res.status(400).json({ error: `type must be one of ${VALID_REQUEST_TYPES.join(', ')}` });
    }
    const name = requireNonEmptyString(contactName, 'contactName');
    requireNonEmptyString(contactPhone, 'contactPhone');
    const cleanNote = typeof note === 'string' ? note.trim().slice(0, 500) : '';

    if (!rateLimitById(id)) {
      return res.status(429).json({
        error: 'Too many requests for this listing — please try again later.',
        code: 'RATE_LIMITED',
      });
    }

    const worker = await prisma.worker.findUnique({ where: { id } });
    if (!worker) return res.status(404).json({ error: 'Worker not found' });

    if ((worker.listingSource ?? SELF_SIGNUP) !== PUBLIC_DIRECTORY) {
      return res.status(409).json({
        error: 'This profile was created by its owner — there is nothing to claim or remove',
        code: 'NOT_A_DIRECTORY_LISTING',
      });
    }

    if (type === 'REMOVAL') {
      // Idempotent: an already-suppressed listing is already gone.
      if (isSuppressed(worker)) return res.status(202).json({ status: 'REMOVED' });

      // Honoured immediately, not queued for review. For a person who never
      // consented to being listed, "we'll get to it" is not acceptable. The row
      // is retained (suppressed, not deleted) so a re-import cannot resurrect it.
      await updateWorkerAndVerify(
        id,
        {
          suppressedAt: new Date().toISOString(),
          suppressionReason: 'OWNER_REQUEST: ' + (cleanNote || 'no reason given'),
        },
        { suppressedAt: (v) => v != null },
        'Listing removal'
      );
      console.log(`[listing-request] REMOVAL honoured workerId=${id} contactName=${name}`);
      return res.status(202).json({ status: 'REMOVED' });
    }

    // type === 'CLAIM'
    if (!isClaimable(worker)) {
      return res.status(409).json({
        error: 'This listing is not claimable',
        code: 'NOT_CLAIMABLE',
        claimStatus: worker.claimStatus ?? 'CLAIMED',
      });
    }

    // Records the assertion only. Grants nothing — no credential, no score, no
    // change to what is rendered. An admin confirms via PATCH /workers/:id/claim-status.
    await updateWorkerAndVerify(
      id,
      { claimStatus: 'CLAIM_PENDING', claimRequestedAt: new Date().toISOString() },
      { claimStatus: (v) => v === 'CLAIM_PENDING' },
      'Claim request'
    );
    console.log(`[listing-request] CLAIM recorded workerId=${id} contactName=${name} (contact phone withheld from logs)`);
    return res.status(202).json({ status: 'CLAIM_PENDING' });
  } catch (err) {
    if (err.statusCode) return res.status(err.statusCode).json({ error: err.message, code: err.code });
    res.status(500).json({ error: err.message });
  }
}

// POST /api/v1/workers/:id/suppress   (admin only)
// Critique D9: without this an admin "removing" a listing only flips status to
// SUSPENDED, `suppressedAt` stays NULL, and the next import run resurrects the
// row (the importer's ON CONFLICT guard only checks `suppressedAt IS NULL`).
async function suppressListing(req, res) {
  try {
    const { id } = req.params;
    const { reason } = req.body || {};
    const cleanReason = typeof reason === 'string' ? reason.trim().slice(0, 500) : '';

    const worker = await prisma.worker.findUnique({ where: { id } });
    if (!worker) return res.status(404).json({ error: 'Worker not found' });

    if (isSuppressed(worker)) {
      return res.json({
        message: 'Listing already suppressed',
        workerId: id,
        suppressedAt: worker.suppressedAt,
        suppressionReason: worker.suppressionReason ?? null,
      });
    }

    const readBack = await updateWorkerAndVerify(
      id,
      {
        suppressedAt: new Date().toISOString(),
        suppressionReason: 'ADMIN_REMOVAL: ' + (cleanReason || 'no reason given'),
      },
      { suppressedAt: (v) => v != null },
      'Listing suppression'
    );

    res.json({
      message: 'Listing suppressed — excluded from every public read and never re-imported',
      workerId: id,
      suppressedAt: readBack.suppressedAt,
      suppressionReason: readBack.suppressionReason,
    });
  } catch (err) {
    if (err.statusCode) return res.status(err.statusCode).json({ error: err.message, code: err.code });
    res.status(500).json({ error: err.message });
  }
}

// PATCH /api/v1/workers/:id/claim-status   (admin only)
// Provenance and claim state are not casually PATCHable through updateWorker's
// `allowed` list (§D.8) — they move only through this admin-guarded route.
async function updateClaimStatus(req, res) {
  try {
    const { id } = req.params;
    const { claimStatus } = req.body || {};

    if (!VALID_CLAIM_STATUSES.includes(claimStatus)) {
      return res.status(400).json({ error: `claimStatus must be one of ${VALID_CLAIM_STATUSES.join(', ')}` });
    }

    const worker = await prisma.worker.findUnique({ where: { id } });
    if (!worker) return res.status(404).json({ error: 'Worker not found' });

    if ((worker.listingSource ?? SELF_SIGNUP) !== PUBLIC_DIRECTORY) {
      return res.status(409).json({
        error: 'Only public-directory listings have a claim status',
        code: 'NOT_A_DIRECTORY_LISTING',
      });
    }

    const data = { claimStatus };
    if (claimStatus === 'CLAIMED') data.claimedAt = new Date().toISOString();

    const readBack = await updateWorkerAndVerify(
      id,
      data,
      { claimStatus: (v) => v === claimStatus },
      'Claim-status change'
    );

    res.json({
      message: `Claim status set to ${claimStatus}`,
      workerId: id,
      claimStatus: readBack.claimStatus,
      claimedAt: readBack.claimedAt ?? null,
      claimRequestedAt: readBack.claimRequestedAt ?? null,
    });
  } catch (err) {
    if (err.statusCode) return res.status(err.statusCode).json({ error: err.message, code: err.code });
    res.status(500).json({ error: err.message });
  }
}

module.exports = { submitListingRequest, suppressListing, updateClaimStatus };
