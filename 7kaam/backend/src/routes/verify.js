const router = require('express').Router();
const { verifyKaamCard } = require('../controllers/kaamCardController');

// PUBLIC — no auth
router.get('/:qrToken', verifyKaamCard);

module.exports = router;
