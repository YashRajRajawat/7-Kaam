const db = require('./src/utils/prisma');

async function seed() {
  console.log('🚀 Seeding comprehensive Trade Tests, Video Assessments & Workers for all 6 trades...');

  // 1. Seed Trade Tests for all 6 trades
  const tradeTestsData = [
    // ── ELECTRICIAN ─────────────────────────────────────────────────────────────
    {
      title: 'Electrical Safety & Distribution Board Wiring',
      trade: 'ELECTRICIAN',
      language: 'ENGLISH',
      difficulty: 'INTERMEDIATE',
      passingScore: 65,
      questions: [
        { question: 'What color wire is standard for Protective Earth (PE) in India?', options: ['Red', 'Black', 'Green/Yellow', 'Blue'], answer: 'Green/Yellow' },
        { question: 'What is the primary function of an ELCB / RCCB?', options: ['Voltage stepping', 'Earth leakage & shock protection', 'Frequency modulation', 'Current amplification'], answer: 'Earth leakage & shock protection' },
        { question: 'What MCB rating is typically recommended for 1.5-ton Split AC?', options: ['6A', '10A', '16A / 20A C-Curve', '32A D-Curve'], answer: '16A / 20A C-Curve' },
        { question: 'Maximum permissible earth pit resistance for residential installation?', options: ['5 Ohms', '50 Ohms', '100 Ohms', '500 Ohms'], answer: '5 Ohms' }
      ]
    },
    {
      title: 'Three-Phase Motor & Solar Inverter Installation',
      trade: 'ELECTRICIAN',
      language: 'ENGLISH',
      difficulty: 'ADVANCED',
      passingScore: 70,
      questions: [
        { question: 'Why is a Star-Delta starter used for 3-phase induction motors?', options: ['To increase starting torque', 'To reduce high starting current', 'To reverse motor direction', 'To increase supply frequency'], answer: 'To reduce high starting current' },
        { question: 'Which instrument measures insulation resistance of motor windings?', options: ['Multimeter', 'Megger (Insulation Tester)', 'Tong Tester', 'Wattmeter'], answer: 'Megger (Insulation Tester)' }
      ]
    },

    // ── PLUMBER ─────────────────────────────────────────────────────────────────
    {
      title: 'Sanitary Piping, Traps & Pressure Testing',
      trade: 'PLUMBER',
      language: 'ENGLISH',
      difficulty: 'INTERMEDIATE',
      passingScore: 60,
      questions: [
        { question: 'What is the primary purpose of a P-Trap in sanitary plumbing?', options: ['To increase water pressure', 'To prevent foul sewer gases from entering indoors', 'To filter debris', 'To regulate hot water'], answer: 'To prevent foul sewer gases from entering indoors' },
        { question: 'Which solvent cement type is specified for CPVC hot water lines?', options: ['Standard PVC solvent', 'CPVC Heavy Duty Orange Solvent', 'Polyurethane Foam', 'Silicone Sealant'], answer: 'CPVC Heavy Duty Orange Solvent' },
        { question: 'Standard hydro-testing pressure for concealed bathroom water supply piping?', options: ['2 Bar', '5 to 10 Bar for 30 mins', '20 Bar', '50 Bar'], answer: '5 to 10 Bar for 30 mins' },
        { question: 'Slope recommended for 100mm underground soil drain pipe?', options: ['1 in 40 (2.5%)', '1 in 200', 'Flat 0%', 'Vertical drop only'], answer: '1 in 40 (2.5%)' }
      ]
    },
    {
      title: 'Submersible Pump & Overhead Tank Automation',
      trade: 'PLUMBER',
      language: 'HINDI',
      difficulty: 'ADVANCED',
      passingScore: 65,
      questions: [
        { question: 'Overhead tank float switch wiring का मुख्य कार्य क्या है?', options: ['पंप मोटर की गति बढ़ाना', 'टैंक भरने पर स्वतः ऑटो कट-ऑफ करना', 'पानी का तापमान जांचना', 'प्रेशर बढ़ाना'], answer: 'टैंक भरने पर स्वतः ऑटो कट-ऑफ करना' },
        { question: 'Non-Return Valve (NRV) का सही उपयोग क्या है?', options: ['पानी का बहाव दोनों तरफ करना', 'पानी का बैक-फ़्लो रोकना', 'पाइप साफ करना', 'प्रेशर कम करना'], answer: 'पानी का बैक-फ़्लो रोकना' }
      ]
    },

    // ── CARPENTER ───────────────────────────────────────────────────────────────
    {
      title: 'Modular Kitchen & Hydraulic Hardware Fitting',
      trade: 'CARPENTER',
      language: 'ENGLISH',
      difficulty: 'INTERMEDIATE',
      passingScore: 60,
      questions: [
        { question: 'Which hinge angle is standard for straight-line modular cabinet shutter doors?', options: ['90 Degree', '110 Degree Auto-Concealed Hinge', '180 Degree Pivot', '45 Degree Miter'], answer: '110 Degree Auto-Concealed Hinge' },
        { question: 'What grade of Plywood is recommended for kitchen sink under-cabinets?', options: ['Commercial MR Grade', 'BWP / BWR Boiling Waterproof Marine Ply', 'MDF Board', 'Particle Board'], answer: 'BWP / BWR Boiling Waterproof Marine Ply' },
        { question: 'Standard depth for lower modular kitchen carcass cabinets?', options: ['300 mm', '450 mm', '560 to 600 mm', '900 mm'], answer: '560 to 600 mm' }
      ]
    },
    {
      title: 'Door Frame Assembly & Mortise Lock Installation',
      trade: 'CARPENTER',
      language: 'ENGLISH',
      difficulty: 'ADVANCED',
      passingScore: 70,
      questions: [
        { question: 'Which joint provides high structural strength for solid hardwood door frames?', options: ['Butt Joint', 'Mortise and Tenon Joint', 'Lap Joint', 'Staple Pin Joint'], answer: 'Mortise and Tenon Joint' },
        { question: 'Tool used to check 90-degree squareness of door shutter edges?', options: ['Plumb Bob', 'Try Square / Speed Square', 'Marking Gauge', 'Bevel Gauge'], answer: 'Try Square / Speed Square' }
      ]
    },

    // ── AC_TECHNICIAN ───────────────────────────────────────────────────────────
    {
      title: 'Inverter AC Refrigerant Recovery & Flaring',
      trade: 'AC_TECHNICIAN',
      language: 'ENGLISH',
      difficulty: 'INTERMEDIATE',
      passingScore: 65,
      questions: [
        { question: 'Operating standing pressure of R32 refrigerant at ambient temperature?', options: ['50-70 PSI', '120-130 PSI', '220-260 PSI', '400 PSI'], answer: '220-260 PSI' },
        { question: 'What deep vacuum level is required before charging inverter refrigerant?', options: ['500 Microns or lower', '5000 Microns', '1 Bar', '0 PSI'], answer: '500 Microns or lower' },
        { question: 'Why must R410A / R32 refrigerant be charged in liquid phase?', options: ['It is a blend of refrigerants requiring uniform composition', 'To prevent compressor overheating', 'Because gas phase is non-flammable', 'To increase cooling capacity'], answer: 'It is a blend of refrigerants requiring uniform composition' }
      ]
    },
    {
      title: 'AC PCB Error Code Diagnostics & Capacitor Testing',
      trade: 'AC_TECHNICIAN',
      language: 'ENGLISH',
      difficulty: 'ADVANCED',
      passingScore: 70,
      questions: [
        { question: 'What instrument tests microfarad rating of dual run compressor capacitors?', options: ['Voltmeter', 'Capacitance meter / Multimeter MFD setting', 'Ohmmeter 1k range', 'Ammeter'], answer: 'Capacitance meter / Multimeter MFD setting' },
        { question: 'Communication failure between Indoor & Outdoor PCB usually triggers which code?', options: ['E1 / E6 Error', 'F3 Overload', 'P4 Pressure High', 'C2 Sensor Short'], answer: 'E1 / E6 Error' }
      ]
    },

    // ── PAINTER ─────────────────────────────────────────────────────────────────
    {
      title: 'Surface Preparation, Putty Sanding & Moisture Testing',
      trade: 'PAINTER',
      language: 'ENGLISH',
      difficulty: 'INTERMEDIATE',
      passingScore: 60,
      questions: [
        { question: 'Maximum wall moisture percentage allowed before applying acrylic putty?', options: ['Below 12%', '30%', '50%', '80%'], answer: 'Below 12%' },
        { question: 'Recommended grit sandpaper for smooth finishing coat putty sanding?', options: ['60 Grit', '120 Grit', '180 to 220 Grit', '400 Grit'], answer: '180 to 220 Grit' },
        { question: 'Why is Alkali-Resistant Primer applied on fresh concrete walls?', options: ['To add color tint', 'To neutralize masonry salts & prevent efflorescence peeling', 'To reduce drying time', 'To make wall waterproof without paint'], answer: 'To neutralize masonry salts & prevent efflorescence peeling' }
      ]
    },
    {
      title: 'Texture Coating & Airless Spray Painting',
      trade: 'PAINTER',
      language: 'HINDI',
      difficulty: 'ADVANCED',
      passingScore: 65,
      questions: [
        { question: 'एयरलेस स्प्रे पेंटिंग (Airless Spraying) का मुख्य लाभ क्या है?', options: ['पेंट ज्यादा खर्च होना', 'उच्च गति और समान कवरेज (High speed & uniform coverage)', 'ब्रश के निशान आना', 'रोलर से धीमा होना'], answer: 'उच्च गति और समान कवरेज (High speed & uniform coverage)' }
      ]
    },

    // ── WELDER ──────────────────────────────────────────────────────────────────
    {
      title: 'SMAW Shielded Arc & TIG Pipe Welding Standards',
      trade: 'WELDER',
      language: 'ENGLISH',
      difficulty: 'INTERMEDIATE',
      passingScore: 65,
      questions: [
        { question: 'Which electrode flux coating is recommended for low-alloy structural steel?', options: ['E6010 Cellulose', 'E7018 Low Hydrogen', 'E6013 Rutile', 'Stainless 308 L'], answer: 'E7018 Low Hydrogen' },
        { question: 'What shielding gas is standard for TIG welding mild steel and stainless steel?', options: ['100% Pure Argon', '100% Carbon Dioxide', 'Oxygen Blend', 'Nitrogen'], answer: '100% Pure Argon' },
        { question: 'What causes undercut defect along the weld toe border line?', options: ['Current too low', 'Arc length too high / excessive current', 'Travel speed too slow', 'Using DC reverse polarity'], answer: 'Arc length too high / excessive current' }
      ]
    },
    {
      title: 'MIG Wire Feed & Structural Weld Defect Inspection',
      trade: 'WELDER',
      language: 'ENGLISH',
      difficulty: 'ADVANCED',
      passingScore: 70,
      questions: [
        { question: 'Which non-destructive test (NDT) detects subsurface volumetric weld cracks?', options: ['Visual Inspection', 'Radiographic Testing (RT) / Ultrasonic (UT)', 'Dye Penetrant Test', 'Magnetic Particle Test'], answer: 'Radiographic Testing (RT) / Ultrasonic (UT)' }
      ]
    }
  ];

  for (const tData of tradeTestsData) {
    const existing = await db.tradeTest.findFirst({ where: { title: tData.title } });
    if (!existing) {
      await db.tradeTest.create({
        data: {
          title: tData.title,
          trade: tData.trade,
          language: tData.language,
          difficulty: tData.difficulty,
          passingScore: tData.passingScore,
          questions: tData.questions,
          isActive: true
        }
      });
      console.log(`  ✓ Created TradeTest: [${tData.trade}] ${tData.title}`);
    }
  }

  // 2. Ensure Workers exist for all 6 trades
  const workerTemplates = [
    { id: 'worker-ravi-001', fullName: 'Ravi Kumar', trade: 'ELECTRICIAN', city: 'Bangalore', phone: '9876543210', score: 87, videoUrl: 'https://qywflwdkrckyjdrsadvo.supabase.co/storage/v1/object/public/7kaam-assets/videos/worker-ravi-001/skill_demo.mp4' },
    { id: 'worker-sunita-001', fullName: 'Sunita Patil', trade: 'PLUMBER', city: 'Mumbai', phone: '9876543211', score: 72, videoUrl: 'https://qywflwdkrckyjdrsadvo.supabase.co/storage/v1/object/public/7kaam-assets/videos/worker-sunita-001/plumbing_demo.mp4' },
    { id: 'worker-mohan-001', fullName: 'Mohan Reddy', trade: 'CARPENTER', city: 'Hyderabad', phone: '9876543212', score: 68, videoUrl: 'https://qywflwdkrckyjdrsadvo.supabase.co/storage/v1/object/public/7kaam-assets/videos/worker-mohan-001/carpentry_demo.mp4' },
    { id: 'worker-ac-001', fullName: 'Vikram Singh', trade: 'AC_TECHNICIAN', city: 'Delhi NCR', phone: '9876543213', score: 84, videoUrl: 'https://qywflwdkrckyjdrsadvo.supabase.co/storage/v1/object/public/7kaam-assets/videos/worker-ac-001/ac_demo.mp4' },
    { id: 'worker-painter-001', fullName: 'Rajesh Sharma', trade: 'PAINTER', city: 'Pune', phone: '9876543214', score: 79, videoUrl: 'https://qywflwdkrckyjdrsadvo.supabase.co/storage/v1/object/public/7kaam-assets/videos/worker-painter-001/painter_demo.mp4' },
    { id: 'worker-welder-001', fullName: 'Manish Verma', trade: 'WELDER', city: 'Chennai', phone: '9876543215', score: 91, videoUrl: 'https://qywflwdkrckyjdrsadvo.supabase.co/storage/v1/object/public/7kaam-assets/videos/worker-welder-001/welding_demo.mp4' }
  ];

  for (const wTemp of workerTemplates) {
    let worker = await db.worker.findUnique({ where: { id: wTemp.id } });
    if (!worker) {
      worker = await db.worker.create({
        data: {
          id: wTemp.id,
          fullName: wTemp.fullName,
          trade: wTemp.trade,
          city: wTemp.city,
          phoneNumber: wTemp.phone,
          aadhaarHash: require('crypto').createHash('sha256').update(wTemp.phone).digest('hex'),
          status: 'ACTIVE',
          aadhaarVerified: true,
          videoScore: wTemp.score,
          testScore: wTemp.score + 2,
          workHistoryScore: wTemp.score - 1,
          finalScore: wTemp.score,
          tier: wTemp.score >= 85 ? 'EXPERT' : wTemp.score >= 70 ? 'GOLD' : 'SILVER',
          videoUrl: wTemp.videoUrl
        }
      });
      console.log(`  ✓ Created Worker: [${wTemp.trade}] ${wTemp.fullName}`);
    } else {
      await db.worker.update({
        where: { id: wTemp.id },
        data: {
          videoUrl: wTemp.videoUrl,
          videoScore: wTemp.score,
          testScore: wTemp.score + 2,
          workHistoryScore: wTemp.score - 1,
          finalScore: wTemp.score,
          tier: wTemp.score >= 85 ? 'EXPERT' : wTemp.score >= 70 ? 'GOLD' : 'SILVER'
        }
      });
      console.log(`  ✓ Updated Worker: [${wTemp.trade}] ${wTemp.fullName}`);
    }

    // Ensure KaamCard exists for worker
    const existingCard = await db.kaamCard.findFirst({ where: { workerId: wTemp.id } });
    if (!existingCard) {
      const { generateKaamCard } = require('./src/services/kaamCardGenerator');
      const { pdfUrl, qrToken, kaamCardId } = await generateKaamCard({
        worker: wTemp,
        videoScore: wTemp.score,
        testScore: wTemp.score + 2,
        workHistoryScore: wTemp.score - 1,
        finalScore: wTemp.score,
        tier: wTemp.score >= 85 ? 'EXPERT' : wTemp.score >= 70 ? 'GOLD' : 'SILVER'
      });

      const expiresAt = new Date();
      expiresAt.setFullYear(expiresAt.getFullYear() + 1);

      await db.kaamCard.create({
        data: {
          id: kaamCardId,
          workerId: wTemp.id,
          qrToken,
          pdfUrl,
          version: 1,
          expiresAt: expiresAt.toISOString(),
          scoreBreakdown: {
            videoScore: wTemp.score,
            testScore: wTemp.score + 2,
            workHistoryScore: wTemp.score - 1,
            finalScore: wTemp.score,
            tier: wTemp.score >= 85 ? 'EXPERT' : wTemp.score >= 70 ? 'GOLD' : 'SILVER'
          }
        }
      });
      console.log(`  ✓ Issued KaamCard for ${wTemp.fullName}`);
    }
  }

  console.log('✅ Seeding complete! All 6 trades have trade tests, workers, video assessments & KaamCards.');
  process.exit(0);
}

seed().catch(err => {
  console.error('❌ Seed error:', err);
  process.exit(1);
});
