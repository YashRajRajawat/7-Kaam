const db = require('./src/utils/prisma');

async function cleanup() {
  console.log('🧹 Cleaning up useless/dummy workers from database...');

  const KEEP_WORKER_IDS = [
    'worker-ravi-001',
    'worker-sunita-001',
    'worker-mohan-001',
    'worker-ac-001',
    'worker-painter-001',
    'worker-welder-001'
  ];

  const allWorkers = await db.worker.findMany();
  const toDelete = allWorkers.filter(w => !KEEP_WORKER_IDS.includes(w.id));

  console.log(`Found ${toDelete.length} useless/dummy workers to remove:`);
  for (const w of toDelete) {
    console.log(` - Deleting: ${w.id} | ${w.fullName} (${w.trade})`);

    // Delete related records first
    await db.kaamCardHistory.delete({ where: { workerId: w.id } }).catch(() => null);
    await db.kaamCard.delete({ where: { workerId: w.id } }).catch(() => null);
    await db.testSubmission.delete({ where: { workerId: w.id } }).catch(() => null);
    await db.skillCertificate.delete({ where: { workerId: w.id } }).catch(() => null);
    await db.videoAssessment.delete({ where: { workerId: w.id } }).catch(() => null);
    await db.workHistory.delete({ where: { workerId: w.id } }).catch(() => null);
    await db.scoringLog.delete({ where: { workerId: w.id } }).catch(() => null);

    // Delete worker
    await db.worker.delete({ where: { id: w.id } }).catch(err => {
      console.error(` Failed to delete worker ${w.id}:`, err.message);
    });
  }

  // Verify remaining workers
  const remaining = await db.worker.findMany();
  console.log(`\n✅ Cleanup complete! ${remaining.length} clean official trade workers remain in database:`);
  remaining.forEach(w => {
    console.log(` ✓ [${w.trade}] ${w.fullName} | Score: ${w.finalScore}/100 (${w.tier})`);
  });

  process.exit(0);
}

cleanup().catch(err => {
  console.error('❌ Cleanup failed:', err);
  process.exit(1);
});
