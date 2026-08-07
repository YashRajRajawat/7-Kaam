const router = require('express').Router();
const { requireAuth, requireRole } = require('../middleware/auth');
const { listKaamCards, getKaamCardByWorker, downloadKaamCardPdf, revokeKaamCard } = require('../controllers/kaamCardController');

const ADMIN_ROLES = ['SUPER_ADMIN', 'CITY_ADMIN', 'REVIEWER'];

// Public Routes (PDF download & KaamCard lookup)
router.get('/:workerId/pdf', downloadKaamCardPdf);
router.get('/:workerId', getKaamCardByWorker);

// Protected Admin Routes
router.use(requireAuth);

router.get('/', requireRole(...ADMIN_ROLES), listKaamCards);
router.post('/:id/revoke', requireRole(...ADMIN_ROLES), revokeKaamCard);

module.exports = router;
