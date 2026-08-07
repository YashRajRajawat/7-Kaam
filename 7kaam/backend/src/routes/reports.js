const router = require('express').Router();
const { requireAuth, requireRole } = require('../middleware/auth');
const { createReport } = require('../controllers/reportController');

// Only customers can report a worker.
router.post('/', requireAuth, requireRole('CUSTOMER'), createReport);

module.exports = router;
