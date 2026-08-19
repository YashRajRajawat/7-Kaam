/**
 * Tests for scrape-request validation (src/services/scraperRunner.js).
 *
 * These parameters become argv for a spawned Python process that drives a real
 * browser, so validation is the boundary between user input and an expensive,
 * long-running side effect.
 */

const test = require('node:test');
const assert = require('node:assert');

const { __internals } = require('../src/services/scraperRunner');
const { validateParams } = __internals;

const ok = (body) => {
  const result = validateParams(body);
  assert.ok(result.ok, `expected valid, got: ${result.error}`);
  return result.params;
};

const rejected = (body) => {
  const result = validateParams(body);
  assert.strictEqual(result.ok, false, 'expected this to be rejected');
  return result.error;
};

// ── required input ───────────────────────────────────────────────────────────

test('an empty request is rejected with a usable message', () => {
  assert.match(rejected({}), /area is required/i);
});

test('areas that are only separators are treated as empty', () => {
  assert.match(rejected({ areas: [' , , '], categories: ['Electrician'] }), /area is required/i);
});

test('a missing category is rejected', () => {
  assert.match(rejected({ areas: ['Jayanagar'] }), /category is required/i);
});

test('a blank city is rejected', () => {
  assert.match(rejected({ areas: ['Jayanagar'], categories: ['Electrician'], city: '  ' }), /city/i);
});

test('an unknown site is rejected', () => {
  assert.match(rejected({ areas: ['A'], categories: ['B'], site: 'bing' }), /google_maps/);
});

// ── input shapes ─────────────────────────────────────────────────────────────

test('comma-separated strings are split into lists', () => {
  const params = ok({ areas: 'Jayanagar, HSR Layout', categories: 'Tailor' });
  assert.deepStrictEqual(params.areas, ['Jayanagar', 'HSR Layout']);
});

test('commas inside array entries are split too', () => {
  // Regression: the array branch did not split on commas, so ["A,B,C"] counted
  // as one area against the workload cap but expanded to three in the scraper.
  const params = ok({ areas: ['Jayanagar,HSR Layout'], categories: ['Tailor'] });
  assert.deepStrictEqual(params.areas, ['Jayanagar', 'HSR Layout']);
});

test('the singular area/category aliases are accepted', () => {
  const params = ok({ area: 'Jayanagar', category: 'Plumber' });
  assert.deepStrictEqual(params.areas, ['Jayanagar']);
  assert.deepStrictEqual(params.categories, ['Plumber']);
});

test('surrounding whitespace is trimmed', () => {
  const params = ok({ areas: ['  Jayanagar  '], categories: ['  Tailor '] });
  assert.deepStrictEqual(params.areas, ['Jayanagar']);
});

test('city defaults to Bangalore and headless defaults to on', () => {
  const params = ok({ areas: ['Jayanagar'], categories: ['Tailor'] });
  assert.strictEqual(params.city, 'Bangalore');
  assert.strictEqual(params.headless, true, 'a server-side run must not open a window');
});

// ── workload guard ───────────────────────────────────────────────────────────

test('an oversized request is rejected before anything is spawned', () => {
  const areas = Array.from({ length: 9 }, (_, i) => `Area${i}`);
  const categories = Array.from({ length: 9 }, (_, i) => `Cat${i}`);
  assert.match(rejected({ areas, categories }), /81 searches/);
});

test('the workload cap counts comma-expanded values, not raw entries', () => {
  // 10 x 10 = 100 searches hidden inside two single-element arrays.
  const error = rejected({
    areas: ['A,B,C,D,E,F,G,H,I,J'],
    categories: ['1,2,3,4,5,6,7,8,9,10'],
  });
  assert.match(error, /100 searches/);
});

test('a request at the cap is allowed', () => {
  const areas = Array.from({ length: 6 }, (_, i) => `Area${i}`);
  const categories = Array.from({ length: 10 }, (_, i) => `Cat${i}`);
  const params = ok({ areas, categories });
  assert.strictEqual(params.areas.length * params.categories.length, 60);
});

// ── argv safety ──────────────────────────────────────────────────────────────

test('a value starting with a dash is rejected', () => {
  // argparse would read it as the next flag and exit 2 with an opaque error.
  assert.match(rejected({ areas: ['--headless'], categories: ['Tailor'] }), /cannot start with/i);
});

test('a dash inside a name is still allowed', () => {
  const params = ok({ areas: ['Jayanagar-East'], categories: ['Tailor'] });
  assert.deepStrictEqual(params.areas, ['Jayanagar-East']);
});
