const router = require('express').Router();
const multer = require('multer');
const { createWorker, listWorkers, getWorker, updateWorker, deleteWorker } = require('../controllers/workerController');
const { suppressListing, updateClaimStatus } = require('../controllers/listingController');
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

// Listing lifecycle — admin only, and never reachable through PATCH /:id
// (provenance and claim state are deliberately absent from updateWorker's
// `allowed` list, §D.8).
// `suppress` is what "remove this listing" must call: DELETE /:id only flips
// status to SUSPENDED, leaving suppressedAt NULL so the next import run
// resurrects the row (critique D9).
router.post('/:id/suppress', requireRole(...ADMIN_ROLES), suppressListing);
router.patch('/:id/claim-status', requireRole(...ADMIN_ROLES), updateClaimStatus);

router.patch('/:id', updateWorker);
router.delete('/:id', requireRole(...ADMIN_ROLES), deleteWorker);

module.exports = router;
