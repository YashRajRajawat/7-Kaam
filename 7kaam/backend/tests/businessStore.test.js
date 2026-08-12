/**
 * Tests for the file-backed business directory (src/services/businessStore.js).
 *
 * This store is the persistence layer for scraped businesses, so the things
 * worth pinning are: it never throws on bad input, it de-duplicates, and it
 * reloads when the scraper writes new data.
 */

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

/** Point the store at a throwaway directory and load a fresh copy of it. */
function withDataDir(files) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'bizstore-'));
  for (const [name, contents] of Object.entries(files)) {
    fs.writeFileSync(
      path.join(dir, name),
      typeof contents === 'string' ? contents : JSON.stringify(contents),
      'utf-8'
    );
  }
  process.env.SCRAPED_DATA_DIR = dir;
  delete require.cache[require.resolve('../src/services/businessStore')];
  return { dir, store: require('../src/services/businessStore') };
}

const record = (over = {}) => ({
  business_name: 'Sharma Electricals',
  business_category: 'Electrician',
  address: '12, 5th Cross, Jayanagar, Bengaluru, Karnataka 560011',
  city: 'Bangalore',
  state: 'Karnataka',
  pincode: '560011',
  latitude: 12.92,
  longitude: 77.58,
  phone_number: '09876543210',
  rating: 4.5,
  review_count: 20,
  business_status: 'Operational',
  source_url: 'https://maps.google.com/place/a',
  collected_timestamp: '2026-08-10T10:00:00',
  ...over,
});

// ── resilience ───────────────────────────────────────────────────────────────

test('a missing data directory yields no records and a warning, not a crash', () => {
  const dir = path.join(os.tmpdir(), 'bizstore-does-not-exist-' + Date.now());
  process.env.SCRAPED_DATA_DIR = dir;
  delete require.cache[require.resolve('../src/services/businessStore')];
  const store = require('../src/services/businessStore');

  const { records, errors } = store.getBusinesses();
  assert.deepStrictEqual(records, []);
  assert.strictEqual(errors.length, 1);
  assert.match(errors[0], /not found/i);
});

test('a corrupt JSON file is reported but does not lose the good files', () => {
  const { store } = withDataDir({
    'broken_businesses.json': '{ not valid json',
    'google_maps_businesses.json': [record()],
  });

  const { records, errors } = store.getBusinesses({ force: true });
  assert.strictEqual(records.length, 1, 'the readable file must still load');
  assert.strictEqual(errors.length, 1);
  assert.match(errors[0], /broken_businesses\.json/);
});

test('a JSON payload that is not an array is skipped with a warning', () => {
  const { store } = withDataDir({ 'obj_businesses.json': { not: 'an array' } });
  const { records, errors } = store.getBusinesses({ force: true });
  assert.deepStrictEqual(records, []);
  assert.match(errors[0], /array/i);
});

test('junk entries are discarded without affecting valid ones', () => {
  const { store } = withDataDir({
    'google_maps_businesses.json': [
      null,
      42,
      'a string',
      { business_name: '' },            // unnamed — not displayable
      record({ source_url: 'u/keep' }),
    ],
  });

  const { records } = store.getBusinesses({ force: true });
  assert.strictEqual(records.length, 1);
  assert.strictEqual(records[0].name, 'Sharma Electricals');
});

// ── deduplication ────────────────────────────────────────────────────────────

test('records sharing a source_url collapse into one', () => {
  const { store } = withDataDir({
    'google_maps_businesses.json': [record(), record(), record()],
  });
  assert.strictEqual(store.getBusinesses({ force: true }).records.length, 1);
});

test('records sharing a phone number collapse into one', () => {
  const { store } = withDataDir({
    'google_maps_businesses.json': [
      record({ source_url: 'u/1', phone_number: '09999999999' }),
      record({ source_url: 'u/2', phone_number: '09999999999' }),
    ],
  });
  assert.strictEqual(store.getBusinesses({ force: true }).records.length, 1);
});

test('distinct businesses are all kept', () => {
  const { store } = withDataDir({
    'google_maps_businesses.json': [
      record({ source_url: 'u/1', phone_number: '01111111111' }),
      record({ source_url: 'u/2', phone_number: '02222222222' }),
      record({ source_url: 'u/3', phone_number: null }),
    ],
  });
  assert.strictEqual(store.getBusinesses({ force: true }).records.length, 3);
});

test('ids are stable across reloads so UI links keep working', () => {
  const { store } = withDataDir({ 'google_maps_businesses.json': [record()] });
  const first = store.getBusinesses({ force: true }).records[0].id;
  const second = store.getBusinesses({ force: true }).records[0].id;
  assert.strictEqual(first, second);
});

// ── normalisation ────────────────────────────────────────────────────────────

test('Google Maps junk characters are stripped from opening hours', () => {
  // Maps separates days with private-use glyphs and narrow no-break spaces.
  const raw = 'Monday 9 am– 8 pmTuesday 9 am– 8 pmSuggest new hours';
  const { store } = withDataDir({
    'google_maps_businesses.json': [record({ opening_hours: raw })],
  });

  const [business] = store.getBusinesses({ force: true }).records;
  assert.ok(!/[  -]/.test(business.openingHours), 'junk glyphs must be gone');
  assert.ok(!/Suggest new hours/.test(business.openingHours), 'the UI affordance is not data');
  assert.strictEqual(business.openingHoursList.length, 2, 'hours should split per day');
  assert.strictEqual(business.openingHoursList[0].day, 'Monday');
});

test('the locality is derived from the address for area filtering', () => {
  const { store } = withDataDir({ 'google_maps_businesses.json': [record()] });
  assert.strictEqual(store.getBusinesses({ force: true }).records[0].area, 'Jayanagar');
});

test('a short address does not produce a bogus area', () => {
  const { store } = withDataDir({
    'google_maps_businesses.json': [record({ address: 'Bengaluru' })],
  });
  assert.strictEqual(store.getBusinesses({ force: true }).records[0].area, null);
});

test('numeric fields survive as numbers and missing ones become null', () => {
  const { store } = withDataDir({
    'google_maps_businesses.json': [record({ rating: '4.2', review_count: '18', latitude: null })],
  });
  const [b] = store.getBusinesses({ force: true }).records;
  assert.strictEqual(b.rating, 4.2);
  assert.strictEqual(b.reviewCount, 18);
  assert.strictEqual(b.latitude, null);
});

// ── reload behaviour ─────────────────────────────────────────────────────────

test('new records written by a scrape are picked up without a restart', () => {
  const { dir, store } = withDataDir({ 'google_maps_businesses.json': [record({ source_url: 'u/1' })] });
  assert.strictEqual(store.getBusinesses({ force: true }).records.length, 1);

  // Simulate the scraper checkpointing a second business.
  fs.writeFileSync(
    path.join(dir, 'google_maps_businesses.json'),
    JSON.stringify([record({ source_url: 'u/1' }), record({ source_url: 'u/2', phone_number: '08888888888' })]),
    'utf-8'
  );

  const { records } = store.getBusinesses();
  assert.strictEqual(records.length, 2, 'the store should notice the file changed');
});
