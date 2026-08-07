const router = require('express').Router();
const { requireAuth, requireRole } = require('../middleware/auth');
const { listWorkers } = require('../controllers/workerController');
const {
  issueKaamCardAdmin,
  suspendWorker,
  reactivateWorker,
  requireRecertification,
  pendingReviewQueue,
} = require('../controllers/adminController');
const { revokeKaamCard } = require('../controllers/kaamCardController');
const { overview } = require('../controllers/analyticsController');
const { listReports, dismissReport, actionReport } = require('../controllers/reportController');

const ADMIN_ROLES = ['SUPER_ADMIN', 'CITY_ADMIN', 'REVIEWER'];

router.use(requireAuth, requireRole(...ADMIN_ROLES));

router.get('/workers', listWorkers);
router.get('/workers/pending-review', pendingReviewQueue);
router.post('/workers/:id/issue-kaamcard', issueKaamCardAdmin);
router.post('/workers/:id/suspend', suspendWorker);
router.post('/workers/:id/reactivate', reactivateWorker);
router.post('/workers/:id/require-recertification', requireRecertification);

router.post('/kaamcards/:id/revoke', revokeKaamCard);

router.get('/analytics/overview', overview);

router.get('/reports', listReports);
router.post('/reports/:id/dismiss', dismissReport);
router.post('/reports/:id/action', actionReport);

module.exports = router;
