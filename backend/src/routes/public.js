const router = require('express').Router();
const { authenticateOptional } = require('../middleware/auth');
const { listPublicWorkers, getPublicWorkerProfile } = require('../controllers/publicController');

// Discovery — never includes phoneNumber, no auth needed.
router.get('/workers', listPublicWorkers);

// Profile — phoneNumber only included when a valid customer token is present.
router.get('/workers/:id', authenticateOptional, getPublicWorkerProfile);

module.exports = router;
