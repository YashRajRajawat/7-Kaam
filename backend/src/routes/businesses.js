const router = require('express').Router();
const { requireAuth, requireRole } = require('../middleware/auth');
const {
  listBusinesses,
  businessStats,
  businessFilters,
  getBusiness,
  refreshBusinesses,
  startScrape,
  scrapeStatus,
  stopScrape,
} = require('../controllers/businessController');

const ADMIN_ROLES = ['SUPER_ADMIN', 'CITY_ADMIN', 'REVIEWER'];

// Scraped business data is an internal admin dataset — same access model as
// /analytics and /workers.
router.use(requireAuth, requireRole(...ADMIN_ROLES));

// Scrape control. Declared before /:id so "scrape" is never read as an id.
router.get('/scrape/status', scrapeStatus);
router.post('/scrape', requireRole('SUPER_ADMIN', 'CITY_ADMIN'), startScrape);
router.post('/scrape/stop', requireRole('SUPER_ADMIN', 'CITY_ADMIN'), stopScrape);

router.get('/stats', businessStats);
router.get('/filters', businessFilters);
router.post('/refresh', refreshBusinesses);

router.get('/', listBusinesses);
router.get('/:id', getBusiness);

module.exports = router;
