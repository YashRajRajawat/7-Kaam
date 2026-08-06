require('dotenv').config();
const db = require('../src/utils/prisma');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

async function main() {
  console.log('🌱 Seeding 7 Kaam Coursera-style test catalogue database via Supabase API...');

  // ── Admin ──────────────────────────────────────────────────────────────────
  const passwordHash = await bcrypt.hash('Admin@7kaam', 12);
  await db.admin.upsert({
    where: { email: 'admin@7kaam.in' },
    update: {},
    create: { id: 'admin-super-001', email: 'admin@7kaam.in', passwordHash, role: 'SUPER_ADMIN' },
  });
  console.log('✅ Admin upserted');

  // ── Trade Tests Catalogue ─────────────────────────────────────────────────
  const catalogueTests = [
    // ELECTRICIAN - Safety
    {
      id: 'test-elec-safe-001',
      trade: 'ELECTRICIAN',
      language: 'ENGLISH',
      title: 'Electrical Safety Fundamentals',
      description: 'Learn and prove core safety practices every electrician must know',
      category: 'Safety',
      difficulty: 'BEGINNER',
      estimatedMinutes: 12,
      passingScore: 60,
      totalAttempts: 1247,
      isFirstTest: true,
      isVideoAssessment: false,
      questions: [
        { question: 'What is the standard household voltage in India?', correctAnswer: '230V AC', options: ['110V AC', '230V AC', '440V AC', '12V DC'] },
        { question: 'Which wire color indicates earth in Indian wiring?', correctAnswer: 'Green', options: ['Red', 'Black', 'Green', 'Blue'] },
        { question: 'What does MCB stand for?', correctAnswer: 'Miniature Circuit Breaker', options: ['Main Circuit Board', 'Miniature Circuit Breaker', 'Manual Control Box', 'Motor Control Box'] },
        { question: 'What is the safe maximum load for a 15A socket?', correctAnswer: '3450W', options: ['1500W', '2000W', '3450W', '5000W'] },
        { question: 'Before working on a live panel, you should:', correctAnswer: 'Switch off main breaker and use insulated tools', options: ['Work quickly', 'Switch off main breaker and use insulated tools', 'Wear rubber gloves only', 'Ask someone to watch'] },
      ],
    },
    {
      id: 'test-elec-safe-002',
      trade: 'ELECTRICIAN',
      language: 'ENGLISH',
      title: 'PPE and Hazard Identification',
      description: 'Identify hazards and master proper usage of personal protective equipment',
      category: 'Safety',
      difficulty: 'BEGINNER',
      estimatedMinutes: 10,
      passingScore: 60,
      totalAttempts: 893,
      isVideoAssessment: false,
      questions: [
        { question: 'What voltage rating should insulated gloves have for low-voltage residential work?', correctAnswer: '1000V', options: ['230V', '500V', '1000V', '11kV'] },
        { question: 'Which safety gear prevents eye injuries from electrical arc flash?', correctAnswer: 'Arc Flash Face Shield / Safety Goggles', options: ['Sunglasses', 'Arc Flash Face Shield / Safety Goggles', 'Dust Mask', 'Ear Plugs'] },
        { question: 'What class fire extinguisher should be used on electrical fires?', correctAnswer: 'Class C (CO2 / Dry Powder)', options: ['Class A (Water)', 'Class B (Foam)', 'Class C (CO2 / Dry Powder)', 'Wet Chemical'] },
        { question: 'When working at heights on electrical poles, what is essential?', correctAnswer: 'Full body harness attached to a secure anchor', options: ['Cotton rope', 'Full body harness attached to a secure anchor', 'Leather belt', 'Hard hat only'] },
      ],
    },
    {
      id: 'test-elec-safe-003',
      trade: 'ELECTRICIAN',
      language: 'ENGLISH',
      title: 'High Voltage Safety Protocols',
      description: 'Advanced safety procedures for sub-stations and high-voltage panels',
      category: 'Safety',
      difficulty: 'ADVANCED',
      estimatedMinutes: 20,
      passingScore: 70,
      totalAttempts: 234,
      isVideoAssessment: false,
      questions: [
        { question: 'What is the minimum safe clearance distance for 11kV overhead lines?', correctAnswer: '2.6 meters', options: ['1.0 meter', '1.8 meters', '2.6 meters', '5.0 meters'] },
        { question: 'What procedure ensures a circuit remains de-energized during maintenance?', correctAnswer: 'Lockout / Tagout (LOTO)', options: ['Verbal warning', 'Lockout / Tagout (LOTO)', 'Turning switch off', 'Posting a guard'] },
        { question: 'What is the main purpose of a rubber discharge rod?', correctAnswer: 'Safely discharge residual capacitive voltage to earth', options: ['Measure current', 'Safely discharge residual capacitive voltage to earth', 'Clean busbars', 'Test insulation'] },
      ],
    },

    // ELECTRICIAN - Installation
    {
      id: 'test-elec-inst-001',
      trade: 'ELECTRICIAN',
      language: 'ENGLISH',
      title: 'Residential Wiring Basics',
      description: 'Master conduit laying, box fixing, and single-phase domestic wiring',
      category: 'Installation',
      difficulty: 'BEGINNER',
      estimatedMinutes: 15,
      passingScore: 60,
      totalAttempts: 2103,
      isVideoAssessment: false,
      questions: [
        { question: 'What size copper wire is standard for lighting circuits?', correctAnswer: '1.5 sq mm', options: ['1.0 sq mm', '1.5 sq mm', '2.5 sq mm', '4.0 sq mm'] },
        { question: 'What size copper wire is recommended for 16A power sockets?', correctAnswer: '4.0 sq mm', options: ['1.5 sq mm', '2.5 sq mm', '4.0 sq mm', '6.0 sq mm'] },
        { question: 'How are two-way switches wired for staircase lighting?', correctAnswer: 'Using two 2-way switches connected by two traveler wires', options: ['In series', 'Using two 2-way switches connected by two traveler wires', 'In parallel with a relay', 'Using a single pole switch'] },
      ],
    },
    {
      id: 'test-elec-inst-002',
      trade: 'ELECTRICIAN',
      language: 'ENGLISH',
      title: 'Distribution Board Setup',
      description: 'Learn MCB, RCCB, and isolator installation in distribution boards',
      category: 'Installation',
      difficulty: 'INTERMEDIATE',
      estimatedMinutes: 18,
      passingScore: 65,
      totalAttempts: 567,
      isVideoAssessment: false,
      questions: [
        { question: 'What sensitivity RCCB is mandatory for human shock protection?', correctAnswer: '30 mA', options: ['10 mA', '30 mA', '100 mA', '300 mA'] },
        { question: 'In a DB, what rating isolator is installed before MCBs?', correctAnswer: '40A or 63A DP Isolator', options: ['16A SP', '32A SP', '40A or 63A DP Isolator', '100A TPN'] },
      ],
    },
    {
      id: 'test-elec-inst-003',
      trade: 'ELECTRICIAN',
      language: 'ENGLISH',
      title: 'Three-Phase Industrial Wiring',
      description: 'Industrial 415V 3-phase wiring, busbar chambers, and panel assembly',
      category: 'Installation',
      difficulty: 'ADVANCED',
      estimatedMinutes: 25,
      passingScore: 70,
      totalAttempts: 128,
      isVideoAssessment: false,
      questions: [
        { question: 'What color convention is standard for 3-phase supply in India?', correctAnswer: 'Red, Yellow, Blue (RYB)', options: ['Red, Green, Blue', 'Red, Yellow, Blue (RYB)', 'Black, White, Red', 'Brown, Black, Grey'] },
        { question: 'What type of starter is required for 3-phase motors above 7.5 HP?', correctAnswer: 'Star-Delta Starter', options: ['DOL Starter', 'Star-Delta Starter', 'Autotransformer Starter', 'Soft Starter'] },
      ],
    },

    // ELECTRICIAN - Maintenance
    {
      id: 'test-elec-maint-001',
      trade: 'ELECTRICIAN',
      language: 'ENGLISH',
      title: 'Fault Detection and Troubleshooting',
      description: 'Diagnose short circuits, ground faults, and neutral failures',
      category: 'Maintenance',
      difficulty: 'INTERMEDIATE',
      estimatedMinutes: 15,
      passingScore: 65,
      totalAttempts: 445,
      isVideoAssessment: false,
      questions: [
        { question: 'If an RCCB trips immediately upon switching on a load, the fault is likely:', correctAnswer: 'Neutral-to-Earth fault or earth leakage', options: ['Overload', 'Neutral-to-Earth fault or earth leakage', 'Low voltage', 'Open circuit'] },
        { question: 'What multimeter setting is used to check for wire continuity?', correctAnswer: 'Continuity / Resistance (Buzzer mode)', options: ['DC Voltage', 'AC Current', 'Continuity / Resistance (Buzzer mode)', 'Frequency'] },
      ],
    },

    // ELECTRICIAN - Theory
    {
      id: 'test-elec-theory-001',
      trade: 'ELECTRICIAN',
      language: 'ENGLISH',
      title: "Ohm's Law and Circuit Theory",
      description: 'Understand voltage, current, resistance, and power calculations',
      category: 'Theory',
      difficulty: 'BEGINNER',
      estimatedMinutes: 12,
      passingScore: 60,
      totalAttempts: 3421,
      isVideoAssessment: false,
      questions: [
        { question: "According to Ohm's Law, V = ?", correctAnswer: 'I × R', options: ['I / R', 'I × R', 'R / I', 'I² × R'] },
        { question: 'What is the unit of electrical power?', correctAnswer: 'Watt (W)', options: ['Joule (J)', 'Ampere (A)', 'Watt (W)', 'Volt (V)'] },
      ],
    },

    // ELECTRICIAN - Video Assessments
    {
      id: 'test-elec-video-001',
      trade: 'ELECTRICIAN',
      language: 'ENGLISH',
      title: 'Basic Wiring Technique Assessment',
      description: 'Record yourself performing wire stripping, jointing, and insulation tapping',
      category: 'Video Assessments',
      difficulty: 'BEGINNER',
      estimatedMinutes: 3,
      passingScore: 60,
      totalAttempts: 342,
      isVideoAssessment: true,
      rubrics: { safety_compliance: 30, technique_accuracy: 40, tool_handling: 30 },
      questions: [],
    },
    {
      id: 'test-elec-video-002',
      trade: 'ELECTRICIAN',
      language: 'ENGLISH',
      title: 'Distribution Board Wiring Assessment',
      description: 'Record yourself installing an MCB and dressing wires in a DB board',
      category: 'Video Assessments',
      difficulty: 'INTERMEDIATE',
      estimatedMinutes: 5,
      passingScore: 65,
      totalAttempts: 89,
      isVideoAssessment: true,
      rubrics: { safety_compliance: 25, technique_accuracy: 45, tool_handling: 20, work_quality: 10 },
      questions: [],
    },

    // PLUMBER TESTS
    {
      id: 'test-plumb-safe-001',
      trade: 'PLUMBER',
      language: 'ENGLISH',
      title: 'Plumbing Safety and PPE',
      description: 'Safety practices when handling pipes, power tools, and sewage lines',
      category: 'Safety',
      difficulty: 'BEGINNER',
      estimatedMinutes: 10,
      passingScore: 60,
      totalAttempts: 567,
      isVideoAssessment: false,
      questions: [
        { question: 'What protection is required when cutting CPVC/PVC pipes with an angle grinder?', correctAnswer: 'Safety goggles and dust mask', options: ['Gloves only', 'Safety goggles and dust mask', 'Ear plugs only', 'None'] },
        { question: 'What chemical sealant requires well-ventilated areas due to toxic fumes?', correctAnswer: 'PVC Solvent Cement', options: ['Water', 'PVC Solvent Cement', 'Teflon Tape', 'Grease'] },
      ],
    },
    {
      id: 'test-plumb-inst-001',
      trade: 'PLUMBER',
      language: 'ENGLISH',
      title: 'Pipe Fitting Fundamentals',
      description: 'Learn CPVC, UPVC, and PPR pipe cutting, solvent welding, and joints',
      category: 'Installation',
      difficulty: 'BEGINNER',
      estimatedMinutes: 12,
      passingScore: 60,
      totalAttempts: 892,
      isVideoAssessment: false,
      questions: [
        { question: 'What tape is wrapped on threaded pipe joints to prevent leaks?', correctAnswer: 'PTFE Teflon Tape', options: ['Masking Tape', 'Electrical Tape', 'PTFE Teflon Tape', 'Duct Tape'] },
        { question: 'What is the curing time for CPVC solvent cement before pressure testing?', correctAnswer: '2 hours', options: ['5 minutes', '15 minutes', '2 hours', '24 hours'] },
      ],
    },
    {
      id: 'test-plumb-video-001',
      trade: 'PLUMBER',
      language: 'ENGLISH',
      title: 'Pipe Joint and Fitting Assessment',
      description: 'Record yourself measuring, solvent welding, and joining a CPVC pipe assembly',
      category: 'Video Assessments',
      difficulty: 'BEGINNER',
      estimatedMinutes: 3,
      passingScore: 60,
      totalAttempts: 156,
      isVideoAssessment: true,
      rubrics: { joint_quality: 40, tool_usage: 30, leak_prevention: 30 },
      questions: [],
    },
  ];

  for (const t of catalogueTests) {
    try {
      await db.tradeTest.upsert({
        where: { id: t.id },
        update: t,
        create: t,
      });
    } catch (err) {
      console.log(`Notice seeding test ${t.id}:`, err.message);
    }
  }
  console.log(`✅ ${catalogueTests.length} Trade Tests seeded in catalogue`);

  // ── Worker Ravi Seed Data ──────────────────────────────────────────────────
  const raviId = 'worker-ravi-001';

  await db.videoAssessment.upsert({
    where: { id: 'va-ravi-001' },
    update: {},
    create: {
      id: 'va-ravi-001',
      workerId: raviId,
      testId: 'test-elec-video-001',
      videoUrl: 'https://qywflwdkrckyjdrsadvo.supabase.co/storage/v1/object/public/7kaam-assets/videos/ravi_demo.mp4',
      score: 85.0,
      rubricScores: { safety_compliance: 88, technique_accuracy: 82, tool_handling: 85 },
      feedback: 'Excellent tool control and adherence to safety gloves during wire jointing.',
      status: 'SCORED',
      attemptNumber: 1,
      scoredAt: new Date(),
    },
  }).catch(() => {});

  console.log('🎉 Rich Catalogue Database Seed Complete!');
}

main().catch(console.error);
