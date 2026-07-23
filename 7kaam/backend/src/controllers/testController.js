const prisma = require('../utils/prisma');

// POST /api/v1/tests
async function createTest(req, res) {
  try {
    const { trade, language, title, questions } = req.body;
    let createdBy = req.admin?.id || null;
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
    res.json(test);
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

module.exports = { createTest, listTests, getTest, updateTest, deleteTest };
