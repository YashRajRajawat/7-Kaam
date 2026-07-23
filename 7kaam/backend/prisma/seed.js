require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });


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
  const test1 = await prisma.tradeTest.upsert({
    where: { id: 'test-electrician-001' },
    update: {},
    create: {
      id: 'test-electrician-001',
      trade: 'ELECTRICIAN',
      language: 'ENGLISH',
      title: 'Electrician Safety Fundamentals',
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

  const test2 = await prisma.tradeTest.upsert({
    where: { id: 'test-plumber-001' },
    update: {},
    create: {
      id: 'test-plumber-001',
      trade: 'PLUMBER',
      language: 'HINDI',
      title: 'Plumbing Fundamentals (Hindi)',
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

  console.log('✅ Trade tests created');

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
      { workerId: 'worker-ravi-001', employerName: 'Bangalore Electricals Pvt Ltd', role: 'Senior Electrician', startDate: new Date('2022-03-01'), endDate: new Date('2024-12-31'), rating: 5, verified: true },
      { workerId: 'worker-ravi-001', employerName: 'HomeServ India', role: 'Lead Technician', startDate: new Date('2021-01-01'), endDate: new Date('2022-02-28'), rating: 4, verified: true },
      { workerId: 'worker-sunita-001', employerName: 'PipeRight Contractors', role: 'Plumber', startDate: new Date('2023-06-01'), endDate: null, rating: 4, verified: true },
      { workerId: 'worker-sunita-001', employerName: 'AquaFix Services', role: 'Junior Plumber', startDate: new Date('2021-08-01'), endDate: new Date('2023-05-31'), rating: 3, verified: false },
      { workerId: 'worker-mohan-001', employerName: 'WoodCraft Interiors', role: 'Carpenter', startDate: new Date('2024-01-01'), endDate: null, rating: 3, verified: false },
    ],
  });
  console.log('✅ Work histories created');

  // ── KaamCards ────────────────────────────────────────────────────────────────
  const kaamCardData = [
    {
      id: 'kc-ravi-001',
      workerId: 'worker-ravi-001',
      qrToken: 'ravi-qr-token-001',
      expiresAt: new Date('2027-01-17'),
      pdfUrl: 'https://qywflwdkrckyjdrsadvo.supabase.co/storage/v1/object/public/7kaam-assets/kaamcards/worker-ravi-001/kc-ravi-001.pdf',
      scoreBreakdown: { videoScore: 88, testScore: 86, workHistoryScore: 87.5, finalScore: 87, tier: 'EXPERT' },
    },
    {
      id: 'kc-sunita-001',
      workerId: 'worker-sunita-001',
      qrToken: 'sunita-qr-token-001',
      expiresAt: new Date('2027-01-22'),
      pdfUrl: 'https://qywflwdkrckyjdrsadvo.supabase.co/storage/v1/object/public/7kaam-assets/kaamcards/worker-sunita-001/kc-sunita-001.pdf',
      scoreBreakdown: { videoScore: 75, testScore: 70, workHistoryScore: 72.5, finalScore: 72, tier: 'GOLD' },
    },
    {
      id: 'kc-mohan-001',
      workerId: 'worker-mohan-001',
      qrToken: 'mohan-qr-token-001',
      expiresAt: new Date('2027-02-03'),
      pdfUrl: 'https://qywflwdkrckyjdrsadvo.supabase.co/storage/v1/object/public/7kaam-assets/kaamcards/worker-mohan-001/kc-mohan-001.pdf',
      scoreBreakdown: { videoScore: 58, testScore: 44, workHistoryScore: 37.5, finalScore: 48, tier: 'SILVER' },
    },
  ];

  for (const card of kaamCardData) {
    await prisma.kaamCard.upsert({ where: { id: card.id }, update: {}, create: card });
  }
  console.log('✅ KaamCards created');

  // Update workers with kaamCardUrl
  await prisma.worker.update({ where: { id: 'worker-ravi-001' }, data: { kaamCardUrl: kaamCardData[0].pdfUrl } });
  await prisma.worker.update({ where: { id: 'worker-sunita-001' }, data: { kaamCardUrl: kaamCardData[1].pdfUrl } });
  await prisma.worker.update({ where: { id: 'worker-mohan-001' }, data: { kaamCardUrl: kaamCardData[2].pdfUrl } });

  // ── Scoring Logs ─────────────────────────────────────────────────────────────
  const logs = [
    { workerId: 'worker-ravi-001', signalType: 'VIDEO', outputScore: 88, scoredAt: new Date('2026-01-15'), notes: 'Mock CV model' },
    { workerId: 'worker-ravi-001', signalType: 'TEST', outputScore: 86, scoredAt: new Date('2026-01-16'), notes: 'Groq LLaMA 3' },
    { workerId: 'worker-ravi-001', signalType: 'WORK_HISTORY', outputScore: 87.5, scoredAt: new Date('2026-01-16'), notes: '2 verified entries' },
    { workerId: 'worker-ravi-001', signalType: 'FINAL', outputScore: 87, scoredAt: new Date('2026-01-17'), notes: 'Tier: EXPERT' },
    { workerId: 'worker-sunita-001', signalType: 'VIDEO', outputScore: 75, scoredAt: new Date('2026-01-20'), notes: 'Mock CV model' },
    { workerId: 'worker-sunita-001', signalType: 'TEST', outputScore: 70, scoredAt: new Date('2026-01-21'), notes: 'Groq LLaMA 3' },
    { workerId: 'worker-sunita-001', signalType: 'FINAL', outputScore: 72, scoredAt: new Date('2026-01-22'), notes: 'Tier: GOLD' },
    { workerId: 'worker-mohan-001', signalType: 'VIDEO', outputScore: 58, scoredAt: new Date('2026-02-01'), notes: 'Mock CV model' },
    { workerId: 'worker-mohan-001', signalType: 'TEST', outputScore: 44, scoredAt: new Date('2026-02-02'), notes: 'Groq LLaMA 3' },
    { workerId: 'worker-mohan-001', signalType: 'FINAL', outputScore: 48, scoredAt: new Date('2026-02-03'), notes: 'Tier: SILVER' },
  ];

  await prisma.scoringLog.createMany({ data: logs, skipDuplicates: true });
  console.log('✅ Scoring logs created');

  // ── Test Submissions ─────────────────────────────────────────────────────────
  await prisma.testSubmission.createMany({
    skipDuplicates: true,
    data: [
      {
        workerId: 'worker-ravi-001',
        testId: 'test-electrician-001',
        answers: ['230V AC', 'Green', 'Miniature Circuit Breaker', '3450W', 'Switch off the main breaker and use insulated tools'],
        rawScore: 86,
        status: 'COMPLETED',
        aiEvaluation: { totalScore: 86, overallFeedback: 'Excellent knowledge of electrical safety fundamentals.' },
      },
      {
        workerId: 'worker-sunita-001',
        testId: 'test-plumber-001',
        answers: ['PTFE टेप', 'PVC सॉल्वेंट सीमेंट', '25.4 मिमी', 'PSI या बार', 'फ्लोट वाल्व में'],
        rawScore: 70,
        status: 'COMPLETED',
        aiEvaluation: { totalScore: 70, overallFeedback: 'Good understanding of plumbing basics.' },
      },
    ],
  });
  console.log('✅ Test submissions created');

  console.log('\n🎉 Seed complete! Login: admin@7kaam.in / Admin@7kaam');
}

main()
  .catch((e) => { console.error('Seed failed:', e); process.exit(1); })
  .finally(() => prisma.$disconnect());
