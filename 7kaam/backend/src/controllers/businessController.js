/**
 * Business Controller
 * -------------------
 * Serves the businesses collected by business_scraper/ to the admin dashboard.
 * Data comes from businessStore (file-backed, auto-reloading) rather than
 * Prisma — the scraper's JSON output is the system of record for this dataset.
 */

const businessStore = require('../services/businessStore');
const scraperRunner = require('../services/scraperRunner');

const MAX_LIMIT = 200;

function clampInt(value, fallback, min, max) {
  const n = Number.parseInt(value, 10);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(Math.max(n, min), max);
}

/**
 * Match every whitespace-separated term against the record's combined text.
 * "carpenter jayanagar" therefore finds a carpenter whose address is in
 * Jayanagar, even though no single field contains that exact phrase.
 */
function matchesSearch(business, terms) {
  if (!terms.length) return true;
  const haystack = [
    business.name,
    business.category,
    business.address,
    business.area,
    business.city,
    business.pincode,
    business.phoneNumber,
    business.description,
  ].filter(Boolean).join(' ').toLowerCase();

  return terms.every((term) => haystack.includes(term));
}

// Null-prototype so a query like ?sort=__proto__ or ?sort=valueOf resolves to
// undefined instead of an inherited Object.prototype member — a plain object
// literal would hand Array#sort a non-function and throw a 500.
const SORTERS = Object.assign(Object.create(null), {
  recent: (a, b) => String(b.collectedAt || '').localeCompare(String(a.collectedAt || '')),
  name: (a, b) => a.name.localeCompare(b.name),
  rating: (a, b) => (b.rating ?? -1) - (a.rating ?? -1),
  reviews: (a, b) => (b.reviewCount ?? -1) - (a.reviewCount ?? -1),
});

const DEFAULT_SORT = 'recent';

function resolveSort(value) {
  const key = String(value ?? '');
  return typeof SORTERS[key] === 'function' ? key : DEFAULT_SORT;
}

// GET /api/v1/businesses
function listBusinesses(req, res) {
  try {
    const { records, loadedAt, errors, dataDir } = businessStore.getBusinesses();

    const searchTerms = String(req.query.search || '').trim().toLowerCase().split(/\s+/).filter(Boolean);
    const category = String(req.query.category || '').trim().toLowerCase();
    const city = String(req.query.city || '').trim().toLowerCase();
    const area = String(req.query.area || '').trim().toLowerCase();
    const status = String(req.query.status || '').trim().toLowerCase();
    const hasPhone = String(req.query.hasPhone || '') === 'true';
    const hasWebsite = String(req.query.hasWebsite || '') === 'true';
    const minRating = Number.parseFloat(req.query.minRating);
    const sort = resolveSort(req.query.sort);

    const page = clampInt(req.query.page, 1, 1, 100000);
    const limit = clampInt(req.query.limit, 12, 1, MAX_LIMIT);

    const filtered = records.filter((b) => {
      if (!matchesSearch(b, searchTerms)) return false;
      if (category && String(b.category || '').toLowerCase() !== category) return false;
      if (city && String(b.city || '').toLowerCase() !== city) return false;
      if (area && !String(b.area || '').toLowerCase().includes(area)) return false;
      if (status && String(b.status || '').toLowerCase() !== status) return false;
      if (hasPhone && !b.phoneNumber) return false;
      if (hasWebsite && !b.website) return false;
      if (Number.isFinite(minRating) && !(Number(b.rating) >= minRating)) return false;
      return true;
    });

    filtered.sort(SORTERS[sort]);

    const start = (page - 1) * limit;
    const data = filtered.slice(start, start + limit);

    res.json({
      data,
      total: filtered.length,
      page,
      limit,
      totalAvailable: records.length,
      loadedAt,
      dataDir,
      warnings: errors,
    });
  } catch (err) {
    console.error('[businesses] list failed:', err);
    res.status(500).json({ error: err.message });
  }
}

// GET /api/v1/businesses/stats
function businessStats(req, res) {
  try {
    const { records, loadedAt, sources, errors, dataDir } = businessStore.getBusinesses();

    const byCategory = new Map();
    const byArea = new Map();
    const byCity = new Map();

    let withPhone = 0;
    let withWebsite = 0;
    let withLocation = 0;
    let ratingSum = 0;
    let ratingCount = 0;
    let latestCollectedAt = null;

    for (const b of records) {
      byCategory.set(b.category, (byCategory.get(b.category) || 0) + 1);
      if (b.area) byArea.set(b.area, (byArea.get(b.area) || 0) + 1);
      if (b.city) byCity.set(b.city, (byCity.get(b.city) || 0) + 1);

      if (b.phoneNumber) withPhone += 1;
      if (b.website) withWebsite += 1;
      if (b.latitude != null && b.longitude != null) withLocation += 1;
      if (Number.isFinite(b.rating)) {
        ratingSum += b.rating;
        ratingCount += 1;
      }
      if (b.collectedAt && (!latestCollectedAt || b.collectedAt > latestCollectedAt)) {
        latestCollectedAt = b.collectedAt;
      }
    }

    const topN = (map, n) => [...map.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, n)
      .map(([name, count]) => ({ name, count }));

    res.json({
      total: records.length,
      withPhone,
      withWebsite,
      withLocation,
      averageRating: ratingCount ? Number((ratingSum / ratingCount).toFixed(2)) : null,
      categoryCount: byCategory.size,
      areaCount: byArea.size,
      topCategories: topN(byCategory, 8),
      topAreas: topN(byArea, 8),
      cities: topN(byCity, 10),
      latestCollectedAt,
      loadedAt,
      sources,
      dataDir,
      warnings: errors,
    });
  } catch (err) {
    console.error('[businesses] stats failed:', err);
    res.status(500).json({ error: err.message });
  }
}

// GET /api/v1/businesses/filters — distinct values for the UI dropdowns
function businessFilters(req, res) {
  try {
    const { records } = businessStore.getBusinesses();

    const categories = new Set();
    const cities = new Set();
    const areas = new Set();
    const statuses = new Set();

    for (const b of records) {
      if (b.category) categories.add(b.category);
      if (b.city) cities.add(b.city);
      if (b.area) areas.add(b.area);
      if (b.status) statuses.add(b.status);
    }

    const sorted = (set) => [...set].sort((a, b) => a.localeCompare(b));

    res.json({
      categories: sorted(categories),
      cities: sorted(cities),
      areas: sorted(areas),
      statuses: sorted(statuses),
    });
  } catch (err) {
    console.error('[businesses] filters failed:', err);
    res.status(500).json({ error: err.message });
  }
}

// GET /api/v1/businesses/:id
function getBusiness(req, res) {
  try {
    const { records } = businessStore.getBusinesses();
    const business = records.find((b) => b.id === req.params.id);
    if (!business) return res.status(404).json({ error: 'Business not found' });
    res.json(business);
  } catch (err) {
    console.error('[businesses] detail failed:', err);
    res.status(500).json({ error: err.message });
  }
}

// POST /api/v1/businesses/refresh — force a re-read from disk
function refreshBusinesses(req, res) {
  try {
    const { records, loadedAt, errors } = businessStore.getBusinesses({ force: true });
    res.json({ total: records.length, loadedAt, warnings: errors });
  } catch (err) {
    console.error('[businesses] refresh failed:', err);
    res.status(500).json({ error: err.message });
  }
}

// POST /api/v1/businesses/scrape — start a scrape run
function startScrape(req, res) {
  const result = scraperRunner.startScrape(req.body || {});
  if (!result.ok) {
    return res.status(result.status || 400).json({ error: result.error });
  }
  res.status(202).json(result.job);
}

// GET /api/v1/businesses/scrape/status
function scrapeStatus(req, res) {
  res.json(scraperRunner.getStatus());
}

// POST /api/v1/businesses/scrape/stop
function stopScrape(req, res) {
  const result = scraperRunner.stopScrape();
  if (!result.ok) {
    return res.status(result.status || 409).json({ error: result.error });
  }
  res.json({ stopped: true });
}

module.exports = {
  listBusinesses,
  businessStats,
  businessFilters,
  getBusiness,
  refreshBusinesses,
  startScrape,
  scrapeStatus,
  stopScrape,
};
