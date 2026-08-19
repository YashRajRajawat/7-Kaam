const router = require('express').Router();
const { requireAuth, requireRole } = require('../middleware/auth');
const { createTest, listTests, getTest, updateTest, deleteTest, getTestCatalogue } = require('../controllers/testController');

const ADMIN_ROLES = ['SUPER_ADMIN', 'CITY_ADMIN', 'REVIEWER'];

router.use(requireAuth);

router.post('/', requireRole(...ADMIN_ROLES), createTest);
router.get('/', requireRole(...ADMIN_ROLES), listTests);
router.get('/catalogue', getTestCatalogue);
router.get('/:id', getTest);
router.patch('/:id', requireRole(...ADMIN_ROLES), updateTest);
router.delete('/:id', requireRole(...ADMIN_ROLES), deleteTest);

module.exports = router;
