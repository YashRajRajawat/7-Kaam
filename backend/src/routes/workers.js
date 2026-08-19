const router = require('express').Router();
const multer = require('multer');
const { createWorker, listWorkers, getWorker, updateWorker, deleteWorker } = require('../controllers/workerController');
const { requireAuth, requireRole } = require('../middleware/auth');

const ADMIN_ROLES = ['SUPER_ADMIN', 'CITY_ADMIN', 'REVIEWER'];
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

// Worker self-registration lives at POST /api/v1/auth/worker/register.
// Everything below is authenticated: workers can fetch/update their own
// profile, admins manage the full directory.
router.use(requireAuth);

router.post('/', requireRole(...ADMIN_ROLES), upload.single('profilePhoto'), createWorker);
router.get('/', requireRole(...ADMIN_ROLES), listWorkers);
router.get('/:id', getWorker);
router.patch('/:id', updateWorker);
router.delete('/:id', requireRole(...ADMIN_ROLES), deleteWorker);

module.exports = router;
