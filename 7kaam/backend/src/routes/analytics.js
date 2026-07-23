const router = require('express').Router();
const { authenticate } = require('../middleware/auth');
const { overview, byTrade, byCity, scoreDistribution, certificationsOverTime } = require('../controllers/analyticsController');

router.use(authenticate);

router.get('/overview', overview);
router.get('/by-trade', byTrade);
router.get('/by-city', byCity);
router.get('/score-distribution', scoreDistribution);
router.get('/certifications-over-time', certificationsOverTime);

module.exports = router;
