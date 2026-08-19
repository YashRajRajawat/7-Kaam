const router = require('express').Router();
const rateLimit = require('express-rate-limit');
const { authenticateOptional } = require('../middleware/auth');
const { listPublicWorkers, getPublicWorkerProfile } = require('../controllers/publicController');
const { submitListingRequest } = require('../controllers/listingController');

// Discovery — never includes phoneNumber, no auth needed.
router.get('/workers', listPublicWorkers);

// Profile — phoneNumber only for a claimed profile, and only when a valid
// customer token is present (see publicController — critique B6).
router.get('/workers/:id', authenticateOptional, getPublicWorkerProfile);

// Claim / removal requests. Rate limited on the IP axis here and on the :id
// axis inside listingController (5/hour per listing).
const listingRequestLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many listing requests — please try again later.' },
});

router.post('/workers/:id/listing-request', listingRequestLimiter, authenticateOptional, submitListingRequest);

module.exports = router;
