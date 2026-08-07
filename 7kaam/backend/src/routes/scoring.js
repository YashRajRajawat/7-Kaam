const router = require('express').Router();
const { requireAuth, requireRole } = require('../middleware/auth');
const {
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
} = require('../controllers/scoringController');

const ADMIN_ROLES = ['SUPER_ADMIN', 'CITY_ADMIN', 'REVIEWER'];

// Public Read Routes (Certificates, Video Assessments, KaamCard History)
router.get('/workers/:id/certificates', getWorkerCertificates);
router.get('/workers/:id/video-assessments', getWorkerVideoAssessments);
router.get('/workers/:id/kaamcard/history', getKaamCardHistory);
router.get('/certificates/:id', getCertificateDetail);

// Protected Routes
router.use(requireAuth);

// Worker-facing write operations (self-service assessment submission)
router.post('/workers/:id/upload-video', getVideoUploadUrl);
router.post('/workers/:id/submit-test', submitTest);
router.post('/workers/:id/add-work-history', addWorkHistory);

// Admin-only write operations (manual video scoring, KaamCard issuance, forced recompute)
router.post('/workers/:id/score-video', requireRole(...ADMIN_ROLES), scoreVideo);
router.post('/workers/:id/compute-score', requireRole(...ADMIN_ROLES), computeScore);
router.post('/workers/:id/issue-kaamcard', requireRole(...ADMIN_ROLES), issueKaamCard);

module.exports = router;
