const prisma = require('../utils/prisma');

// POST /api/v1/reports — customer reports a worker
async function createReport(req, res) {
  try {
    const { workerId, reason, description } = req.body || {};
    if (!workerId || !reason) {
      return res.status(400).json({ error: 'workerId and reason are required' });
    }

    const worker = await prisma.worker.findUnique({ where: { id: workerId } });
    if (!worker) return res.status(404).json({ error: 'Worker not found' });

    const report = await prisma.report.create({
      data: {
        workerId,
        reporterCustomerId: req.auth.id,
        reason,
        description: description || null,
      },
    });

    res.status(201).json({
      message: 'Report submitted — the 7 Kaam team will review it shortly.',
      report,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// GET /api/v1/admin/reports?status=OPEN
async function listReports(req, res) {
  try {
    const { status } = req.query;
    const where = status ? { status } : {};
    const reports = await prisma.report.findMany({
      where,
      include: {
        worker: { select: { fullName: true, trade: true, city: true, status: true } },
        reporterCustomer: { select: { fullName: true, phoneNumber: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json(reports);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// POST /api/v1/admin/reports/:id/dismiss
async function dismissReport(req, res) {
  try {
    const report = await prisma.report.update({
      where: { id: req.params.id },
      data: { status: 'DISMISSED' },
    });
    res.json(report);
  } catch (err) {
    if (err.code === 'P2025') return res.status(404).json({ error: 'Report not found' });
    res.status(500).json({ error: err.message });
  }
}

// POST /api/v1/admin/reports/:id/action — marks the report as acted on.
// The actual enforcement (suspend/revoke/require-recertification) is a
// separate call the admin makes against the worker endpoints; this just
// closes the loop on the report record itself.
async function actionReport(req, res) {
  try {
    const report = await prisma.report.update({
      where: { id: req.params.id },
      data: { status: 'ACTIONED' },
    });
    res.json(report);
  } catch (err) {
    if (err.code === 'P2025') return res.status(404).json({ error: 'Report not found' });
    res.status(500).json({ error: err.message });
  }
}

module.exports = { createReport, listReports, dismissReport, actionReport };
