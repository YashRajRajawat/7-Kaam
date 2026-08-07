const prisma = require('../utils/prisma');

const ADMIN_ROLES = ['SUPER_ADMIN', 'CITY_ADMIN', 'REVIEWER'];

// Questions are stored with `correctAnswer` (and other grader-only fields)
// for Groq evaluation. That's fine for admin test management, but a worker
// legitimately calling GET /tests/:id or /tests/catalogue with their own
// token must never see the answer before taking the test.
function sanitizeTestForCaller(test, req) {
  if (!test || ADMIN_ROLES.includes(req.auth?.role)) return test;
  const questions = Array.isArray(test.questions)
    ? test.questions.map(({ correctAnswer, ...rest }) => rest)
    : test.questions;
  return { ...test, questions };
}

// POST /api/v1/tests
async function createTest(req, res) {
  try {
    const { trade, language, title, questions } = req.body;
    let createdBy = req.auth?.id || null;
    if (createdBy) {
      const adminExists = await prisma.admin.findUnique({ where: { id: createdBy } });
      if (!adminExists) createdBy = null;
    }
    const test = await prisma.tradeTest.create({
      data: { trade, language, title, questions, createdBy },
    });
    res.status(201).json(test);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// GET /api/v1/tests
async function listTests(req, res) {
  try {
    const { trade, language, isActive } = req.query;
    const where = {};
    if (trade) where.trade = trade;
    if (language) where.language = language;
    if (isActive !== undefined) where.isActive = isActive === 'true';

    const tests = await prisma.tradeTest.findMany({
      where,
      include: { admin: { select: { email: true } }, _count: { select: { submissions: true } } },
      orderBy: { createdAt: 'desc' },
    });
    res.json(tests);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// GET /api/v1/tests/:id
async function getTest(req, res) {
  try {
    const test = await prisma.tradeTest.findUnique({
      where: { id: req.params.id },
      include: { admin: { select: { email: true } }, submissions: { take: 5, orderBy: { submittedAt: 'desc' } } },
    });
    if (!test) return res.status(404).json({ error: 'Test not found' });
    res.json(sanitizeTestForCaller(test, req));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// PATCH /api/v1/tests/:id
async function updateTest(req, res) {
  try {
    const allowed = ['title', 'questions', 'isActive'];
    const data = {};
    allowed.forEach((k) => { if (req.body[k] !== undefined) data[k] = req.body[k]; });

    const test = await prisma.tradeTest.update({ where: { id: req.params.id }, data });
    res.json(test);
  } catch (err) {
    if (err.code === 'P2025') return res.status(404).json({ error: 'Test not found' });
    res.status(500).json({ error: err.message });
  }
}

// DELETE /api/v1/tests/:id
async function deleteTest(req, res) {
  try {
    await prisma.tradeTest.delete({ where: { id: req.params.id } });
    res.json({ message: 'Test deleted' });
  } catch (err) {
    if (err.code === 'P2025') return res.status(404).json({ error: 'Test not found' });
    res.status(500).json({ error: err.message });
  }
}

// GET /api/v1/tests/catalogue — Coursera-style test catalogue grouped by category
async function getTestCatalogue(req, res) {
  try {
    const { trade = 'ELECTRICIAN', category, difficulty, language, search, workerId } = req.query;

    const where = { isActive: true };
    if (trade) where.trade = trade;
    if (category && category !== 'All') where.category = category;
    if (difficulty && difficulty !== 'All') where.difficulty = difficulty;
    if (language) where.language = language;

    let tests = await prisma.tradeTest.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });

    if (search && search.trim().length > 0) {
      const q = search.trim().toLowerCase();
      tests = tests.filter(t => t.title.toLowerCase().includes(q) || t.description.toLowerCase().includes(q));
    }

    let workerSubmissions = [];
    let workerCertificates = [];
    let workerVideoAssessments = [];

    if (workerId) {
      workerSubmissions = await prisma.testSubmission.findMany({ where: { workerId } });
      workerCertificates = await prisma.skillCertificate.findMany({ where: { workerId } });
      workerVideoAssessments = await prisma.videoAssessment.findMany({ where: { workerId } });
    }

    const mapTestItem = (t) => {
      let workerBestScore = null;
      let workerAttempts = 0;
      let certificateEarned = false;

      if (t.isVideoAssessment) {
        const attempts = workerVideoAssessments.filter(v => v.testId === t.id);
        workerAttempts = attempts.length;
        const scored = attempts.filter(v => v.score != null);
        if (scored.length > 0) {
          workerBestScore = Math.max(...scored.map(v => v.score));
        }
      } else {
        const subs = workerSubmissions.filter(s => s.testId === t.id);
        workerAttempts = subs.length;
        const valid = subs.filter(s => s.rawScore != null);
        if (valid.length > 0) {
          workerBestScore = Math.max(...valid.map(s => s.rawScore));
        }
        certificateEarned = workerCertificates.some(c => c.testId === t.id);
      }

      return {
        ...t,
        workerBestScore,
        workerAttempts,
        certificateEarned,
      };
    };

    const enrichedTests = tests.map(mapTestItem).map((t) => sanitizeTestForCaller(t, req));

    // Group tests by category
    const categoryMap = {};
    for (const test of enrichedTests) {
      const cat = test.category || 'General';
      if (!categoryMap[cat]) categoryMap[cat] = [];
      categoryMap[cat].push(test);
    }

    const grouped = Object.entries(categoryMap).map(([category, tests]) => ({
      category,
      tests,
    }));

    res.json({ categories: grouped, totalCount: enrichedTests.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

module.exports = { createTest, listTests, getTest, updateTest, deleteTest, getTestCatalogue };
