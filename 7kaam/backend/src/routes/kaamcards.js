const router = require('express').Router();
const { requireAuth, requireRole } = require('../middleware/auth');
const { listKaamCards, getKaamCardByWorker, revokeKaamCard } = require('../controllers/kaamCardController');

const ADMIN_ROLES = ['SUPER_ADMIN', 'CITY_ADMIN', 'REVIEWER'];

router.use(requireAuth);

router.get('/', requireRole(...ADMIN_ROLES), listKaamCards);
router.get('/:workerId', getKaamCardByWorker);
router.post('/:id/revoke', requireRole(...ADMIN_ROLES), revokeKaamCard);

module.exports = router;
