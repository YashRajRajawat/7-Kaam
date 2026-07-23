-- 7 Kaam Seed Data
-- Run this in Supabase SQL Editor AFTER the schema SQL has been applied
-- Login credentials: admin@7kaam.in / Admin@7kaam

-- Admin
INSERT INTO "Admin" (id, email, "passwordHash", role, "createdAt")
VALUES (
  gen_random_uuid()::text,
  'admin@7kaam.in',
  '$2b$12$OeqreWKWmX6RzFbaRA/mSOPco.ccFip7YqSXfn/sC7ZlAXaFW/AeC',
  'SUPER_ADMIN',
  NOW()
) ON CONFLICT (email) DO NOTHING;

-- Store admin ID for later use
DO $$
DECLARE
  admin_id TEXT;
  worker1_id TEXT := 'worker-ravi-001';
  worker2_id TEXT := 'worker-sunita-001';
  worker3_id TEXT := 'worker-mohan-001';
BEGIN
  SELECT id INTO admin_id FROM "Admin" WHERE email = 'admin@7kaam.in';

  -- Trade Tests
  INSERT INTO "TradeTest" (id, trade, language, title, questions, "isActive", "createdBy", "createdAt")
  VALUES (
    'test-electrician-001',
    'ELECTRICIAN',
    'ENGLISH',
    'Electrician Safety Fundamentals',
    '[
      {"question":"What is the standard household voltage in India?","options":["110V AC","230V AC","440V AC","12V DC"],"correctAnswer":"230V AC"},
      {"question":"Which wire color indicates earth in Indian wiring?","options":["Red","Black","Green","Blue"],"correctAnswer":"Green"},
      {"question":"What does MCB stand for?","options":["Main Circuit Board","Miniature Circuit Breaker","Manual Control Box","Motor Control Box"],"correctAnswer":"Miniature Circuit Breaker"},
      {"question":"What is the safe maximum load for a 15A socket?","options":["1500W","2000W","3450W","5000W"],"correctAnswer":"3450W"},
      {"question":"Before working on a live panel, you should:","options":["Work quickly","Switch off the main breaker and use insulated tools","Wear rubber gloves only","Ask someone to watch"],"correctAnswer":"Switch off the main breaker and use insulated tools"}
    ]'::jsonb,
    true,
    admin_id,
    NOW()
  ) ON CONFLICT (id) DO NOTHING;

  INSERT INTO "TradeTest" (id, trade, language, title, questions, "isActive", "createdBy", "createdAt")
  VALUES (
    'test-plumber-001',
    'PLUMBER',
    'HINDI',
    'Plumbing Fundamentals (Hindi)',
    '[
      {"question":"पानी के पाइप में लीक को ठीक करने के लिए क्या उपयोग करते हैं?","options":["सीमेंट","PTFE टेप","फेविकोल","सिलिकॉन"],"correctAnswer":"PTFE टेप"},
      {"question":"पीवीसी पाइप को जोड़ने के लिए कौन सा केमिकल उपयोग होता है?","options":["एपॉक्सी","PVC सॉल्वेंट सीमेंट","फेनाइल","एसिड"],"correctAnswer":"PVC सॉल्वेंट सीमेंट"},
      {"question":"एक इंच पाइप की आंतरिक व्यास कितनी होती है?","options":["20 मिमी","25.4 मिमी","30 मिमी","32 मिमी"],"correctAnswer":"25.4 मिमी"},
      {"question":"पानी का प्रेशर नापने की इकाई क्या है?","options":["वॉट","एम्पीयर","PSI या बार","वोल्ट"],"correctAnswer":"PSI या बार"},
      {"question":"टॉयलेट फ्लश टैंक में पानी बंद न हो तो समस्या कहाँ हो सकती है?","options":["पाइप में","फ्लोट वाल्व में","टैंक में छेद","सीट में"],"correctAnswer":"फ्लोट वाल्व में"}
    ]'::jsonb,
    true,
    admin_id,
    NOW()
  ) ON CONFLICT (id) DO NOTHING;

  -- Workers
  INSERT INTO "Worker" (id, "aadhaarHash", "fullName", "phoneNumber", trade, city, locality,
    "videoScore", "videoScoredAt", "testScore", "testScoredAt", "workHistoryScore",
    "finalScore", tier, status, "aadhaarVerified", "kaamCardIssuedAt", "qrCodeUrl", "createdAt", "updatedAt")
  VALUES
  (
    worker1_id,
    'f15b2254ab4a18b04a04a9f98d4de39444b6a53621c7c10a5045655245900489',
    'Ravi Kumar', '+919876543210', 'ELECTRICIAN', 'Bangalore', 'Indiranagar',
    88, '2026-01-15', 86, '2026-01-16', 87.5, 87.0, 'EXPERT', 'ACTIVE', true,
    '2026-01-17', 'https://7kaam.in/verify/ravi-qr-token-001', NOW(), NOW()
  ),
  (
    worker2_id,
    '46ae55d3c095efb2c5c8ddef2090073016e96d82f509bf4e2ac1eb4b9dc1e762',
    'Sunita Patil', '+919876543211', 'PLUMBER', 'Bangalore', 'Koramangala',
    75, '2026-01-20', 70, '2026-01-21', 72.5, 72.0, 'GOLD', 'ACTIVE', true,
    '2026-01-22', 'https://7kaam.in/verify/sunita-qr-token-001', NOW(), NOW()
  ),
  (
    worker3_id,
    '19359079b53b16db8db58d6a318c0b0d9eb3792fff8091aef52f959423786fac',
    'Mohan Reddy', '+919876543212', 'CARPENTER', 'Bangalore', 'Whitefield',
    58, '2026-02-01', 44, '2026-02-02', 37.5, 48.0, 'SILVER', 'ACTIVE', false,
    '2026-02-03', 'https://7kaam.in/verify/mohan-qr-token-001', NOW(), NOW()
  )
  ON CONFLICT (id) DO NOTHING;

  -- Work Histories
  INSERT INTO "WorkHistory" (id, "workerId", "employerName", role, "startDate", "endDate", rating, verified, "createdAt")
  VALUES
  (gen_random_uuid()::text, worker1_id, 'Bangalore Electricals Pvt Ltd', 'Senior Electrician', '2022-03-01', '2024-12-31', 5, true, NOW()),
  (gen_random_uuid()::text, worker1_id, 'HomeServ India', 'Lead Technician', '2021-01-01', '2022-02-28', 4, true, NOW()),
  (gen_random_uuid()::text, worker2_id, 'PipeRight Contractors', 'Plumber', '2023-06-01', NULL, 4, true, NOW()),
  (gen_random_uuid()::text, worker2_id, 'AquaFix Services', 'Junior Plumber', '2021-08-01', '2023-05-31', 3, false, NOW()),
  (gen_random_uuid()::text, worker3_id, 'WoodCraft Interiors', 'Carpenter', '2024-01-01', NULL, 3, false, NOW());

  -- KaamCards
  INSERT INTO "KaamCard" (id, "workerId", "scoreBreakdown", "qrToken", "pdfUrl", version, "issuedAt", "expiresAt", "isRevoked")
  VALUES
  (
    'kc-ravi-001', worker1_id,
    '{"videoScore":88,"testScore":86,"workHistoryScore":87.5,"finalScore":87,"tier":"EXPERT"}'::jsonb,
    'ravi-qr-token-001', NULL, 1, '2026-01-17', '2027-01-17', false
  ),
  (
    'kc-sunita-001', worker2_id,
    '{"videoScore":75,"testScore":70,"workHistoryScore":72.5,"finalScore":72,"tier":"GOLD"}'::jsonb,
    'sunita-qr-token-001', NULL, 1, '2026-01-22', '2027-01-22', false
  ),
  (
    'kc-mohan-001', worker3_id,
    '{"videoScore":58,"testScore":44,"workHistoryScore":37.5,"finalScore":48,"tier":"SILVER"}'::jsonb,
    'mohan-qr-token-001', NULL, 1, '2026-02-03', '2027-02-03', false
  )
  ON CONFLICT (id) DO NOTHING;

  -- Scoring Logs (must supply id — TEXT NOT NULL with no default)
  INSERT INTO "ScoringLog" (id, "workerId", "signalType", "outputScore", "scoredAt", notes)
  VALUES
  (gen_random_uuid()::text, worker1_id, 'VIDEO',        88,   '2026-01-15', 'Mock CV model'),
  (gen_random_uuid()::text, worker1_id, 'TEST',         86,   '2026-01-16', 'Groq LLaMA 3'),
  (gen_random_uuid()::text, worker1_id, 'WORK_HISTORY', 87.5, '2026-01-16', '2 verified entries'),
  (gen_random_uuid()::text, worker1_id, 'FINAL',        87,   '2026-01-17', 'Tier: EXPERT'),
  (gen_random_uuid()::text, worker2_id, 'VIDEO',        75,   '2026-01-20', 'Mock CV model'),
  (gen_random_uuid()::text, worker2_id, 'TEST',         70,   '2026-01-21', 'Groq LLaMA 3'),
  (gen_random_uuid()::text, worker2_id, 'FINAL',        72,   '2026-01-22', 'Tier: GOLD'),
  (gen_random_uuid()::text, worker3_id, 'VIDEO',        58,   '2026-02-01', 'Mock CV model'),
  (gen_random_uuid()::text, worker3_id, 'TEST',         44,   '2026-02-02', 'Groq LLaMA 3'),
  (gen_random_uuid()::text, worker3_id, 'FINAL',        48,   '2026-02-03', 'Tier: SILVER');

  -- Test Submissions (must supply id — TEXT NOT NULL with no default)
  INSERT INTO "TestSubmission" (id, "workerId", "testId", answers, "rawScore", status, "aiEvaluation", "submittedAt")
  VALUES
  (
    gen_random_uuid()::text,
    worker1_id, 'test-electrician-001',
    '["230V AC","Green","Miniature Circuit Breaker","3450W","Switch off the main breaker and use insulated tools"]'::jsonb,
    86, 'COMPLETED',
    '{"totalScore":86,"overallFeedback":"Excellent knowledge of electrical safety fundamentals.","breakdown":[]}'::jsonb,
    '2026-01-16'
  ),
  (
    gen_random_uuid()::text,
    worker2_id, 'test-plumber-001',
    '["PTFE टेप","PVC सॉल्वेंट सीमेंट","25.4 मिमी","PSI या बार","फ्लोट वाल्व में"]'::jsonb,
    70, 'COMPLETED',
    '{"totalScore":70,"overallFeedback":"Good understanding of plumbing basics.","breakdown":[]}'::jsonb,
    '2026-01-21'
  );

END $$;

-- Verify
SELECT 'Admin count' AS check, COUNT(*) FROM "Admin"
UNION ALL SELECT 'Worker count', COUNT(*) FROM "Worker"
UNION ALL SELECT 'Test count', COUNT(*) FROM "TradeTest"
UNION ALL SELECT 'KaamCard count', COUNT(*) FROM "KaamCard"
UNION ALL SELECT 'ScoringLog count', COUNT(*) FROM "ScoringLog";
