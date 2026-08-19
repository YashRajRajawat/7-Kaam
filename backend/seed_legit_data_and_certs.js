const db = require('./src/utils/prisma');

async function seedLegitData() {
  console.log('🌱 Seeding legitimate certificates, test attempts, and video prompts...');

  // 1. Fetch trade tests for linking certificates
  const tests = await db.tradeTest.findMany();
  const elecTest = tests.find(t => t.trade === 'ELECTRICIAN') || tests[0];
  const plumbTest = tests.find(t => t.trade === 'PLUMBER') || tests[0];
  const carpTest = tests.find(t => t.trade === 'CARPENTER') || tests[0];

  // 2. Clear old certificates and test submissions
  const oldCerts = await db.skillCertificate.findMany().catch(() => []);
  for (const c of oldCerts) {
    await db.skillCertificate.delete({ where: { id: c.id } }).catch(() => null);
  }

  const oldSubs = await db.testSubmission.findMany().catch(() => []);
  for (const s of oldSubs) {
    await db.testSubmission.delete({ where: { id: s.id } }).catch(() => null);
  }

  // 3. Seed Skill Certificates for verified workers ONLY
  const certificatesToCreate = [
    {
      id: 'cert-ravi-01',
      workerId: 'worker-ravi-001',
      testId: elecTest.id,
      testTitle: 'Electrical Distribution Board & Safety Certification',
      trade: 'ELECTRICIAN',
      score: 88,
      issuedAt: new Date('2026-01-18'),
      pdfUrl: 'http://localhost:8000/api/v1/kaamcards/worker-ravi-001/pdf'
    },
    {
      id: 'cert-ravi-02',
      workerId: 'worker-ravi-001',
      testId: elecTest.id,
      testTitle: 'Three-Phase Motor & Solar Inverter Installation',
      trade: 'ELECTRICIAN',
      score: 86,
      issuedAt: new Date('2026-01-22'),
      pdfUrl: 'http://localhost:8000/api/v1/kaamcards/worker-ravi-001/pdf'
    },
    {
      id: 'cert-sunita-01',
      workerId: 'worker-sunita-001',
      testId: plumbTest.id,
      testTitle: 'CPVC Sanitary Piping & 10-Bar Hydro-Test Certification',
      trade: 'PLUMBER',
      score: 76,
      issuedAt: new Date('2026-01-23'),
      pdfUrl: 'http://localhost:8000/api/v1/kaamcards/worker-sunita-001/pdf'
    },
    {
      id: 'cert-sunita-02',
      workerId: 'worker-sunita-001',
      testId: plumbTest.id,
      testTitle: 'Submersible Pump & Overhead Tank Automation',
      trade: 'PLUMBER',
      score: 72,
      issuedAt: new Date('2026-01-25'),
      pdfUrl: 'http://localhost:8000/api/v1/kaamcards/worker-sunita-001/pdf'
    },
    {
      id: 'cert-mohan-01',
      workerId: 'worker-mohan-001',
      testId: carpTest.id,
      testTitle: 'Modular Kitchen & Hydraulic Hardware Fitting Certification',
      trade: 'CARPENTER',
      score: 70,
      issuedAt: new Date('2026-02-04'),
      pdfUrl: 'http://localhost:8000/api/v1/kaamcards/worker-mohan-001/pdf'
    }
  ];

  for (const c of certificatesToCreate) {
    await db.skillCertificate.create({ data: c }).catch(e => console.error('Cert error:', e.message));
  }

  // 4. Seed Test Submissions for verified workers ONLY
  const testSubmissions = [
    {
      workerId: 'worker-ravi-001',
      testId: elecTest.id,
      answers: { q1: 0, q2: 1 },
      rawScore: 88,
      status: 'COMPLETED',
      submittedAt: new Date('2026-01-18')
    },
    {
      workerId: 'worker-ravi-001',
      testId: elecTest.id,
      answers: { q1: 0, q2: 2 },
      rawScore: 86,
      status: 'COMPLETED',
      submittedAt: new Date('2026-01-22')
    },
    {
      workerId: 'worker-sunita-001',
      testId: plumbTest.id,
      answers: { q1: 1, q2: 0 },
      rawScore: 76,
      status: 'COMPLETED',
      submittedAt: new Date('2026-01-23')
    },
    {
      workerId: 'worker-sunita-001',
      testId: plumbTest.id,
      answers: { q1: 0, q2: 0 },
      rawScore: 72,
      status: 'COMPLETED',
      submittedAt: new Date('2026-01-25')
    },
    {
      workerId: 'worker-mohan-001',
      testId: carpTest.id,
      answers: { q1: 2, q2: 1 },
      rawScore: 70,
      status: 'COMPLETED',
      submittedAt: new Date('2026-02-04')
    }
  ];

  for (const ts of testSubmissions) {
    await db.testSubmission.create({ data: ts }).catch(e => console.error('Sub error:', e.message));
  }

  // 5. Reset scores for unverified workers to 0 attempts/null scores
  const unverifiedWorkerIds = ['worker-ac-001', 'worker-painter-001', 'worker-welder-001'];
  for (const uid of unverifiedWorkerIds) {
    await db.worker.update({
      where: { id: uid },
      data: {
        videoUrl: null,
        videoScore: null,
        testScore: null,
        finalScore: null,
        tier: null
      }
    });
  }

  // 6. Add Practical Video Test Prompts for EVERY trade role to TradeTest DB
  const videoTestPrompts = [
    {
      id: 'vid-test-elec-01',
      title: '2-Min MCB & Distribution Switchboard Wiring Demonstration',
      trade: 'ELECTRICIAN',
      language: 'HINDI',
      category: 'Video Assessment',
      difficulty: 'INTERMEDIATE',
      estimatedMinutes: 5,
      questions: [],
      isActive: true
    },
    {
      id: 'vid-test-plumb-01',
      title: 'CPVC Joint Solvent Weld & 10-Bar Leak Hydro-Test',
      trade: 'PLUMBER',
      language: 'HINDI',
      category: 'Video Assessment',
      difficulty: 'INTERMEDIATE',
      estimatedMinutes: 5,
      questions: [],
      isActive: true
    },
    {
      id: 'vid-test-carp-01',
      title: 'Mortise & Tenon Wood Joint Chiseling & Fit Test',
      trade: 'CARPENTER',
      language: 'HINDI',
      category: 'Video Assessment',
      difficulty: 'INTERMEDIATE',
      estimatedMinutes: 5,
      questions: [],
      isActive: true
    },
    {
      id: 'vid-test-ac-01',
      title: 'Copper Tube Flaring & 500-Micron Vacuum Test',
      trade: 'AC_TECHNICIAN',
      language: 'HINDI',
      category: 'Video Assessment',
      difficulty: 'INTERMEDIATE',
      estimatedMinutes: 5,
      questions: [],
      isActive: true
    },
    {
      id: 'vid-test-paint-01',
      title: 'Wall Putty 180-Grit Sanding & Dual Primer Application',
      trade: 'PAINTER',
      language: 'HINDI',
      category: 'Video Assessment',
      difficulty: 'INTERMEDIATE',
      estimatedMinutes: 5,
      questions: [],
      isActive: true
    },
    {
      id: 'vid-test-weld-01',
      title: '3G Vertical Up SMAW Arc Welding & Slag Removal',
      trade: 'WELDER',
      language: 'HINDI',
      category: 'Video Assessment',
      difficulty: 'INTERMEDIATE',
      estimatedMinutes: 5,
      questions: [],
      isActive: true
    }
  ];

  for (const vt of videoTestPrompts) {
    const existing = await db.tradeTest.findUnique({ where: { id: vt.id } });
    if (!existing) {
      await db.tradeTest.create({ data: vt }).catch(e => console.error('Video test create error:', e.message));
    }
  }

  console.log('\n✅ LEGIT DATA SEEDED SUCCESSFULLY!');
  process.exit(0);
}

seedLegitData().catch(err => {
  console.error('❌ Error:', err);
  process.exit(1);
});
