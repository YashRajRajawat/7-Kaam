/**
 * Tests for the Supabase REST translation layer in src/utils/prisma.js.
 *
 * This layer mimics the Prisma API, so valid-looking Prisma calls compile and
 * pass review even when the translator does not support them — the failure only
 * appears at runtime, against the live database. These tests pin the
 * translation itself so an unsupported operator is caught here instead.
 */

const test = require('node:test');
const assert = require('node:assert');

// Set before requiring: prisma.js throws without these, and dotenv does not
// override already-set variables, so tests never touch real credentials.
process.env.SUPABASE_URL = process.env.SUPABASE_URL || 'https://test.supabase.co';
process.env.SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || 'test-service-key';

const { __internals } = require('../src/utils/prisma');
const { applyWhere, toFilterFragments, fetchAllRows, PAGE_SIZE } = __internals;

/** Records every filter call so the emitted PostgREST query can be asserted. */
function makeSpyQuery() {
  const calls = [];
  const q = {};
  for (const method of ['eq', 'neq', 'gt', 'gte', 'lt', 'lte', 'in', 'is', 'not', 'ilike', 'or', 'order', 'range', 'limit']) {
    q[method] = (...args) => { calls.push([method, ...args]); return q; };
  }
  q.calls = calls;
  return q;
}

// ── where translation ────────────────────────────────────────────────────────

test('applyWhere maps a scalar to eq', () => {
  const q = applyWhere(makeSpyQuery(), { city: 'Bangalore' });
  assert.deepStrictEqual(q.calls, [['eq', 'city', 'Bangalore']]);
});

test('applyWhere maps null to is-null', () => {
  const q = applyWhere(makeSpyQuery(), { kaamCardIssuedAt: null });
  assert.deepStrictEqual(q.calls, [['is', 'kaamCardIssuedAt', null]]);
});

test('applyWhere maps contains to a case-insensitive ilike', () => {
  const q = applyWhere(makeSpyQuery(), { city: { contains: 'bang' } });
  assert.deepStrictEqual(q.calls, [['ilike', 'city', '%bang%']]);
});

test('applyWhere translates OR instead of treating it as a column', () => {
  // Regression: this used to emit eq('OR', [...]), and PostgREST replied
  // "column Worker.OR does not exist" — every worker search returned a 500.
  const q = applyWhere(makeSpyQuery(), {
    OR: [
      { fullName: { contains: 'Vikram', mode: 'insensitive' } },
      { phoneNumber: { contains: '9876' } },
    ],
  });

  assert.strictEqual(q.calls.length, 1, 'OR should produce exactly one .or() call');
  const [method, filter] = q.calls[0];
  assert.strictEqual(method, 'or');
  assert.match(filter, /fullName\.ilike\./);
  assert.match(filter, /phoneNumber\.ilike\./);
  assert.ok(!filter.includes('mode'), '`mode` is not a column and must not leak into the filter');
});

test('applyWhere combines OR with sibling equality filters', () => {
  const q = applyWhere(makeSpyQuery(), {
    trade: 'ELECTRICIAN',
    OR: [{ fullName: { contains: 'V' } }],
  });
  const methods = q.calls.map(c => c[0]);
  assert.ok(methods.includes('eq'), 'sibling filter should still be applied');
  assert.ok(methods.includes('or'), 'OR should still be applied');
});

test('applyWhere applies each AND member', () => {
  const q = applyWhere(makeSpyQuery(), {
    AND: [{ status: 'ACTIVE' }, { city: 'Pune' }],
  });
  assert.deepStrictEqual(q.calls, [['eq', 'status', 'ACTIVE'], ['eq', 'city', 'Pune']]);
});

test('applyWhere maps NOT to a negated filter', () => {
  const q = applyWhere(makeSpyQuery(), { NOT: { status: 'SUSPENDED' } });
  assert.deepStrictEqual(q.calls, [['neq', 'status', 'SUSPENDED']]);
});

test('applyWhere maps NOT null to not-is-null', () => {
  const q = applyWhere(makeSpyQuery(), { NOT: { finalScore: null } });
  assert.deepStrictEqual(q.calls, [['not', 'finalScore', 'is', null]]);
});

// ── filter-string safety ─────────────────────────────────────────────────────

test('OR values containing commas cannot split the filter expression', () => {
  // An unquoted comma would be read as a filter separator, silently changing
  // the query rather than searching for the literal text.
  const fragments = toFilterFragments({ fullName: { contains: 'a,b' } });
  assert.strictEqual(fragments.length, 1);
  assert.ok(fragments[0].includes('"'), 'value must be quoted');
  assert.ok(fragments[0].includes('a,b'), 'the literal term must survive');
});

test('OR values containing double quotes are escaped', () => {
  const [fragment] = toFilterFragments({ fullName: { contains: 'a"b' } });
  assert.ok(fragment.includes('\\"'), 'embedded quotes must be escaped');
});

test('toFilterFragments supports the comparison operators the app uses', () => {
  assert.match(toFilterFragments({ createdAt: { gte: '2026-01-01' } })[0], /^createdAt\.gte\./);
  assert.match(toFilterFragments({ score: { lt: 50 } })[0], /^score\.lt\./);
  assert.match(toFilterFragments({ tier: { in: ['GOLD', 'SILVER'] } })[0], /^tier\.in\.\(/);
});

// ── pagination ───────────────────────────────────────────────────────────────

/** A fake table of `total` rows that honours .range() like PostgREST does. */
function makePagedSource(total) {
  let requests = 0;
  const makeQuery = () => ({
    range: async (from, to) => {
      requests += 1;
      const rows = [];
      for (let i = from; i <= Math.min(to, total - 1); i += 1) rows.push({ id: i });
      return { data: rows, count: total, error: null };
    },
  });
  return { makeQuery, requestCount: () => requests };
}

test('fetchAllRows returns every row beyond the single-response cap', async () => {
  // Regression: findMany without an explicit `take` stopped at 1000 rows and
  // reported no error, so analytics quietly described only part of the table.
  const total = PAGE_SIZE * 2 + 137;
  const source = makePagedSource(total);

  const { rows, total: reported, error } = await fetchAllRows(source.makeQuery);

  assert.strictEqual(error, null);
  assert.strictEqual(rows.length, total, `expected all ${total} rows`);
  assert.strictEqual(reported, total);
  assert.ok(source.requestCount() >= 3, 'should have paged rather than issued one request');
});

test('fetchAllRows makes a single request when everything fits in one page', async () => {
  const source = makePagedSource(12);
  const { rows } = await fetchAllRows(source.makeQuery);
  assert.strictEqual(rows.length, 12);
  assert.strictEqual(source.requestCount(), 1, 'a short page means stop');
});

test('fetchAllRows handles an empty table without looping', async () => {
  const source = makePagedSource(0);
  const { rows, total } = await fetchAllRows(source.makeQuery);
  assert.deepStrictEqual(rows, []);
  assert.strictEqual(total, 0);
  assert.strictEqual(source.requestCount(), 1);
});

test('fetchAllRows honours a starting offset', async () => {
  const source = makePagedSource(50);
  const { rows } = await fetchAllRows(source.makeQuery, 20);
  assert.strictEqual(rows.length, 30, 'should skip the first 20 rows');
  assert.strictEqual(rows[0].id, 20);
});

test('fetchAllRows surfaces an error instead of looping forever', async () => {
  const makeQuery = () => ({
    range: async () => ({ data: null, count: null, error: { message: 'boom' } }),
  });
  const { error } = await fetchAllRows(makeQuery);
  assert.ok(error, 'the error must be returned to the caller');
  assert.strictEqual(error.message, 'boom');
});
