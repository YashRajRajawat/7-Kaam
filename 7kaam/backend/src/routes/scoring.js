const router = require('express').Router();
const { authenticate } = require('../middleware/auth');
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

router.use(authenticate);

router.post('/workers/:id/upload-video', getVideoUploadUrl);
router.post('/workers/:id/score-video', scoreVideo);
router.post('/workers/:id/submit-test', submitTest);
router.post('/workers/:id/add-work-history', addWorkHistory);
router.post('/workers/:id/compute-score', computeScore);
router.post('/workers/:id/issue-kaamcard', issueKaamCard);
router.get('/workers/:id/certificates', getWorkerCertificates);
router.get('/workers/:id/video-assessments', getWorkerVideoAssessments);
router.get('/workers/:id/kaamcard/history', getKaamCardHistory);
router.get('/certificates/:id', getCertificateDetail);

module.exports = router;
