const router = require('express').Router();
const { requireAuth, requireRole } = require('../middleware/auth');
const { overview, byTrade, byCity, scoreDistribution, certificationsOverTime } = require('../controllers/analyticsController');

const ADMIN_ROLES = ['SUPER_ADMIN', 'CITY_ADMIN', 'REVIEWER'];

router.use(requireAuth, requireRole(...ADMIN_ROLES));

router.get('/overview', overview);
router.get('/by-trade', byTrade);
router.get('/by-city', byCity);
router.get('/score-distribution', scoreDistribution);
router.get('/certifications-over-time', certificationsOverTime);

module.exports = router;
