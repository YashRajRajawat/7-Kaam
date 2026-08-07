const prisma = require('../utils/prisma');
const { mockVideoScore, computeWorkHistoryScore, computeFinalScore, computeTier } = require('../services/scoringEngine');
const { evaluateTestWithGroq } = require('../services/groqEvaluator');
const { createUploadSignedUrl } = require('../services/supabaseStorage');

// Helper: internal rolling average score recomputation & KaamCard version history update
async function internalComputeScore(workerId) {
  const worker = await prisma.worker.findUnique({
    where: { id: workerId },
    include: { workHistories: true },
  });
  if (!worker) return null;

  // Rolling average for video score from VIDEO scoring logs
  const videoLogs = await prisma.scoringLog.findMany({
    where: { workerId, signalType: 'VIDEO' },
  });
  let videoScore = worker.videoScore ?? 0;
  if (videoLogs && videoLogs.length > 0) {
    videoScore = videoLogs.reduce((acc, log) => acc + log.outputScore, 0) / videoLogs.length;
    videoScore = Math.round(videoScore * 10) / 10;
  }

  // Rolling average for test score from TestSubmissions
  const testSubmissions = await prisma.testSubmission.findMany({
    where: { workerId },
  });
  const validTestSubmissions = testSubmissions.filter(s => s.rawScore != null);
  let testScore = worker.testScore ?? 0;
  if (validTestSubmissions.length > 0) {
    testScore = validTestSubmissions.reduce((acc, s) => acc + s.rawScore, 0) / validTestSubmissions.length;
    testScore = Math.round(testScore * 10) / 10;
  }

  // Work history score
  const workHistoryScore = computeWorkHistoryScore(worker.workHistories || []);

  const finalScore = computeFinalScore(videoScore, testScore, workHistoryScore);
  const tier = computeTier(finalScore);

  await prisma.worker.update({
    where: { id: workerId },
    data: { videoScore, testScore, workHistoryScore, finalScore, tier, status: 'ACTIVE' },
  });

  await prisma.scoringLog.create({
    data: {
      workerId,
      signalType: 'FINAL',
      inputData: { videoScore, testScore, workHistoryScore, videoCount: videoLogs.length, testCount: validTestSubmissions.length },
      outputScore: finalScore,
      notes: `Rolling avg update. Tier: ${tier}`,
    },
  });

  // Update existing KaamCard if present
  let kaamCard = await prisma.kaamCard.findFirst({
    where: { workerId },
  });

  if (kaamCard) {
    const newVersion = (kaamCard.version || 1) + 1;
    const scoreBreakdown = {
      videoScore,
      testScore,
      workHistoryScore,
      finalScore,
      tier,
      videoCount: videoLogs.length || 1,
      testCount: validTestSubmissions.length || 1,
    };

    kaamCard = await prisma.kaamCard.update({
      where: { id: kaamCard.id },
      data: {
        version: newVersion,
        scoreBreakdown,
      },
    });

    await prisma.kaamCardHistory.create({
      data: {
        kaamCardId: kaamCard.id,
        version: newVersion,
        finalScore,
        videoScore,
        testScore,
        workHistoryScore,
        recordedAt: new Date(),
      },
    });
  }

  return { videoScore, testScore, workHistoryScore, finalScore, tier, kaamCard };
}

// Helper: initial KaamCard issuance
async function internalIssueKaamCard(workerId) {
  const worker = await prisma.worker.findUnique({ where: { id: workerId } });
  if (!worker || !worker.finalScore) return null;

  const existing = await prisma.kaamCard.findFirst({ where: { workerId } });
  if (existing) return existing;

  const { generateKaamCard } = require('../services/kaamCardGenerator');
  const { pdfUrl, qrToken, kaamCardId } = await generateKaamCard({
    worker,
    videoScore: worker.videoScore ?? 0,
    testScore: worker.testScore ?? 0,
    workHistoryScore: worker.workHistoryScore ?? 0,
    finalScore: worker.finalScore,
    tier: worker.tier,
  });

  const expiresAt = new Date();
  expiresAt.setFullYear(expiresAt.getFullYear() + 1);

  const kaamCard = await prisma.kaamCard.create({
    data: {
      id: kaamCardId,
      workerId,
      qrToken,
      pdfUrl,
      version: 1,
      expiresAt,
      scoreBreakdown: {
        videoScore: worker.videoScore,
        testScore: worker.testScore,
        workHistoryScore: worker.workHistoryScore,
        finalScore: worker.finalScore,
        tier: worker.tier,
      },
    },
  });

  await prisma.kaamCardHistory.create({
    data: {
      kaamCardId: kaamCard.id,
      version: 1,
      finalScore: worker.finalScore,
      videoScore: worker.videoScore ?? 0,
      testScore: worker.testScore ?? 0,
      workHistoryScore: worker.workHistoryScore ?? 0,
      recordedAt: new Date(),
    },
  });

  await prisma.worker.update({
    where: { id: workerId },
    data: { kaamCardUrl: pdfUrl, kaamCardIssuedAt: new Date(), qrCodeUrl: `https://7kaam.in/verify/${qrToken}` },
  });

  return kaamCard;
}

// POST /api/v1/workers/:id/upload-video — return Supabase presigned upload URL
async function getVideoUploadUrl(req, res) {
  try {
    const { id } = req.params;
    const worker = await prisma.worker.findUnique({ where: { id } });
    if (!worker) return res.status(404).json({ error: 'Worker not found' });

    const path = `videos/${id}/skill_demo.mp4`;
    const signedData = await createUploadSignedUrl(path);

    const { supabase } = require('../services/supabaseStorage');
    const { data: publicData } = supabase.storage.from('7kaam-assets').getPublicUrl(path);

    await prisma.worker.update({ where: { id }, data: { videoUrl: publicData.publicUrl } });

    res.json({ signedUrl: signedData.signedUrl, token: signedData.token, videoUrl: publicData.publicUrl });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// POST /api/v1/workers/:id/score-video
async function scoreVideo(req, res) {
  try {
    const { id } = req.params;
    const { score: customScore, notes } = req.body || {};
    const worker = await prisma.worker.findUnique({ where: { id } });
    if (!worker) return res.status(404).json({ error: 'Worker not found' });

    const score = customScore != null ? Number(customScore) : mockVideoScore();
    const now = new Date();

    await prisma.worker.update({
      where: { id },
      data: { videoScore: score, videoScoredAt: now },
    });

    await prisma.scoringLog.create({
      data: {
        workerId: id,
        signalType: 'VIDEO',
        inputData: { videoUrl: worker.videoUrl },
        outputScore: score,
        notes: notes || 'Admin / AI video score assessment',
      },
    });

    // Recompute score (rolling average) and update KaamCard version if present
    const updatedScores = await internalComputeScore(id);

    // If first video + test passed, auto-issue KaamCard
    const existingKaamCard = await prisma.kaamCard.findFirst({ where: { workerId: id } });
    if (!existingKaamCard && worker.testScore != null && worker.testScore >= 60) {
      await internalIssueKaamCard(id);
    }

    res.json({ videoScore: score, scoredAt: now, updatedScore: updated });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// POST /api/v1/workers/:id/submit-test
async function submitTest(req, res) {
  try {
    const { id } = req.params;
    const { testId, answers } = req.body;

    const [worker, test] = await Promise.all([
      prisma.worker.findUnique({ where: { id } }),
      prisma.tradeTest.findUnique({ where: { id: testId } }),
    ]);

    if (!worker) return res.status(404).json({ error: 'Worker not found' });
    if (!test) return res.status(404).json({ error: 'Test not found' });

    const submission = await prisma.testSubmission.create({
      data: { workerId: id, testId, answers, status: 'EVALUATING' },
    });

    const evaluation = await evaluateTestWithGroq({
      trade: test.trade,
      testTitle: test.title,
      questions: test.questions,
      answers,
    });

    const rawScore = evaluation.totalScore;

    await prisma.testSubmission.update({
      where: { id: submission.id },
      data: { rawScore, aiEvaluation: evaluation, status: 'COMPLETED' },
    });

    await prisma.scoringLog.create({
      data: {
        workerId: id,
        signalType: 'TEST',
        inputData: { testId, answers },
        outputScore: rawScore,
        notes: `Groq LLaMA 3 evaluation — ${evaluation.overallFeedback?.substring(0, 100)}`,
      },
    });

    // Part 2 — Skill Certificate Auto-Issuance (score >= 60)
    let certificateEarned = false;
    let certificateRecord = null;
    if (rawScore >= 60) {
      certificateEarned = true;
      const pdfUrl = `https://qywflwdkrckyjdrsadvo.supabase.co/storage/v1/object/public/7kaam-assets/certificates/${id}_${testId}.pdf`;

      const existingCert = await prisma.skillCertificate.findFirst({
        where: { workerId: id, testId },
      });

      if (existingCert) {
        certificateRecord = await prisma.skillCertificate.update({
          where: { id: existingCert.id },
          data: { score: Math.max(existingCert.score, rawScore), issuedAt: new Date(), pdfUrl },
        });
      } else {
        certificateRecord = await prisma.skillCertificate.create({
          data: {
            workerId: id,
            testId,
            testTitle: test.title,
            trade: test.trade,
            score: rawScore,
            pdfUrl,
          },
        });
      }
    }

    // Trigger score recomputation (rolling average)
    await internalComputeScore(id);

    // Auto-issue KaamCard if worker's FIRST passed test & video uploaded
    const existingKaamCard = await prisma.kaamCard.findFirst({ where: { workerId: id } });
    if (!existingKaamCard && worker.videoUrl && rawScore >= 60) {
      await internalIssueKaamCard(id);
    }

    res.json({
      submissionId: submission.id,
      testScore: rawScore,
      evaluation,
      certificateEarned,
      certificateId: certificateRecord?.id || null,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// POST /api/v1/workers/:id/add-work-history
async function addWorkHistory(req, res) {
  try {
    const { id } = req.params;
    const {
      clientName, employerName,
      clientType = 'HOUSEHOLD',
      clientPhone, employerPhone,
      clientCity,
      projectTitle, role,
      projectDescription,
      trade,
      startDate,
      endDate,
      projectScale = 'SMALL',
      photoUrls = [],
      isVerified = false, verified = false
    } = req.body;

    const worker = await prisma.worker.findUnique({ where: { id } });
    if (!worker) return res.status(404).json({ error: 'Worker not found' });

    const start = new Date(startDate || Date.now());
    const end = endDate ? new Date(endDate) : null;
    const endCalc = end || new Date();
    const durationMonths = Math.max(1, Math.round((endCalc - start) / (1000 * 60 * 60 * 24 * 30.4375)));

    const history = await prisma.workHistory.create({
      data: {
        workerId: id,
        clientName: clientName || employerName || 'Client',
        clientType,
        clientPhone: clientPhone || employerPhone || null,
        clientCity: clientCity || worker.city || 'City',
        projectTitle: projectTitle || role || 'Project',
        projectDescription: projectDescription || 'Work history portfolio entry',
        trade: trade || worker.trade,
        startDate: start,
        endDate: end,
        durationMonths,
        projectScale,
        photoUrls: Array.isArray(photoUrls) ? photoUrls : [],
        isVerified: isVerified === true || isVerified === 'true' || verified === true || verified === 'true',
      },
    });

    // Recompute score & update KaamCard
    await internalComputeScore(id);

    const updatedWorker = await prisma.worker.findUnique({ where: { id } });
    res.status(201).json({ history, workHistoryScore: updatedWorker.workHistoryScore });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// POST /api/v1/workers/:id/compute-score
async function computeScore(req, res) {
  try {
    const { id } = req.params;
    const result = await internalComputeScore(id);
    if (!result) return res.status(404).json({ error: 'Worker not found' });
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// POST /api/v1/workers/:id/issue-kaamcard
async function issueKaamCard(req, res) {
  try {
    const { id } = req.params;
    const kaamCard = await internalIssueKaamCard(id);
    if (!kaamCard) return res.status(400).json({ error: 'Worker not found or final score missing' });
    res.json(kaamCard);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// GET /api/v1/workers/:id/certificates
async function getWorkerCertificates(req, res) {
  try {
    const { id } = req.params;
    const certificates = await prisma.skillCertificate.findMany({
      where: { workerId: id },
      include: { test: true },
      orderBy: { issuedAt: 'desc' },
    });
    res.json(certificates);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// GET /api/v1/certificates/:id
async function getCertificateDetail(req, res) {
  try {
    const { id } = req.params;
    const certificate = await prisma.skillCertificate.findUnique({
      where: { id },
      include: { worker: true, test: true },
    });
    if (!certificate) return res.status(404).json({ error: 'Certificate not found' });
    res.json(certificate);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// GET /api/v1/workers/:id/video-assessments
async function getWorkerVideoAssessments(req, res) {
  try {
    const { id } = req.params;
    const assessments = await prisma.videoAssessment.findMany({
      where: { workerId: id },
      include: { test: true },
      orderBy: { submittedAt: 'desc' },
    });
    res.json(assessments);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// GET /api/v1/workers/:id/kaamcard/history
async function getKaamCardHistory(req, res) {
  try {
    const { id } = req.params;
    const kaamCard = await prisma.kaamCard.findFirst({
      where: { workerId: id },
    });
    if (!kaamCard) return res.json([]);

    const history = await prisma.kaamCardHistory.findMany({
      where: { kaamCardId: kaamCard.id },
      orderBy: { version: 'asc' },
    });
    res.json(history);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

module.exports = {
  getVideoUploadUrl,
  scoreVideo,
  submitTest,
  addWorkHistory,
  computeScore,
  issueKaamCard,
  getWorkerCertificates,
  getCertificateDetail,
  getWorkerVideoAssessments,
  getKaamCardHistory,
};
