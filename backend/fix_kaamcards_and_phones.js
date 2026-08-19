const db = require('./src/utils/prisma');

async function run() {
  console.log('🔧 Formatting phone numbers and resetting KaamCard verification queue...');

  const updates = [
    { id: 'worker-ravi-001', phone: '+919876543210', keepCard: true },
    { id: 'worker-sunita-001', phone: '+919876543211', keepCard: true },
    { id: 'worker-mohan-001', phone: '+919876543212', keepCard: true },
    { id: 'worker-ac-001', phone: '+919876543213', keepCard: false },
    { id: 'worker-painter-001', phone: '+919876543214', keepCard: false },
    { id: 'worker-welder-001', phone: '+919876543215', keepCard: false }
  ];

  for (const u of updates) {
    await db.worker.update({
      where: { id: u.id },
      data: { phoneNumber: u.phone }
    });
    console.log(`  ✓ Updated phone for ${u.id}: ${u.phone}`);

    if (!u.keepCard) {
      await db.kaamCardHistory.delete({ where: { workerId: u.id } }).catch(() => null);
      await db.kaamCard.delete({ where: { workerId: u.id } }).catch(() => null);
      console.log(`  ✓ Reset KaamCard status to Pending Verification for ${u.id}`);
    }
  }

  const workers = await db.worker.findMany({ include: { kaamCards: true } });
  console.log('\n✅ UPDATE COMPLETE! Worker KaamCard & Phone state:');
  workers.forEach(w => {
    const hasCard = w.kaamCards && w.kaamCards.length > 0;
    console.log(` - ${w.fullName} (${w.trade}) | Phone: ${w.phoneNumber} | KaamCard: ${hasCard ? '✓ ISSUED (' + w.kaamCards[0].id + ')' : '⏳ PENDING ADMIN VERIFICATION'}`);
  });

  process.exit(0);
}

run().catch(err => {
  console.error('❌ Error:', err);
  process.exit(1);
});
