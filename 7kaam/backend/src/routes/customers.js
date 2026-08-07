const router = require('express').Router();
const { requireAuth, requireRole } = require('../middleware/auth');
const { updateCustomer } = require('../controllers/customerController');

router.patch('/:id', requireAuth, requireRole('CUSTOMER'), updateCustomer);

module.exports = router;
