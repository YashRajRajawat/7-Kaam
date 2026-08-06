require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL || 'https://qywflwdkrckyjdrsadvo.supabase.co',
  process.env.SUPABASE_SERVICE_KEY || 'sb_secret_xJD9ZgF8dZfnGalPdIp05Q_JB_q_wJN'
);

async function runMigration() {
  console.log('Running SQL Migration on Supabase...');
  const sql = `
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
      "workerId" TEXT NOT NULL,
      "testId" TEXT NOT NULL,
      "testTitle" TEXT NOT NULL,
      "trade" TEXT NOT NULL,
      "score" DOUBLE PRECISION NOT NULL,
      "issuedAt" TIMESTAMP DEFAULT NOW(),
      "pdfUrl" TEXT
    );

    CREATE TABLE IF NOT EXISTS "KaamCardHistory" (
      "id" TEXT PRIMARY KEY,
      "kaamCardId" TEXT NOT NULL,
      "version" INT NOT NULL,
      "finalScore" DOUBLE PRECISION NOT NULL,
      "videoScore" DOUBLE PRECISION NOT NULL,
      "testScore" DOUBLE PRECISION NOT NULL,
      "workHistoryScore" DOUBLE PRECISION NOT NULL,
      "recordedAt" TIMESTAMP DEFAULT NOW()
    );

    NOTIFY pgrst, 'reload schema';
  `;

  const { data, error } = await supabase.rpc('exec_sql', { sql });
  if (error) {
    console.log('RPC exec_sql error (or function not existing):', error.message);
  } else {
    console.log('✅ Migration SQL executed successfully:', data);
  }
}

runMigration().catch(console.error);
