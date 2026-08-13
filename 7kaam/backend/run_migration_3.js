require('dotenv').config();
const { Pool } = require('pg');

if (!process.env.DIRECT_URL) {
  throw new Error('DIRECT_URL must be set in the environment (see backend/.env.example)');
}

// Migration 3: unclaimed public-directory listings.
//
// Adds provenance + claim-state columns to "Worker" so that a row imported
// from a public business directory (Google Maps) can be stored, rendered and
// claimed WITHOUT ever being mistaken for a verified 7 Kaam worker.
//
// The rows this enables are REAL, NAMED businesses that never consented to
// being on 7 Kaam and have never been verified. The single most important
// statement in this file is the CHECK constraint
// Worker_unclaimed_has_no_trust_data (step 5): it makes it physically
// impossible for any code path — including the ones that today do
// `worker.videoScore ?? 0` or `finalScore || 80` — to write a score, a tier,
// a KaamCard URL or aadhaarVerified = true onto an unclaimed listing. The
// transaction dies with a named constraint error instead. Application-layer
// guards can be bypassed by one careless call; this cannot.
//
// Design notes for whoever reads this next:
//   * listingSource / claimStatus are TEXT + CHECK, NOT Postgres enums. An
//     enum would need CREATE TYPE / ALTER TYPE, a Prisma enum mirror, a
//     PostgREST cache reload and a Dart/TS union update in lockstep. TEXT +
//     CHECK gives identical write-time safety and is trivially idempotent.
//     NO enum is created or altered by this migration, on purpose. Do not
//     "upgrade" these to enums, and do NOT add an UNCLAIMED value to
//     "WorkerStatus" — imports are status = 'ACTIVE' with provenance flags,
//     because publicController gates on status === 'ACTIVE' and because
//     lifecycle and provenance are orthogonal axes.
//   * There is no isClaimed boolean. claimStatus has three states and a
//     parallel boolean would be a second source of truth that drifts. The
//     boolean the UI wants (isUnclaimed) is derived in the API layer only.
//   * There is deliberately no rating / reviewCount / externalRating column.
//     A trust-shaped number sitting one row above finalScore is a permanent
//     magnet for exactly the mistake this whole feature must avoid.
//   * Step 6 adds Worker_selfsignup_requires_aadhaarHash as NOT VALID: it is
//     NOT retro-checked against legacy rows but it IS enforced on every future
//     INSERT/UPDATE. Any new self-signup write that omits aadhaarHash will now
//     hard-fail at the database with that constraint name. That is intended —
//     it is not a bug to be debugged away. Run
//       ALTER TABLE "Worker" VALIDATE CONSTRAINT "Worker_selfsignup_requires_aadhaarHash";
//     manually once you have confirmed no legacy row violates it.
//
// If this script can't reach Postgres directly (as in some sandboxed/CI
// environments — DIRECT_URL's port may be firewalled), copy the SQL below and
// run it in the Supabase Dashboard's SQL Editor instead, which always works
// regardless of network egress rules. The SQL is standalone and idempotent:
// it is safe to paste, safe to re-run, and safe to run twice.
const SQL = `
  -- ── 7 Kaam migration 3: unclaimed public-directory listings ───────────────
  -- Idempotent. Safe to re-run. Safe to paste into the Supabase SQL Editor.

  -- 0. Fresh-install safety net -------------------------------------------
  --    prisma/schema.sql's CREATE TABLE "Worker" predates run_migration_2.js
  --    and is still missing these five columns, so a database built from
  --    schema.sql alone does not match a migrated one — and the directory
  --    importer writes latitude/longitude/underReview. Re-asserting them here
  --    (no-ops if run_migration_2.js already ran) means this migration cannot
  --    be defeated by install order. Definitions are byte-identical to
  --    run_migration_2.js:79-83.
  ALTER TABLE "Worker" ADD COLUMN IF NOT EXISTS "latitude" DOUBLE PRECISION;
  ALTER TABLE "Worker" ADD COLUMN IF NOT EXISTS "longitude" DOUBLE PRECISION;
  ALTER TABLE "Worker" ADD COLUMN IF NOT EXISTS "underReview" BOOLEAN DEFAULT false;
  ALTER TABLE "Worker" ADD COLUMN IF NOT EXISTS "recertificationTestIds" TEXT[] DEFAULT ARRAY[]::TEXT[];
  ALTER TABLE "Worker" ADD COLUMN IF NOT EXISTS "recertificationReason" TEXT;

  -- 1. Provenance / claim columns -------------------------------------------
  ALTER TABLE "Worker" ADD COLUMN IF NOT EXISTS "listingSource"     TEXT NOT NULL DEFAULT 'SELF_SIGNUP';
  ALTER TABLE "Worker" ADD COLUMN IF NOT EXISTS "claimStatus"       TEXT NOT NULL DEFAULT 'CLAIMED';
  ALTER TABLE "Worker" ADD COLUMN IF NOT EXISTS "sourceName"        TEXT;
  ALTER TABLE "Worker" ADD COLUMN IF NOT EXISTS "sourceRef"         TEXT;
  ALTER TABLE "Worker" ADD COLUMN IF NOT EXISTS "sourceUrl"         TEXT;
  ALTER TABLE "Worker" ADD COLUMN IF NOT EXISTS "sourceAddress"     TEXT;
  ALTER TABLE "Worker" ADD COLUMN IF NOT EXISTS "importBatchId"     TEXT;
  ALTER TABLE "Worker" ADD COLUMN IF NOT EXISTS "importedAt"        TIMESTAMP(3);
  ALTER TABLE "Worker" ADD COLUMN IF NOT EXISTS "claimRequestedAt"  TIMESTAMP(3);
  ALTER TABLE "Worker" ADD COLUMN IF NOT EXISTS "claimedAt"         TIMESTAMP(3);
  ALTER TABLE "Worker" ADD COLUMN IF NOT EXISTS "suppressedAt"      TIMESTAMP(3);
  ALTER TABLE "Worker" ADD COLUMN IF NOT EXISTS "suppressionReason" TEXT;
  ALTER TABLE "Worker" ADD COLUMN IF NOT EXISTS "tradeInferred"     BOOLEAN NOT NULL DEFAULT false;

  -- 2. Backfill existing rows so current behaviour is unchanged --------------
  --    ADD COLUMN ... DEFAULT already backfills on PG 11+, so on a clean run
  --    these UPDATEs touch 0 rows. They exist for the partial-run case: if an
  --    earlier attempt added a column WITHOUT its default, ADD COLUMN IF NOT
  --    EXISTS skips it silently and the rows would keep NULLs. Every worker
  --    that exists today signed themselves up and owns their own record, so
  --    SELF_SIGNUP / CLAIMED is the correct and only backfill value.
  UPDATE "Worker" SET "listingSource" = 'SELF_SIGNUP' WHERE "listingSource" IS NULL;
  UPDATE "Worker" SET "claimStatus"   = 'CLAIMED'     WHERE "claimStatus"   IS NULL;
  UPDATE "Worker" SET "tradeInferred" = false         WHERE "tradeInferred" IS NULL;

  ALTER TABLE "Worker" ALTER COLUMN "listingSource" SET DEFAULT 'SELF_SIGNUP';
  ALTER TABLE "Worker" ALTER COLUMN "claimStatus"   SET DEFAULT 'CLAIMED';
  ALTER TABLE "Worker" ALTER COLUMN "tradeInferred" SET DEFAULT false;
  ALTER TABLE "Worker" ALTER COLUMN "listingSource" SET NOT NULL;
  ALTER TABLE "Worker" ALTER COLUMN "claimStatus"   SET NOT NULL;
  ALTER TABLE "Worker" ALTER COLUMN "tradeInferred" SET NOT NULL;

  -- 3. aadhaarHash becomes nullable (imports carry no Aadhaar) ---------------
  --    DROP NOT NULL is already idempotent; the guard just makes that explicit
  --    and keeps the statement a no-op on a re-run.
  DO $$ BEGIN
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'Worker'
        AND column_name = 'aadhaarHash' AND is_nullable = 'NO'
    ) THEN
      ALTER TABLE "Worker" ALTER COLUMN "aadhaarHash" DROP NOT NULL;
    END IF;
  END $$;

  -- 4. Value-domain guards ---------------------------------------------------
  DO $$ BEGIN
    ALTER TABLE "Worker" ADD CONSTRAINT "Worker_listingSource_check"
      CHECK ("listingSource" IN ('SELF_SIGNUP','PUBLIC_DIRECTORY'));
  EXCEPTION WHEN duplicate_object THEN NULL; END $$;

  DO $$ BEGIN
    ALTER TABLE "Worker" ADD CONSTRAINT "Worker_claimStatus_check"
      CHECK ("claimStatus" IN ('UNCLAIMED','CLAIM_PENDING','CLAIMED'));
  EXCEPTION WHEN duplicate_object THEN NULL; END $$;

  -- 5. THE SAFETY CONSTRAINT: an unclaimed listing can never hold trust data --
  DO $$ BEGIN
    ALTER TABLE "Worker" ADD CONSTRAINT "Worker_unclaimed_has_no_trust_data" CHECK (
      "listingSource" <> 'PUBLIC_DIRECTORY'
      OR "claimStatus" = 'CLAIMED'
      OR ( "videoScore"       IS NULL
       AND "testScore"        IS NULL
       AND "workHistoryScore" IS NULL
       AND "finalScore"       IS NULL
       AND "tier"             IS NULL
       AND "kaamCardUrl"      IS NULL
       AND "qrCodeUrl"        IS NULL
       AND "kaamCardIssuedAt" IS NULL
       AND "aadhaarVerified"  = false )
    );
  EXCEPTION WHEN duplicate_object THEN NULL; END $$;

  -- 6. Self-signup rows must still carry an Aadhaar hash (future writes only) -
  DO $$ BEGIN
    ALTER TABLE "Worker" ADD CONSTRAINT "Worker_selfsignup_requires_aadhaarHash"
      CHECK ("listingSource" <> 'SELF_SIGNUP' OR "aadhaarHash" IS NOT NULL) NOT VALID;
  EXCEPTION WHEN duplicate_object THEN NULL; END $$;

  -- 7. Indexes ---------------------------------------------------------------
  --    The partial unique index on sourceRef is the second idempotency
  --    backstop behind the importer's deterministic primary key.
  CREATE UNIQUE INDEX IF NOT EXISTS "Worker_sourceRef_key"
    ON "Worker"("sourceRef") WHERE "sourceRef" IS NOT NULL;
  CREATE INDEX IF NOT EXISTS "Worker_listingSource_claimStatus_idx"
    ON "Worker"("listingSource","claimStatus");
  CREATE INDEX IF NOT EXISTS "Worker_importBatchId_idx"
    ON "Worker"("importBatchId") WHERE "importBatchId" IS NOT NULL;

  -- 8. MANDATORY: make the new columns visible to PostgREST -------------------
  --    Without this, src/utils/prisma.js SILENTLY STRIPS the new columns
  --    (see src/utils/prisma.js:254-261) and imports look like normal workers.
  NOTIFY pgrst, 'reload schema';
`;

const EXPECTED_COLUMNS = [
  'listingSource', 'claimStatus', 'sourceName', 'sourceRef', 'sourceUrl', 'sourceAddress',
  'importBatchId', 'importedAt', 'claimRequestedAt', 'claimedAt', 'suppressedAt',
  'suppressionReason', 'tradeInferred', 'aadhaarHash',
];

const EXPECTED_CONSTRAINTS = [
  'Worker_listingSource_check',
  'Worker_claimStatus_check',
  'Worker_unclaimed_has_no_trust_data',
  'Worker_selfsignup_requires_aadhaarHash',
];

const EXPECTED_INDEXES = [
  'Worker_sourceRef_key',
  'Worker_listingSource_claimStatus_idx',
  'Worker_importBatchId_idx',
];

async function verify(pool) {
  let ok = true;
  const fail = (msg) => { ok = false; console.error('   ✗ ' + msg); };

  const cols = await pool.query(
    `SELECT column_name, data_type, is_nullable, column_default
       FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'Worker'
        AND column_name = ANY($1::text[])
      ORDER BY column_name`,
    [EXPECTED_COLUMNS]
  );
  const found = cols.rows.map((r) => r.column_name);
  const missing = EXPECTED_COLUMNS.filter((c) => !found.includes(c));
  if (missing.length) fail('missing columns: ' + missing.join(', '));
  else console.log(`   ✓ ${found.length}/14 columns present`);

  const aadhaar = cols.rows.find((r) => r.column_name === 'aadhaarHash');
  if (!aadhaar || aadhaar.is_nullable !== 'YES') fail('aadhaarHash is still NOT NULL');
  else console.log('   ✓ aadhaarHash is nullable');

  const cons = await pool.query(
    `SELECT conname FROM pg_constraint
      WHERE conrelid = '"Worker"'::regclass AND conname = ANY($1::text[])`,
    [EXPECTED_CONSTRAINTS]
  );
  const conNames = cons.rows.map((r) => r.conname);
  const missingCons = EXPECTED_CONSTRAINTS.filter((c) => !conNames.includes(c));
  if (missingCons.length) fail('missing constraints: ' + missingCons.join(', '));
  else console.log('   ✓ 4/4 constraints present (incl. Worker_unclaimed_has_no_trust_data)');

  const idx = await pool.query(
    `SELECT indexname FROM pg_indexes
      WHERE schemaname = 'public' AND tablename = 'Worker' AND indexname = ANY($1::text[])`,
    [EXPECTED_INDEXES]
  );
  const idxNames = idx.rows.map((r) => r.indexname);
  const missingIdx = EXPECTED_INDEXES.filter((i) => !idxNames.includes(i));
  if (missingIdx.length) fail('missing indexes: ' + missingIdx.join(', '));
  else console.log('   ✓ 3/3 indexes present');

  const backfill = await pool.query(
    `SELECT "listingSource", "claimStatus", count(*)::int AS n
       FROM "Worker" GROUP BY 1, 2 ORDER BY 1, 2`
  );
  console.log('   • existing rows by provenance:');
  for (const r of backfill.rows) {
    console.log(`       ${r.listingSource} / ${r.claimStatus} : ${r.n}`);
  }
  const nullProvenance = await pool.query(
    `SELECT count(*)::int AS n FROM "Worker"
      WHERE "listingSource" IS NULL OR "claimStatus" IS NULL OR "tradeInferred" IS NULL`
  );
  if (nullProvenance.rows[0].n !== 0) fail(`${nullProvenance.rows[0].n} rows have NULL provenance columns`);
  else console.log('   ✓ no row has NULL listingSource / claimStatus / tradeInferred');

  // The whole point of the feature, asserted directly against the data.
  const leak = await pool.query(
    `SELECT count(*)::int AS n FROM "Worker"
      WHERE "listingSource" = 'PUBLIC_DIRECTORY'
        AND ("finalScore" IS NOT NULL OR "tier" IS NOT NULL OR "aadhaarVerified" = true)`
  );
  if (leak.rows[0].n !== 0) fail(`${leak.rows[0].n} public-directory rows carry a score/tier/aadhaarVerified`);
  else console.log('   ✓ 0 public-directory rows carry a score, tier or aadhaarVerified');

  return ok;
}

async function runMigration() {
  console.log('⏳ Running migration 3 (unclaimed public-directory listings) on Supabase Postgres...');
  const pool = new Pool({ connectionString: process.env.DIRECT_URL, ssl: { rejectUnauthorized: false } });
  try {
    await pool.query(SQL);
    console.log('✅ Migration applied successfully.');
    console.log('⏳ Verifying...');
    const ok = await verify(pool);
    if (!ok) {
      console.error('❌ Verification FAILED — do not run the importer until this is resolved.');
      process.exitCode = 1;
      return;
    }
    console.log('✅ Verification passed.');
    console.log('   Next: confirm PostgREST sees the new columns before importing —');
    console.log('   node -e "require(\'./src/utils/prisma\').worker.findMany({take:1}).then(r=>console.log(\'listingSource\' in (r[0]||{}) ? \'OK: PostgREST sees the column\' : \'FAIL: run NOTIFY pgrst again\'))"');
  } finally {
    await pool.end();
  }
}

runMigration().catch((err) => {
  console.error('❌ Migration failed:', err.message);
  if (err.constraint) console.error('   violated constraint:', err.constraint);
  console.error('If this is a network/connection error, run the SQL in this file manually via the Supabase Dashboard → SQL Editor instead.');
  process.exit(1);
});
