const prisma = require('../utils/prisma');
const { mockVideoScore, computeWorkHistoryScore, computeFinalScore, computeTier } = require('../services/scoringEngine');
const { evaluateTestWithGroq } = require('../services/groqEvaluator');
const { createUploadSignedUrl } = require('../services/supabaseStorage');

// POST /api/v1/workers/:id/upload-video — return Supabase presigned upload URL
async function getVideoUploadUrl(req, res) {
  try {
    const { id } = req.params;
    const worker = await prisma.worker.findUnique({ where: { id } });
    if (!worker) return res.status(404).json({ error: 'Worker not found' });

    const path = `videos/${id}/skill_demo.mp4`;
    const signedData = await createUploadSignedUrl(path);

    // Save the expected video URL (public) optimistically
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
    const worker = await prisma.worker.findUnique({ where: { id } });
    if (!worker) return res.status(404).json({ error: 'Worker not found' });

    const score = mockVideoScore();
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
        notes: 'Mock CV model score (TODO: replace with real CV)',
      },
    });

    res.json({ videoScore: score, scoredAt: now });
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

    // Create submission record (EVALUATING)
    const submission = await prisma.testSubmission.create({
      data: { workerId: id, testId, answers, status: 'EVALUATING' },
    });

    // Evaluate with Groq
    const evaluation = await evaluateTestWithGroq({
      trade: test.trade,
      testTitle: test.title,
      questions: test.questions,
      answers,
    });

    const rawScore = evaluation.totalScore;

    // Update submission
    await prisma.testSubmission.update({
      where: { id: submission.id },
      data: { rawScore, aiEvaluation: evaluation, status: 'COMPLETED' },
    });

    // Update worker test score (take latest)
    const now = new Date();
    await prisma.worker.update({
      where: { id },
      data: { testScore: rawScore, testScoredAt: now },
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

    res.json({ submissionId: submission.id, testScore: rawScore, evaluation });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// POST /api/v1/workers/:id/add-work-history
async function addWorkHistory(req, res) {
  try {
    const { id } = req.params;
    const { employerName, employerPhone, role, startDate, endDate, rating, verified } = req.body;

    const worker = await prisma.worker.findUnique({ where: { id } });
    if (!worker) return res.status(404).json({ error: 'Worker not found' });

    const history = await prisma.workHistory.create({
      data: {
        workerId: id,
        employerName,
        employerPhone,
        role,
        startDate: new Date(startDate),
        endDate: endDate ? new Date(endDate) : null,
        rating: Number(rating),
        verified: verified === true || verified === 'true',
      },
    });

    // Recompute work history score
    const allHistories = await prisma.workHistory.findMany({ where: { workerId: id } });
    const workHistoryScore = computeWorkHistoryScore(allHistories);

    await prisma.worker.update({ where: { id }, data: { workHistoryScore } });

    await prisma.scoringLog.create({
      data: {
        workerId: id,
        signalType: 'WORK_HISTORY',
        inputData: { employerName, rating, verified },
        outputScore: workHistoryScore,
        notes: `Work history updated — ${allHistories.length} entries`,
      },
    });

    res.status(201).json({ history, workHistoryScore });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// POST /api/v1/workers/:id/compute-score
async function computeScore(req, res) {
  try {
    const { id } = req.params;
    const worker = await prisma.worker.findUnique({
      where: { id },
      include: { workHistories: true },
    });
    if (!worker) return res.status(404).json({ error: 'Worker not found' });

    const videoScore = worker.videoScore ?? 0;
    const testScore = worker.testScore ?? 0;
    const workHistoryScore = worker.workHistoryScore ?? computeWorkHistoryScore(worker.workHistories);

    const finalScore = computeFinalScore(videoScore, testScore, workHistoryScore);
    const tier = computeTier(finalScore);

    await prisma.worker.update({
      where: { id },
      data: { finalScore, tier, workHistoryScore, status: 'ACTIVE' },
    });

    await prisma.scoringLog.create({
      data: {
        workerId: id,
        signalType: 'FINAL',
        inputData: { videoScore, testScore, workHistoryScore },
        outputScore: finalScore,
        notes: `Tier: ${tier}`,
      },
    });

    res.json({ finalScore, tier, videoScore, testScore, workHistoryScore });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// POST /api/v1/workers/:id/issue-kaamcard
async function issueKaamCard(req, res) {
  try {
    const { id } = req.params;
    const worker = await prisma.worker.findUnique({ where: { id } });
    if (!worker) return res.status(404).json({ error: 'Worker not found' });
    if (!worker.finalScore) return res.status(400).json({ error: 'Compute final score first' });

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
        workerId: id,
        qrToken,
        pdfUrl,
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

    await prisma.worker.update({
      where: { id },
      data: { kaamCardUrl: pdfUrl, kaamCardIssuedAt: new Date(), qrCodeUrl: `https://7kaam.in/verify/${qrToken}` },
    });

    res.json(kaamCard);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

module.exports = { getVideoUploadUrl, scoreVideo, submitTest, addWorkHistory, computeScore, issueKaamCard };
