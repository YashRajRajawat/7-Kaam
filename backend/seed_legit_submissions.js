const db = require('./src/utils/prisma');

async function seedLegitSubmissions() {
  console.log('🌱 Seeding legitimate test submissions & resetting unverified workers...');

  const tests = await db.tradeTest.findMany();
  const elecTests = tests.filter(t => t.trade === 'ELECTRICIAN');
  const plumbTests = tests.filter(t => t.trade === 'PLUMBER');
  const carpTests = tests.filter(t => t.trade === 'CARPENTER');

  // Clear existing submissions
  const oldSubs = await db.testSubmission.findMany().catch(() => []);
  for (const s of oldSubs) {
    await db.testSubmission.delete({ where: { id: s.id } }).catch(() => null);
  }

  // 1. Ravi Kumar (2 passed tests)
  if (elecTests.length >= 1) {
    await db.testSubmission.create({
      data: {
        workerId: 'worker-ravi-001',
        testId: elecTests[0].id,
        answers: { q1: 0, q2: 1 },
        rawScore: 88,
        status: 'COMPLETED',
        submittedAt: new Date('2026-01-18')
      }
    });
  }
  if (elecTests.length >= 2) {
    await db.testSubmission.create({
      data: {
        workerId: 'worker-ravi-001',
        testId: elecTests[1].id,
        answers: { q1: 0, q2: 2 },
        rawScore: 86,
        status: 'COMPLETED',
        submittedAt: new Date('2026-01-22')
      }
    });
  }

  // 2. Sunita Patil (2 passed tests)
  if (plumbTests.length >= 1) {
    await db.testSubmission.create({
      data: {
        workerId: 'worker-sunita-001',
        testId: plumbTests[0].id,
        answers: { q1: 1, q2: 0 },
        rawScore: 76,
        status: 'COMPLETED',
        submittedAt: new Date('2026-01-23')
      }
    });
  }
  if (plumbTests.length >= 2) {
    await db.testSubmission.create({
      data: {
        workerId: 'worker-sunita-001',
        testId: plumbTests[1].id,
        answers: { q1: 0, q2: 0 },
        rawScore: 72,
        status: 'COMPLETED',
        submittedAt: new Date('2026-01-25')
      }
    });
  }

  // 3. Mohan Reddy (1 passed test)
  if (carpTests.length >= 1) {
    await db.testSubmission.create({
      data: {
        workerId: 'worker-mohan-001',
        testId: carpTests[0].id,
        answers: { q1: 2, q2: 1 },
        rawScore: 70,
        status: 'COMPLETED',
        submittedAt: new Date('2026-02-04')
      }
    });
  }

  // 4. Reset Unverified Workers to 0 attempts/null scores
  const unverifiedWorkerIds = ['worker-ac-001', 'worker-painter-001', 'worker-welder-001'];
  for (const uid of unverifiedWorkerIds) {
    await db.worker.update({
      where: { id: uid },
      data: {
        videoUrl: null,
        videoScore: null,
        testScore: null,
        workHistoryScore: null,
        finalScore: null,
        tier: null
      }
    });
  }

  // Update verified workers with proper score estimates & counts
  await db.worker.update({
    where: { id: 'worker-ravi-001' },
    data: { videoScore: 87, testScore: 87, workHistoryScore: 87, finalScore: 87, tier: 'EXPERT' }
  });
  await db.worker.update({
    where: { id: 'worker-sunita-001' },
    data: { videoScore: 72, testScore: 74, workHistoryScore: 70, finalScore: 72, tier: 'GOLD' }
  });
  await db.worker.update({
    where: { id: 'worker-mohan-001' },
    data: { videoScore: 68, testScore: 70, workHistoryScore: 65, finalScore: 68, tier: 'SILVER' }
  });

  console.log('\n✅ LEGIT SUBMISSIONS SEEDED! Verified workers have test submissions; unverified workers are reset to 0 attempts.');
  process.exit(0);
}

seedLegitSubmissions().catch(err => {
  console.error('❌ Error:', err);
  process.exit(1);
});
