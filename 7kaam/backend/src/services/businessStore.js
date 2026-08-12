/**
 * Business Store
 * --------------
 * Reads the business records collected by business_scraper/ and serves them to
 * the API as clean, deduplicated objects.
 *
 * The scraper writes <repo>/Data_Scraped/<site>_businesses.json. That file is
 * the persistence layer: it survives restarts, so a scrape run performed once
 * keeps showing up in the dashboard forever without a database round-trip.
 *
 * Design notes:
 *   - Records are cached in memory and reloaded automatically when any source
 *     file's mtime or size changes. That is what makes a freshly completed
 *     scrape appear in the UI without restarting the server.
 *   - Every failure mode is non-fatal: a missing directory, a corrupt JSON
 *     file, a record that is not an object, or a stray non-array payload all
 *     degrade to "fewer records", never to a 500.
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// <repo>/Data_Scraped — backend lives at <repo>/7kaam/backend/src/services
const DEFAULT_DATA_DIR = path.resolve(__dirname, '../../../../Data_Scraped');

// Files matching this pattern are treated as scraper output.
const JSON_FILE_PATTERN = /_businesses\.json$/i;

// Google Maps embeds private-use glyphs and narrow no-break spaces in the
// opening-hours blob. Stripping them keeps the dashboard readable.
// U+202F narrow no-break space, U+2009 thin space, U+00A0 no-break space.
// Built from escape sequences so the pattern survives any re-encoding.
const JUNK_CHARS = new RegExp('[\u202f\u2009\u00a0]', 'g');
// U+E000-U+F8FF private-use area (Maps uses these as day separators)
const PRIVATE_USE = new RegExp('[\ue000-\uf8ff]', 'g');

let cache = {
  records: [],
  signature: null,
  loadedAt: null,
  sources: [],
  errors: [],
};

function getDataDir() {
  const configured = (process.env.SCRAPED_DATA_DIR || '').trim();
  return configured ? path.resolve(configured) : DEFAULT_DATA_DIR;
}

/**
 * A cheap fingerprint of the data directory: file names + sizes + mtimes.
 * When it changes, the cache is rebuilt.
 */
function directorySignature(dir) {
  let entries;
  try {
    entries = fs.readdirSync(dir);
  } catch {
    return 'missing';
  }

  const parts = [];
  for (const name of entries.sort()) {
    if (!JSON_FILE_PATTERN.test(name)) continue;
    try {
      const stat = fs.statSync(path.join(dir, name));
      parts.push(`${name}:${stat.size}:${stat.mtimeMs}`);
    } catch {
      // File vanished between readdir and stat — ignore it.
    }
  }
  return parts.join('|') || 'empty';
}

function cleanText(value) {
  if (value === null || value === undefined) return null;
  const text = String(value).replace(PRIVATE_USE, ' ').replace(JUNK_CHARS, ' ').trim();
  return text.length ? text.replace(/\s{2,}/g, ' ') : null;
}

function toNumber(value) {
  if (value === null || value === undefined || value === '') return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function toInt(value) {
  const n = toNumber(value);
  return n === null ? null : Math.round(n);
}

function toBool(value) {
  if (value === true || value === false) return value;
  if (value === 'True' || value === 'true') return true;
  if (value === 'False' || value === 'false') return false;
  return null;
}

function toList(value) {
  if (Array.isArray(value)) return value.map(cleanText).filter(Boolean);
  const text = cleanText(value);
  if (!text) return [];
  return text.split(',').map((s) => s.trim()).filter(Boolean);
}

/**
 * Google Maps concatenates the weekly schedule into a single string. Split it
 * back into day-sized chunks so the UI can render it as a list.
 */
function parseOpeningHours(raw) {
  const text = cleanText(raw);
  if (!text) return { openingHours: null, openingHoursList: [] };

  const cleaned = text.replace(/Suggest new hours\s*$/i, '').trim();
  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  const pattern = new RegExp(`(${days.join('|')})`, 'g');

  const segments = cleaned.split(pattern).filter((s) => s && s.trim());
  const list = [];
  for (let i = 0; i < segments.length; i += 1) {
    if (days.includes(segments[i]) && segments[i + 1]) {
      const hours = segments[i + 1].trim();
      if (hours) list.push({ day: segments[i], hours });
      i += 1;
    }
  }

  return { openingHours: cleaned, openingHoursList: list };
}

/**
 * Derive the search area from the address. The scraper does not persist the
 * area it searched, but the locality is present in the Google-formatted
 * address as the second-to-last comma segment before the city.
 */
function deriveArea(address) {
  if (!address) return null;
  const parts = address.split(',').map((s) => s.trim()).filter(Boolean);
  if (parts.length < 3) return null;
  // Trailing segments are typically "..., Bengaluru, Karnataka 560029"
  const withoutTail = parts.slice(0, -2);
  return withoutTail.length ? withoutTail[withoutTail.length - 1] : null;
}

function stableId(record) {
  const seed = record.source_url || `${record.business_name}|${record.phone_number}|${record.address}`;
  return crypto.createHash('sha1').update(String(seed)).digest('hex').slice(0, 16);
}

/**
 * Convert one raw scraper record into the shape the dashboard consumes.
 * Returns null for records that carry no usable identity.
 */
function normalise(raw, sourceFile) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;

  const name = cleanText(raw.business_name);
  if (!name) return null; // a business without a name is not displayable

  const address = cleanText(raw.address);
  const { openingHours, openingHoursList } = parseOpeningHours(raw.opening_hours);

  const phone = cleanText(raw.phone_number);

  return {
    id: stableId(raw),
    name,
    category: cleanText(raw.business_category) || 'Uncategorised',
    address,
    area: deriveArea(address),
    city: cleanText(raw.city) || null,
    state: cleanText(raw.state) || null,
    pincode: cleanText(raw.pincode) || null,
    latitude: toNumber(raw.latitude),
    longitude: toNumber(raw.longitude),
    phoneNumber: phone,
    website: cleanText(raw.website),
    email: cleanText(raw.email),
    openingHours,
    openingHoursList,
    openNow: toBool(raw.open_now),
    rating: toNumber(raw.rating),
    reviewCount: toInt(raw.review_count),
    description: cleanText(raw.description),
    services: toList(raw.services),
    status: cleanText(raw.business_status) || 'Unknown',
    sourceUrl: cleanText(raw.source_url),
    collectedAt: cleanText(raw.collected_timestamp),
    source: sourceFile.replace(/_businesses\.json$/i, '').replace(/_/g, ' '),
  };
}

/**
 * Read every *_businesses.json in the data directory and return normalised,
 * deduplicated records.
 *
 * Deduplication mirrors the scraper's own rules: source_url is the primary
 * key, phone number the secondary. When two records collide, the one with more
 * populated fields wins, so a richer later scrape upgrades a sparse earlier one.
 */
function readAll(dir) {
  const errors = [];
  const sources = [];

  let fileNames = [];
  try {
    fileNames = fs.readdirSync(dir).filter((f) => JSON_FILE_PATTERN.test(f)).sort();
  } catch (err) {
    if (err.code === 'ENOENT') {
      errors.push(`Data directory not found: ${dir}`);
    } else {
      errors.push(`Cannot read data directory ${dir}: ${err.message}`);
    }
    return { records: [], errors, sources };
  }

  const byUrl = new Map();
  const byPhone = new Map();
  const anonymous = [];

  const score = (r) => Object.values(r).filter((v) => v !== null && v !== '' && !(Array.isArray(v) && !v.length)).length;

  for (const fileName of fileNames) {
    const filePath = path.join(dir, fileName);
    let parsed;
    try {
      parsed = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    } catch (err) {
      errors.push(`Skipped ${fileName}: ${err.message}`);
      continue;
    }

    if (!Array.isArray(parsed)) {
      errors.push(`Skipped ${fileName}: expected a JSON array of records`);
      continue;
    }

    let kept = 0;
    for (const raw of parsed) {
      const record = normalise(raw, fileName);
      if (!record) continue;
      kept += 1;

      if (record.sourceUrl) {
        const existing = byUrl.get(record.sourceUrl);
        if (!existing || score(record) > score(existing)) byUrl.set(record.sourceUrl, record);
        continue;
      }
      if (record.phoneNumber) {
        const existing = byPhone.get(record.phoneNumber);
        if (!existing || score(record) > score(existing)) byPhone.set(record.phoneNumber, record);
        continue;
      }
      anonymous.push(record);
    }

    sources.push({ file: fileName, records: kept });
  }

  // Second pass: drop URL-keyed records whose phone duplicates another entry.
  const records = [];
  const seenPhones = new Set();

  for (const record of [...byUrl.values(), ...byPhone.values(), ...anonymous]) {
    if (record.phoneNumber) {
      if (seenPhones.has(record.phoneNumber)) continue;
      seenPhones.add(record.phoneNumber);
    }
    records.push(record);
  }

  records.sort((a, b) => {
    const at = a.collectedAt || '';
    const bt = b.collectedAt || '';
    if (at !== bt) return bt.localeCompare(at); // newest first
    return a.name.localeCompare(b.name);
  });

  return { records, errors, sources };
}

/**
 * Return all business records, reloading from disk when the files have changed.
 * `force` bypasses the signature check (used right after a scrape finishes).
 */
function getBusinesses({ force = false } = {}) {
  const dir = getDataDir();
  const signature = directorySignature(dir);

  if (!force && cache.signature === signature) {
    return cache;
  }

  const { records, errors, sources } = readAll(dir);
  cache = {
    records,
    signature,
    loadedAt: new Date().toISOString(),
    sources,
    errors,
    dataDir: dir,
  };

  if (errors.length) {
    console.warn(`[businessStore] Loaded ${records.length} records with ${errors.length} warning(s):`);
    errors.forEach((e) => console.warn(`  - ${e}`));
  } else {
    console.log(`[businessStore] Loaded ${records.length} business records from ${dir}`);
  }

  return cache;
}

module.exports = { getBusinesses, getDataDir };
