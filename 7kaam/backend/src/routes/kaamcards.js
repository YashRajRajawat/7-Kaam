const router = require('express').Router();
const { authenticate } = require('../middleware/auth');
const { listKaamCards, getKaamCardByWorker, revokeKaamCard } = require('../controllers/kaamCardController');

router.use(authenticate);

router.get('/', listKaamCards);
router.get('/:workerId', getKaamCardByWorker);
router.post('/:id/revoke', revokeKaamCard);

module.exports = router;
