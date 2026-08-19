require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

// Asset URLs come from the environment so no project URL is committed.
const SUPABASE_URL = process.env.SUPABASE_URL || '<configure SUPABASE_URL in .env>';

function hashAadhaar(aadhaar) {
  return crypto.createHash('sha256').update(aadhaar).digest('hex');
}

async function main() {
  console.log('🌱 Seeding 7 Kaam database...');

  // ── Super Admin ──────────────────────────────────────────────────────────────
  const passwordHash = await bcrypt.hash('Admin@7kaam', 12);
  const admin = await prisma.admin.upsert({
    where: { email: 'admin@7kaam.in' },
    update: {},
    create: { email: 'admin@7kaam.in', passwordHash, role: 'SUPER_ADMIN' },
  });
  console.log('✅ Admin created:', admin.email);

  // ── Trade Tests ──────────────────────────────────────────────────────────────
  // Electrician Tests (Beginner, Intermediate, Advanced)
  const testElec1 = await prisma.tradeTest.upsert({
    where: { id: 'test-electrician-001' },
    update: { difficulty: 'BEGINNER', isFirstTest: true },
    create: {
      id: 'test-electrician-001',
      trade: 'ELECTRICIAN',
      language: 'ENGLISH',
      title: 'Electrical Safety Fundamentals',
      difficulty: 'BEGINNER',
      isFirstTest: true,
      createdBy: admin.id,
      questions: [
        { question: 'What is the standard household voltage in India?', correctAnswer: '230V AC', options: ['110V AC', '230V AC', '440V AC', '12V DC'] },
        { question: 'Which wire color indicates earth in Indian wiring?', correctAnswer: 'Green', options: ['Red', 'Black', 'Green', 'Blue'] },
        { question: 'What does MCB stand for?', correctAnswer: 'Miniature Circuit Breaker', options: ['Main Circuit Board', 'Miniature Circuit Breaker', 'Manual Control Box', 'Motor Control Box'] },
        { question: 'What is the safe maximum load for a 15A socket?', correctAnswer: '3450W', options: ['1500W', '2000W', '3450W', '5000W'] },
        { question: 'Before working on a live panel, you should:', correctAnswer: 'Switch off the main breaker and use insulated tools', options: ['Work quickly', 'Switch off the main breaker and use insulated tools', 'Wear rubber gloves only', 'Ask someone to watch'] },
      ],
    },
  });

  const testElec2 = await prisma.tradeTest.upsert({
    where: { id: 'test-electrician-002' },
    update: { difficulty: 'INTERMEDIATE', prerequisiteTestId: 'test-electrician-001', isFirstTest: false },
    create: {
      id: 'test-electrician-002',
      trade: 'ELECTRICIAN',
      language: 'ENGLISH',
      title: 'Wiring & Circuit Installation',
      difficulty: 'INTERMEDIATE',
      isFirstTest: false,
      prerequisiteTestId: 'test-electrician-001',
      createdBy: admin.id,
      questions: [
        { question: 'What size wire is recommended for a 1.5 Ton Split AC?', correctAnswer: '4.0 sq mm copper', options: ['1.5 sq mm copper', '2.5 sq mm copper', '4.0 sq mm copper', '6.0 sq mm copper'] },
        { question: 'An RCD/ELCB protects primarily against:', correctAnswer: 'Earth leakage & electric shock', options: ['Overload', 'Short circuit', 'Earth leakage & electric shock', 'Voltage spikes'] },
        { question: 'In a 3-phase supply, what is the phase-to-phase voltage?', correctAnswer: '415V AC', options: ['230V AC', '415V AC', '440V AC', '500V AC'] },
        { question: 'What tool measures electrical continuity and resistance?', correctAnswer: 'Multimeter / Megger', options: ['Tester pen', 'Multimeter / Megger', 'Wire stripper', 'Crimp tool'] },
        { question: 'Proper earthing resistance for residential installations should be below:', correctAnswer: '5 Ohms', options: ['5 Ohms', '25 Ohms', '50 Ohms', '100 Ohms'] },
      ],
    },
  });

  const testElec3 = await prisma.tradeTest.upsert({
    where: { id: 'test-electrician-003' },
    update: { difficulty: 'ADVANCED', prerequisiteTestId: 'test-electrician-002', isFirstTest: false },
    create: {
      id: 'test-electrician-003',
      trade: 'ELECTRICIAN',
      language: 'ENGLISH',
      title: 'High Voltage & Industrial Automation',
      difficulty: 'ADVANCED',
      isFirstTest: false,
      prerequisiteTestId: 'test-electrician-002',
      createdBy: admin.id,
      questions: [
        { question: 'What type of starter is used for heavy 3-phase induction motors above 5HP?', correctAnswer: 'Star-Delta Starter', options: ['DOL Starter', 'Star-Delta Starter', 'Auto-Transformer Starter', 'Direct Plug'] },
        { question: 'What is the purpose of a capacitor bank in industrial panels?', correctAnswer: 'Power Factor Correction', options: ['Voltage Boosting', 'Power Factor Correction', 'Current Limiting', 'Phase Conversion'] },
        { question: 'Which instrument is used to test high voltage insulation resistance?', correctAnswer: 'Megger (Insulation Tester)', options: ['Clamp Meter', 'Megger (Insulation Tester)', 'Tachometer', 'Lux Meter'] },
        { question: 'In a 3-phase DB board, color coding for phases (RYB) stands for:', correctAnswer: 'Red, Yellow, Blue', options: ['Red, Yellow, Blue', 'Red, Yellow, Black', 'Red, White, Blue', 'Red, Green, Blue'] },
        { question: 'What safety relay prevents single phasing in 3-phase motors?', correctAnswer: 'Single Phase Preventer (SPP)', options: ['Overload Relay', 'Single Phase Preventer (SPP)', 'Thermal Relay', 'Time Delay Relay'] },
      ],
    },
  });

  // Plumber Tests
  const testPlumb1 = await prisma.tradeTest.upsert({
    where: { id: 'test-plumber-001' },
    update: { difficulty: 'BEGINNER', isFirstTest: true },
    create: {
      id: 'test-plumber-001',
      trade: 'PLUMBER',
      language: 'HINDI',
      title: 'Plumbing Fundamentals (Hindi)',
      difficulty: 'BEGINNER',
      isFirstTest: true,
      createdBy: admin.id,
      questions: [
        { question: 'पानी के पाइप में लीक को ठीक करने के लिए क्या उपयोग करते हैं?', correctAnswer: 'PTFE टेप', options: ['सीमेंट', 'PTFE टेप', 'फेविकोल', 'सिलिकॉन'] },
        { question: 'पीवीसी पाइप को जोड़ने के लिए कौन सा केमिकल उपयोग होता है?', correctAnswer: 'PVC सॉल्वेंट सीमेंट', options: ['एपॉक्सी', 'PVC सॉल्वेंट सीमेंट', 'फेनाइल', 'एसिड'] },
        { question: 'एक इंच पाइप की आंतरिक व्यास कितनी होती है?', correctAnswer: '25.4 मिमी', options: ['20 मिमी', '25.4 मिमी', '30 मिमी', '32 मिमी'] },
        { question: 'पानी का प्रेशर नापने की इकाई क्या है?', correctAnswer: 'PSI या बार', options: ['वॉट', 'एम्पीयर', 'PSI या बार', 'वोल्ट'] },
        { question: 'टॉयलेट फ्लश टैंक में पानी बंद न हो तो समस्या कहाँ हो सकती है?', correctAnswer: 'फ्लोट वाल्व में', options: ['पाइप में', 'फ्लोट वाल्व में', 'टैंक में छेद', 'सीट में'] },
      ],
    },
  });

  console.log('✅ Trade tests created (Beginner, Intermediate, Advanced)');

  // ── Workers ──────────────────────────────────────────────────────────────────
  const workerData = [
    {
      id: 'worker-ravi-001',
      fullName: 'Ravi Kumar',
      phoneNumber: '+919876543210',
      trade: 'ELECTRICIAN',
      city: 'Bangalore',
      locality: 'Indiranagar',
      aadhaarHash: hashAadhaar('987612345678'),
      aadhaarVerified: true,
      videoScore: 88,
      videoScoredAt: new Date('2026-01-15'),
      testScore: 86,
      testScoredAt: new Date('2026-01-16'),
      workHistoryScore: 87.5,
      finalScore: 87.0,
      tier: 'EXPERT',
      status: 'ACTIVE',
      kaamCardIssuedAt: new Date('2026-01-17'),
      qrCodeUrl: 'https://7kaam.in/verify/ravi-qr-token-001',
    },
    {
      id: 'worker-sunita-001',
      fullName: 'Sunita Patil',
      phoneNumber: '+919876543211',
      trade: 'PLUMBER',
      city: 'Bangalore',
      locality: 'Koramangala',
      aadhaarHash: hashAadhaar('987612345679'),
      aadhaarVerified: true,
      videoScore: 75,
      videoScoredAt: new Date('2026-01-20'),
      testScore: 70,
      testScoredAt: new Date('2026-01-21'),
      workHistoryScore: 72.5,
      finalScore: 72.0,
      tier: 'GOLD',
      status: 'ACTIVE',
      kaamCardIssuedAt: new Date('2026-01-22'),
      qrCodeUrl: 'https://7kaam.in/verify/sunita-qr-token-001',
    },
    {
      id: 'worker-mohan-001',
      fullName: 'Mohan Reddy',
      phoneNumber: '+919876543212',
      trade: 'CARPENTER',
      city: 'Bangalore',
      locality: 'Whitefield',
      aadhaarHash: hashAadhaar('987612345680'),
      aadhaarVerified: false,
      videoScore: 58,
      videoScoredAt: new Date('2026-02-01'),
      testScore: 44,
      testScoredAt: new Date('2026-02-02'),
      workHistoryScore: 37.5,
      finalScore: 48.0,
      tier: 'SILVER',
      status: 'ACTIVE',
      kaamCardIssuedAt: new Date('2026-02-03'),
      qrCodeUrl: 'https://7kaam.in/verify/mohan-qr-token-001',
    },
  ];

  for (const data of workerData) {
    await prisma.worker.upsert({ where: { id: data.id }, update: {}, create: data });
    console.log(`✅ Worker: ${data.fullName}`);
  }

  // ── Work Histories ───────────────────────────────────────────────────────────
  await prisma.workHistory.createMany({
    skipDuplicates: true,
    data: [
      {
        workerId: 'worker-ravi-001',
        clientName: 'Bangalore Electricals Pvt Ltd',
        clientType: 'COMPANY',
        clientPhone: '+919880011223',
        clientCity: 'Bangalore',
        projectTitle: 'Full Apartment Complex DB Board & Concealed Wiring',
        projectDescription: 'Completed full concealed conduit wiring, 3-phase DB panel setup, and 120 power points across 12 luxury apartments.',
        trade: 'ELECTRICIAN',
        startDate: new Date('2022-03-01'),
        endDate: new Date('2024-12-31'),
        durationMonths: 34,
        projectScale: 'LARGE',
        isVerified: true,
      },
      {
        workerId: 'worker-ravi-001',
        clientName: 'Suresh Menon (Household)',
        clientType: 'HOUSEHOLD',
        clientPhone: '+919845012345',
        clientCity: 'Bangalore',
        projectTitle: 'Full Villa Electrical Renovation — 4BHK',
        projectDescription: 'Rewired 4BHK villa in Indiranagar, installed modular switches, LED cove lighting, inverter backup system, and heavy AC sockets.',
        trade: 'ELECTRICIAN',
        startDate: new Date('2021-01-01'),
        endDate: new Date('2022-02-28'),
        durationMonths: 14,
        projectScale: 'MEDIUM',
        isVerified: true,
      },
      {
        workerId: 'worker-sunita-001',
        clientName: 'PipeRight Contractors',
        clientType: 'CONTRACTOR',
        clientPhone: '+919741002233',
        clientCity: 'Bangalore',
        projectTitle: 'Commercial Building Sanitary & Pipeline Plumbing',
        projectDescription: 'Installed CPVC pressure lines, SWR drainage lines, overhead water tank manifolds, and hydro-pneumatic pump fittings.',
        trade: 'PLUMBER',
        startDate: new Date('2023-06-01'),
        endDate: null,
        durationMonths: 14,
        projectScale: 'MEDIUM',
        isVerified: true,
      },
    ],
  });
  console.log('✅ Work histories created');

  // ── KaamCards & KaamCardHistories ─────────────────────────────────────────────
  const kaamCardData = [
    {
      id: 'kc-ravi-001',
      workerId: 'worker-ravi-001',
      qrToken: 'ravi-qr-token-001',
      version: 2,
      expiresAt: new Date('2027-01-17'),
      pdfUrl: `${SUPABASE_URL}/storage/v1/object/public/7kaam-assets/kaamcards/worker-ravi-001/kc-ravi-001.pdf`,
      scoreBreakdown: { videoScore: 88, testScore: 86, workHistoryScore: 87.5, finalScore: 87, tier: 'EXPERT' },
    },
  ];

  for (const card of kaamCardData) {
    await prisma.kaamCard.upsert({ where: { id: card.id }, update: {}, create: card });
  }

  await prisma.kaamCardHistory.createMany({
    skipDuplicates: true,
    data: [
      { kaamCardId: 'kc-ravi-001', version: 1, finalScore: 82.0, videoScore: 80.0, testScore: 82.0, workHistoryScore: 85.0, recordedAt: new Date('2026-01-15') },
      { kaamCardId: 'kc-ravi-001', version: 2, finalScore: 87.0, videoScore: 88.0, testScore: 86.0, workHistoryScore: 87.5, recordedAt: new Date('2026-01-17') },
    ],
  });
  console.log('✅ KaamCards & histories created');

  // ── Skill Certificates ────────────────────────────────────────────────────────
  await prisma.skillCertificate.createMany({
    skipDuplicates: true,
    data: [
      {
        id: 'cert-ravi-001',
        workerId: 'worker-ravi-001',
        testId: 'test-electrician-001',
        testTitle: 'Electrical Safety Fundamentals',
        trade: 'ELECTRICIAN',
        score: 86.0,
        issuedAt: new Date('2026-01-16'),
        pdfUrl: `${SUPABASE_URL}/storage/v1/object/public/7kaam-assets/certificates/worker-ravi-001_test-electrician-001.pdf`,
      },
    ],
  });
  console.log('✅ Skill certificates created');

  console.log('\n🎉 Seed complete! Login: admin@7kaam.in / Admin@7kaam');
}

main()
  .catch((e) => { console.error('Seed failed:', e); process.exit(1); })
  .finally(() => prisma.$disconnect());
