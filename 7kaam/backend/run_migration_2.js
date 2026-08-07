require('dotenv').config();
const { Pool } = require('pg');

if (!process.env.DIRECT_URL) {
  throw new Error('DIRECT_URL must be set in the environment (see backend/.env.example)');
}

// Consolidated migration: everything the live database is missing.
//
// This includes BOTH the original run_migration.js statements (which never
// actually applied — that script depends on a Supabase `exec_sql` RPC
// function that does not exist on this project, so it has been silently
// failing since it was written) AND the new backend-finalization additions
// (GPS discovery columns, recertification flags, the Report table).
//
// If this script can't reach Postgres directly (as in some sandboxed/CI
// environments — DIRECT_URL's port may be firewalled), copy the SQL below
// and run it in the Supabase Dashboard's SQL Editor instead, which always
// works regardless of network egress rules.
const SQL = `
  -- From the original (never-applied) run_migration.js:
  ALTER TABLE "TradeTest" ADD COLUMN IF NOT EXISTS "prerequisiteTestId" TEXT;
  ALTER TABLE "TradeTest" ADD COLUMN IF NOT EXISTS "difficulty" TEXT DEFAULT 'BEGINNER';
  ALTER TABLE "TradeTest" ADD COLUMN IF NOT EXISTS "isFirstTest" BOOLEAN DEFAULT false;

  ALTER TABLE "WorkHistory" ADD COLUMN IF NOT EXISTS "clientName" TEXT DEFAULT '';
  ALTER TABLE "WorkHistory" ADD COLUMN IF NOT EXISTS "clientType" TEXT DEFAULT 'HOUSEHOLD';
  ALTER TABLE "WorkHistory" ADD COLUMN IF NOT EXISTS "clientPhone" TEXT;
  ALTER TABLE "WorkHistory" ADD COLUMN IF NOT EXISTS "clientCity" TEXT DEFAULT '';
  ALTER TABLE "WorkHistory" ADD COLUMN IF NOT EXISTS "projectTitle" TEXT DEFAULT '';
  ALTER TABLE "WorkHistory" ADD COLUMN IF NOT EXISTS "projectDescription" TEXT DEFAULT '';
  ALTER TABLE "WorkHistory" ADD COLUMN IF NOT EXISTS "trade" TEXT DEFAULT 'ELECTRICIAN';
  ALTER TABLE "WorkHistory" ADD COLUMN IF NOT EXISTS "durationMonths" INT DEFAULT 0;
  ALTER TABLE "WorkHistory" ADD COLUMN IF NOT EXISTS "projectScale" TEXT DEFAULT 'SMALL';
  ALTER TABLE "WorkHistory" ADD COLUMN IF NOT EXISTS "photoUrls" TEXT[] DEFAULT ARRAY[]::TEXT[];
  ALTER TABLE "WorkHistory" ADD COLUMN IF NOT EXISTS "isVerified" BOOLEAN DEFAULT false;

  CREATE TABLE IF NOT EXISTS "SkillCertificate" (
    "id" TEXT PRIMARY KEY,
    "workerId" TEXT NOT NULL REFERENCES "Worker"("id"),
    "testId" TEXT NOT NULL REFERENCES "TradeTest"("id"),
    "testTitle" TEXT NOT NULL,
    "trade" TEXT NOT NULL,
    "category" TEXT NOT NULL DEFAULT 'General',
    "difficulty" TEXT NOT NULL DEFAULT 'BEGINNER',
    "score" DOUBLE PRECISION NOT NULL,
    "passingScore" INT NOT NULL DEFAULT 60,
    "issuedAt" TIMESTAMP DEFAULT NOW(),
    "pdfUrl" TEXT,
    "certificateNo" TEXT UNIQUE
  );

  CREATE TABLE IF NOT EXISTS "VideoAssessment" (
    "id" TEXT PRIMARY KEY,
    "workerId" TEXT NOT NULL REFERENCES "Worker"("id"),
    "testId" TEXT NOT NULL REFERENCES "TradeTest"("id"),
    "videoUrl" TEXT NOT NULL,
    "score" DOUBLE PRECISION,
    "rubricScores" JSONB,
    "feedback" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "attemptNumber" INT NOT NULL DEFAULT 1,
    "submittedAt" TIMESTAMP DEFAULT NOW(),
    "scoredAt" TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS "KaamCardHistory" (
    "id" TEXT PRIMARY KEY,
    "kaamCardId" TEXT NOT NULL REFERENCES "KaamCard"("id") ON DELETE CASCADE,
    "version" INT NOT NULL,
    "finalScore" DOUBLE PRECISION NOT NULL,
    "videoScore" DOUBLE PRECISION NOT NULL,
    "testScore" DOUBLE PRECISION NOT NULL,
    "workHistoryScore" DOUBLE PRECISION NOT NULL,
    "recordedAt" TIMESTAMP DEFAULT NOW()
  );

  -- New for backend finalization (7Kaam sync):
  ALTER TABLE "Worker" ADD COLUMN IF NOT EXISTS "latitude" DOUBLE PRECISION;
  ALTER TABLE "Worker" ADD COLUMN IF NOT EXISTS "longitude" DOUBLE PRECISION;
  ALTER TABLE "Worker" ADD COLUMN IF NOT EXISTS "underReview" BOOLEAN DEFAULT false;
  ALTER TABLE "Worker" ADD COLUMN IF NOT EXISTS "recertificationTestIds" TEXT[] DEFAULT ARRAY[]::TEXT[];
  ALTER TABLE "Worker" ADD COLUMN IF NOT EXISTS "recertificationReason" TEXT;

  CREATE TABLE IF NOT EXISTS "Report" (
    "id" TEXT PRIMARY KEY,
    "workerId" TEXT NOT NULL REFERENCES "Worker"("id"),
    "reporterCustomerId" TEXT NOT NULL REFERENCES "Customer"("id"),
    "reason" TEXT NOT NULL,
    "description" TEXT,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "createdAt" TIMESTAMP DEFAULT NOW()
  );
`;

async function runMigration() {
  console.log('Running consolidated SQL migration on Supabase Postgres...');
  const pool = new Pool({ connectionString: process.env.DIRECT_URL, ssl: { rejectUnauthorized: false } });
  try {
    await pool.query(SQL);
    console.log('✅ Migration applied successfully.');
  } finally {
    await pool.end();
  }
}

runMigration().catch((err) => {
  console.error('❌ Migration failed:', err.message);
  console.error('If this is a network/connection error, run the SQL in this file manually via the Supabase Dashboard → SQL Editor instead.');
  process.exit(1);
});
