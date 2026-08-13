#!/usr/bin/env node
// ── 7 Kaam — public directory listing importer ────────────────────────────────
//
// Imports businesses scraped from a public directory (Google Maps) as
// UNCLAIMED, UNVERIFIED listings.
//
// READ THIS BEFORE EDITING.
//
// Every row this script writes is a REAL, NAMED, NON-CONSENTING business.
// 7 Kaam's only product is verification. A row created here has:
//
//   listingSource   = 'PUBLIC_DIRECTORY'
//   claimStatus     = 'UNCLAIMED'
//   aadhaarHash     = NULL          (no Aadhaar exists — no placeholder invented)
//   aadhaarVerified = false
//   videoScore / testScore / workHistoryScore / finalScore / tier = NULL
//   kaamCardUrl / qrCodeUrl / kaamCardIssuedAt                    = NULL
//
// and ZERO rows in KaamCard, SkillCertificate, TestSubmission, VideoAssessment,
// ScoringLog or WorkHistory. This file contains no INSERT into any table other
// than "Worker". Do not add one.
//
// The scraped Google rating and review count are read from the file and
// DELIBERATELY NEVER STORED, TRANSMITTED OR EMITTED. A Google rating is not a
// 7 Kaam trust score and must never reach finalScore or tier. If you are about
// to write `?? 0`, `|| 80`, `!== false` or `tier ?? '...'` anywhere below —
// stop.
//
// USAGE
//   node import_directory_workers.js                      # DRY RUN (default, writes nothing)
//   node import_directory_workers.js --check-db           # dry run + live DB collision checks
//   node import_directory_workers.js --commit             # actually write
//   node import_directory_workers.js --commit --limit 25  # staged rollout
//   node import_directory_workers.js --file ../../Data_Scraped/google_maps_businesses.csv
//
// A plain `--dry-run` performs the entire parse / normalise / assert pipeline
// and prints the funnel WITHOUT loading @prisma/client and without opening a
// database connection, so it is runnable on a laptop with no DB access.

require('dotenv').config();

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// ── Database handle ──────────────────────────────────────────────────────────
// Same construction as prisma/seed.js: PrismaPg adapter over DATABASE_URL.
//
// It is built LAZILY, inside a function, for one reason: `--dry-run` (the
// default) must never touch — or even require — the database layer, so the
// funnel can be reviewed by anyone, anywhere, before a single row is written.
// The PrismaPg adapter talks to Postgres over the real pg driver, so unknown
// columns, CHECK constraints and unique violations all surface as loud errors
// rather than being silently stripped the way the REST shim in
// src/utils/prisma.js does. That is why this script does not use src/utils/prisma.
let _prisma = null;
function db() {
  if (_prisma) return _prisma;
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL must be set in the environment (see backend/.env.example)');
  }
  const { PrismaClient } = require('@prisma/client');
  const { PrismaPg } = require('@prisma/adapter-pg');
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
  _prisma = new PrismaClient({ adapter });
  return _prisma;
}

// Structural proof of Invariant I2 (no child-table rows for unclaimed listings).
// This counter is declared here and is NEVER incremented anywhere in this file.
// `grep -n childTableWrites import_directory_workers.js` must return exactly
// two lines: this declaration, and the assertion that it is zero.
const childTableWrites = 0;

// ── Category → Trade ─────────────────────────────────────────────────────────
// Exact literal map. Keys are matched case-insensitively after .trim().
// A category that is not present here causes the row to be DROPPED.
// There is no fallback bucket and there must never be one: a guessed trade on
// a real person's listing is a fabricated claim about their livelihood.
const CATEGORY_TO_TRADE = {
  // ELECTRICIAN
  'electrician': 'ELECTRICIAN',
  'electrical installation service': 'ELECTRICIAN',
  // PLUMBER
  'plumber': 'PLUMBER',
  // CARPENTER
  'carpenter': 'CARPENTER',
  'woodworker': 'CARPENTER',
  // PAINTER
  'painter': 'PAINTER',
  'painting': 'PAINTER',
  // WELDER
  'welder': 'WELDER',
  'metal fabricator': 'WELDER',
  'fabrication engineer': 'WELDER',
  'steel fabricator': 'WELDER',
  'aluminum welder': 'WELDER',
  'iron works': 'WELDER',
  // AC_TECHNICIAN
  'air conditioning repair service': 'AC_TECHNICIAN',
  'hvac contractor': 'AC_TECHNICIAN',
  'air conditioning contractor': 'AC_TECHNICIAN',
};

// Deliberately NOT mapped (manual-review bucket): 'Electrical repair shop',
// 'Electrical engineer', 'Appliance repair service', 'Contractor', 'General
// contractor', 'Waterproofing service', 'Blacksmith', 'Metal workshop',
// 'Machine workshop', 'Furniture Manufacturer', 'Furniture maker', 'Automation
// company', 'Home automation company', and every Auto */Two Wheeler */retail/
// wholesale/manufacturer category. Adding a key here is a reviewable one-line
// diff — that is the point.

const BRAND_REPEAT_THRESHOLD = 5;   // normalised name occurring >= N times => corporate brand
const WRITE_BATCH_SIZE = 50;

// ── Normalisation helpers ────────────────────────────────────────────────────

// Canonical phone format: '+91' + 10 digits, no spaces, no punctuation.
// (Established by prisma/seed.js and fix_kaamcards_and_phones.js.)
function normalizePhone(raw) {
  if (raw == null) return { phone: null, status: 'MISSING' };
  let s = String(raw).normalize('NFKC').replace(/[^\d+]/g, '');
  if (!s) return { phone: null, status: 'MISSING' };
  if (s.startsWith('+91')) s = s.slice(3);
  else if (s.startsWith('0091')) s = s.slice(4);
  else if (s.startsWith('91') && s.length === 12) s = s.slice(2);
  s = s.replace(/^\++/, '');
  if (s.startsWith('1800') || s.startsWith('1860')) return { phone: null, status: 'TOLLFREE' };
  if (s.startsWith('0')) s = s.slice(1);                       // national trunk prefix
  if (!/^\d+$/.test(s)) return { phone: null, status: 'NON_NUMERIC' };
  if (s.length !== 10) return { phone: null, status: 'BAD_LENGTH' };
  if (!'6789'.includes(s[0])) return { phone: null, status: 'LANDLINE_NONMOBILE' };
  if (s.startsWith('80') && '012345'.includes(s[2]))           // 080-[2-5]xxxxxxx
    return { phone: null, status: 'LANDLINE_BLR' };
  return { phone: '+91' + s, status: 'MOBILE_OK' };
}
// Landlines are dropped, not imported: a shared shop landline cannot receive an
// OTP, so the listing could never be claimed by its owner. Importing it would
// create a permanently unclaimable record about a real business.

const CITY_RE = /^(bengaluru|bangalore)\b/i;
const ZONE = new Set(['south', 'north', 'east', 'west', 'central', 'karnataka']);
const LEAD_NUM = /^\s*(?:no\.?\s*)?#?\s*\d+[a-z]?(?:[/-]\d+[a-z]?)*\s*,?\s*/i;
const PREP = /^(near|opp\.?|opposite|behind|beside|next to|above|below|in front of)\b/i;
const ROADY = /\b(rd|road|main|cross|street|st|marg|highway|circle|junction)\b\.?$/i;
const PLUS = /^[A-Z0-9]{4}\+[A-Z0-9]{2,3}$/;

// Returns the locality segment of a scraped address, or null. Never substitutes
// the city — `locality` is nullable and an honest null beats a wrong guess.
function extractLocality(addr) {
  if (!addr) return null;
  const parts = addr.split(',').map((p) => p.trim()).filter(Boolean);
  let idx = null;
  for (let i = 0; i < parts.length; i++) if (CITY_RE.test(parts[i])) idx = i;   // LAST wins
  if (idx === null || idx === 0) return null;
  for (let j = idx - 1; j >= 0; j--) {
    let seg = parts[j].replace(/\s*\d{6}\s*$/, '').trim();
    if (PLUS.test(seg) || PREP.test(seg)) continue;
    seg = seg.replace(LEAD_NUM, '').replace(/^[\s.,-]+|[\s.,-]+$/g, '');
    if (!seg || /^\d+$/.test(seg) || ZONE.has(seg.toLowerCase())) continue;
    if (ROADY.test(seg) || seg.length < 3) continue;
    return seg.replace(/\s+/g, ' ');
  }
  return null;
}
// Two rules here must not be "simplified":
//   - the ZONE stoplist, or '...Jayanagar III Block, South, Bengaluru' yields 'South';
//   - STRIPPING rather than REJECTING a leading house number, or
//     '...1 Arekempanahalli, ...' yields null.

const SEO = /\s*[-–—|,]\s*(?:[^|]*?\b(?:best|top|no\.?\s*1|#1|near me|24[/x]7|in bangalore|in bengaluru|bangalore|bengaluru)\b.*)$/i;
const PAREN = /\s*\([^)]*\)\s*$/;
const SLASH = /\s*\/\s*[a-z].*$/;
const ZW = /[​‌‍‎‏﻿]/g;
const KEEP = /^(?:[A-Z0-9&.']{1,3}|[A-Z]?\d+[A-Z0-9]*|[A-Z]\.(?:[A-Z]\.)+)$/;
const SMALL = new Set(['sri', 'sai', 'new', 'shop', 'the', 'and', 'om', 'maa', 'jai']);

// Subtractive only. Never invents, reorders, or extracts a human name from a
// business name. Falls back to the original if the result would be < 3 chars.
function cleanName(raw, maxlen = 60) {
  if (!raw) return null;
  const orig = String(raw);
  let s = orig.normalize('NFKC').replace(ZW, '').replace(/ /g, ' ')
    .replace(/\s+/g, ' ').trim();
  s = s.split('|')[0].trim();              // 1 keep brand segment before first pipe
  s = s.replace(SLASH, '').trim();         // 2 drop '/ descriptor' tail
  let prev = null;                         // 3 peel SEO tails repeatedly
  while (prev !== s) { prev = s; s = s.replace(SEO, '').trim(); }
  s = s.replace(PAREN, '').trim().replace(/^[\s,.\-–—&/]+|[\s,.\-–—&/]+$/g, '');  // 4
  if (s.length > 3 && s === s.toUpperCase()) {                                     // 5 de-shout
    s = s.split(' ').map((w) =>
      (KEEP.test(w.replace(/[.,&]/g, '')) && !SMALL.has(w.toLowerCase())) || /\d/.test(w)
        ? w : w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()
    ).join(' ');
  }
  if (s.length > maxlen) s = s.slice(0, maxlen).replace(/\s+\S*$/, '').replace(/[\s,.\-]+$/, '');
  return s.length >= 3 ? s : orig.replace(/\s+/g, ' ').trim().slice(0, maxlen);   // 6 never destroy
}

function normalizeNameKey(raw) {
  return String(raw || '').normalize('NFKC').replace(ZW, '').replace(/ /g, ' ')
    .replace(/\s+/g, ' ').trim().toLowerCase();
}

// Stable external record key. NOT the source_url — that carries a per-scrape
// cache-buster (&g_ep=...), so hashing the whole URL would mint a brand-new id
// on every re-scrape and duplicate every listing.
function sourceRefOf(sourceUrl) {
  if (!sourceUrl) return null;
  const feat = String(sourceUrl).match(/!1s(0x[0-9a-f]+:0x[0-9a-f]+)/i);      // preferred
  if (feat) return feat[1].toLowerCase();
  const fid = String(sourceUrl).match(/16s%2F([a-z])%2F([A-Za-z0-9_-]+)/i);   // fallback: /g/11mydc683b
  if (fid) return `/${fid[1]}/${fid[2]}`;
  return null;                                                               // → row is DROPPED
}

function workerIdOf(sourceRef) {
  return 'gmaps-' + crypto.createHash('sha256').update(sourceRef).digest('hex').slice(0, 24);
}
// A row with no derivable sourceRef is dropped: we will not import a record we
// cannot re-identify, because we could not honour a removal request on it.

function toFloat(v) {
  if (v === null || v === undefined || v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

// ── Input ────────────────────────────────────────────────────────────────────

function readRows(file) {
  const ext = path.extname(file).toLowerCase();
  const text = fs.readFileSync(file, 'utf8');
  if (ext === '.json') {
    const parsed = JSON.parse(text);
    const rows = Array.isArray(parsed)
      ? parsed
      : (parsed.results || parsed.data || parsed.businesses);
    if (!Array.isArray(rows)) throw new Error(`Could not find a record array in ${file}`);
    return rows;
  }
  if (ext === '.csv') {
    // The address and source_url columns are quoted and contain commas — never
    // hand-roll a splitter for this file.
    let parse;
    try {
      ({ parse } = require('csv-parse/sync'));
    } catch (e) {
      throw new Error(
        'Reading a .csv input requires the csv-parse package.\n' +
        '  Run:  npm install csv-parse\n' +
        '  Or pass the .json export instead: --file ../../Data_Scraped/google_maps_businesses.json'
      );
    }
    return parse(text, { columns: true, skip_empty_lines: true, bom: true, relax_column_count: true });
  }
  throw new Error(`Unsupported input extension "${ext}" — expected .json or .csv`);
}

// ── CLI ──────────────────────────────────────────────────────────────────────

function stamp(d) {
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`;
}

function parseArgs(argv) {
  const opts = {
    file: path.resolve(__dirname, '../../Data_Scraped/google_maps_businesses.json'),
    dryRun: true,
    commit: false,
    checkDb: false,
    limit: 0,
    batchId: `gmaps-${stamp(new Date())}`,
    report: null,
    sourceName: 'Google Maps',
  };
  let explicitDryRun = false;

  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    const next = () => {
      const v = argv[++i];
      if (v === undefined) throw new Error(`Flag ${a} requires a value`);
      return v;
    };
    switch (a) {
      case '--file': opts.file = path.resolve(process.cwd(), next()); break;
      case '--dry-run': explicitDryRun = true; break;
      case '--commit': opts.commit = true; break;
      case '--check-db': opts.checkDb = true; break;
      case '--limit': opts.limit = parseInt(next(), 10) || 0; break;
      case '--batch-id': opts.batchId = next(); break;
      case '--report': opts.report = path.resolve(process.cwd(), next()); break;
      case '--source-name': opts.sourceName = next(); break;
      case '--help': case '-h': opts.help = true; break;
      default: throw new Error(`Unknown flag "${a}" (try --help)`);
    }
  }

  if (explicitDryRun && opts.commit) {
    throw new Error('--dry-run and --commit are mutually exclusive');
  }
  opts.dryRun = !opts.commit;
  return opts;
}

// ── Pipeline ─────────────────────────────────────────────────────────────────

function normalize(rows, opts) {
  const funnel = [];
  const drops = { phoneStatus: {}, brands: [], dupPhone: [], dupSourceRef: [] };
  const add = (step, label, before, after) =>
    funnel.push({ step, label, removed: before - after, remaining: after });

  const n0 = rows.length;
  funnel.push({ step: 0, label: 'rows read from file', removed: null, remaining: n0 });

  // Stage 1 — business_status. Excludes 0 rows today; the filter must exist for
  // future scrapes, which will contain 'Permanently closed' entries.
  let cur = rows.filter((r) => String(r.business_status || '').trim() === 'Operational');
  add(1, "− business_status <> 'Operational'", n0, cur.length);

  // Stage 2 — category → Trade (explicit map, no fallback bucket)
  let prev = cur.length;
  cur = cur.map((r) => {
    const trade = CATEGORY_TO_TRADE[String(r.business_category || '').trim().toLowerCase()];
    return trade ? { row: r, trade } : null;
  }).filter(Boolean);
  add(2, '− category not in Trade map', prev, cur.length);

  // Stage 3 — corporate-brand exclusion. A name repeated >= 5 times across the
  // trade-mapped set is a franchise/IVR brand, not a person: nobody could ever
  // claim it.
  prev = cur.length;
  const nameCounts = new Map();
  for (const c of cur) {
    const k = normalizeNameKey(c.row.business_name);
    nameCounts.set(k, (nameCounts.get(k) || 0) + 1);
  }
  const brandKeys = new Set();
  for (const [k, n] of nameCounts) if (n >= BRAND_REPEAT_THRESHOLD) brandKeys.add(k);
  for (const k of brandKeys) drops.brands.push({ name: k, count: nameCounts.get(k) });
  drops.brands.sort((a, b) => b.count - a.count);
  cur = cur.filter((c) => !brandKeys.has(normalizeNameKey(c.row.business_name)));
  add(3, '− corporate brand (name repeats >= 5)', prev, cur.length);

  // Stage 4 — phone → E.164 mobile
  prev = cur.length;
  cur = cur.map((c) => {
    const { phone, status } = normalizePhone(c.row.phone_number);
    if (status !== 'MOBILE_OK') {
      drops.phoneStatus[status] = (drops.phoneStatus[status] || 0) + 1;
      return null;
    }
    return { ...c, phone };
  }).filter(Boolean);
  add(4, '− no usable mobile in E.164', prev, cur.length);

  // Stage 5 — duplicate phone within the batch.
  // Tie-break: longest address wins; on an exact tie, lowest sourceRef wins, so
  // the outcome does not depend on V8 sort stability or CSV row order.
  prev = cur.length;
  const byPhone = new Map();
  for (const c of cur) {
    const list = byPhone.get(c.phone) || [];
    list.push(c);
    byPhone.set(c.phone, list);
  }
  const keptPhones = [];
  for (const [phone, list] of byPhone) {
    if (list.length === 1) { keptPhones.push(list[0]); continue; }
    const ranked = list.slice().sort((a, b) => {
      const la = String(a.row.address || '').length;
      const lb = String(b.row.address || '').length;
      if (la !== lb) return lb - la;
      return String(sourceRefOf(a.row.source_url) || '').localeCompare(String(sourceRefOf(b.row.source_url) || ''));
    });
    keptPhones.push(ranked[0]);
    for (const d of ranked.slice(1)) {
      drops.dupPhone.push({ phone, name: d.row.business_name, kept: ranked[0].row.business_name });
    }
  }
  cur = keptPhones;
  add(5, '− duplicate phone within batch', prev, cur.length);

  // Stage 6 — address required (the claimant must be able to recognise their
  // own listing, and admin dedup needs it)
  prev = cur.length;
  cur = cur.filter((c) => String(c.row.address || '').trim().length > 0);
  add(6, '− no address', prev, cur.length);

  // Stage 7 — stable sourceRef required
  prev = cur.length;
  cur = cur.map((c) => {
    const sourceRef = sourceRefOf(c.row.source_url);
    return sourceRef ? { ...c, sourceRef, id: workerIdOf(sourceRef) } : null;
  }).filter(Boolean);
  add(7, '− no stable sourceRef', prev, cur.length);

  // Stage 7b — duplicate sourceRef within the batch.
  // Two rows sharing a sourceRef produce the same deterministic id; Postgres
  // then raises 21000 "ON CONFLICT DO UPDATE command cannot affect row a second
  // time" and rolls back the ENTIRE 50-row batch. Today Stage 5 removes these
  // incidentally (the twins share a phone), but a re-scrape that formats one
  // twin's phone differently would let both through. This stage is the real guard.
  prev = cur.length;
  const seenRefs = new Set();
  cur = cur.filter((c) => {
    if (seenRefs.has(c.sourceRef)) {
      drops.dupSourceRef.push({ sourceRef: c.sourceRef, name: c.row.business_name });
      return false;
    }
    seenRefs.add(c.sourceRef);
    return true;
  });
  add(8, '− duplicate sourceRef within batch', prev, cur.length);

  // ── Emit ───────────────────────────────────────────────────────────────────
  const records = cur.map((c) => ({
    id: c.id,
    fullName: cleanName(c.row.business_name),
    phoneNumber: c.phone,
    trade: c.trade,
    city: String(c.row.city || 'Bangalore').trim() || 'Bangalore',
    locality: extractLocality(c.row.address),
    latitude: toFloat(c.row.latitude),
    longitude: toFloat(c.row.longitude),
    // Trust surface — every one of these is null/false by construction and is
    // asserted below. Never populate any of them here.
    aadhaarHash: null,
    aadhaarVerified: false,
    listingSource: 'PUBLIC_DIRECTORY',
    claimStatus: 'UNCLAIMED',
    sourceName: opts.sourceName,
    sourceRef: c.sourceRef,
    sourceUrl: c.row.source_url || null,
    sourceAddress: String(c.row.address || '').trim(),
    importBatchId: opts.batchId,
    tradeInferred: true,
    // Bookkeeping for the coverage report only — stripped before writing.
    _pincode: c.row.pincode || null,
  }));

  return { funnel, drops, records };
}

// ── Safety assertions (run over every emitted record, before any write) ──────

function assertSafe(records) {
  const n = records.length;
  const checks = [
    {
      label: 'finalScore/tier/videoScore/testScore/workHistoryScore all null',
      ok: records.filter((r) =>
        r.finalScore == null && r.tier == null && r.videoScore == null &&
        r.testScore == null && r.workHistoryScore == null &&
        r.kaamCardUrl == null && r.qrCodeUrl == null && r.kaamCardIssuedAt == null).length,
    },
    { label: 'aadhaarVerified === false', ok: records.filter((r) => r.aadhaarVerified === false).length },
    { label: 'aadhaarHash === null', ok: records.filter((r) => r.aadhaarHash === null).length },
    {
      label: 'no rating / reviewCount key present on any record',
      ok: records.filter((r) => !Object.keys(r).some((k) => /rating|review/i.test(k))).length,
    },
    {
      label: "listingSource='PUBLIC_DIRECTORY', claimStatus='UNCLAIMED'",
      ok: records.filter((r) =>
        r.listingSource === 'PUBLIC_DIRECTORY' && r.claimStatus === 'UNCLAIMED').length,
    },
    {
      label: 'fullName / phoneNumber / trade / city present',
      ok: records.filter((r) =>
        r.fullName && r.phoneNumber && r.trade && r.city).length,
    },
    {
      label: 'deterministic ids unique across the batch',
      ok: new Set(records.map((r) => r.id)).size === n ? n : 0,
    },
  ];
  return { n, checks, childWrites: childTableWrites };
}

// ── Database stages ──────────────────────────────────────────────────────────

const NEW_COLUMNS = [
  'listingSource', 'claimStatus', 'sourceName', 'sourceRef', 'sourceUrl', 'sourceAddress',
  'importBatchId', 'importedAt', 'claimRequestedAt', 'claimedAt', 'suppressedAt',
  'suppressionReason', 'tradeInferred',
];

async function preflight(prisma) {
  const results = [];

  const cols = await prisma.$queryRawUnsafe(
    `SELECT column_name, is_nullable FROM information_schema.columns
      WHERE table_name = 'Worker' AND column_name = ANY($1::text[])`,
    NEW_COLUMNS.concat(['aadhaarHash'])
  );
  const found = new Set(cols.map((c) => c.column_name));
  const missing = NEW_COLUMNS.filter((c) => !found.has(c));
  results.push({
    ok: missing.length === 0,
    label: `${NEW_COLUMNS.length} provenance columns present`,
    detail: missing.length ? `missing: ${missing.join(', ')} — run: node run_migration_3.js` : '',
  });

  const aad = cols.find((c) => c.column_name === 'aadhaarHash');
  results.push({
    ok: !!aad && aad.is_nullable === 'YES',
    label: 'aadhaarHash is nullable',
    detail: aad ? `is_nullable=${aad.is_nullable}` : 'column not found',
  });

  const cons = await prisma.$queryRawUnsafe(
    `SELECT conname FROM pg_constraint WHERE conname = 'Worker_unclaimed_has_no_trust_data'`
  );
  results.push({
    ok: cons.length === 1,
    label: 'constraint Worker_unclaimed_has_no_trust_data present',
    detail: cons.length ? '' : 'the database-level guard is missing — run: node run_migration_3.js',
  });

  // Round-trip probe inside a rolled-back transaction. This is what makes the
  // silent-column-drop failure mode impossible: we prove the values we write
  // are the values that come back, then throw to roll the whole thing back.
  const probeId = `gmaps-probe-${crypto.randomBytes(8).toString('hex')}`;
  const ROLLBACK = new Error('__probe_rollback__');
  let probe = null;
  try {
    await prisma.$transaction(async (tx) => {
      await tx.$executeRawUnsafe(
        `INSERT INTO "Worker" ("id","aadhaarHash","fullName","phoneNumber","trade","city",
                               "status","aadhaarVerified","underReview","listingSource","claimStatus",
                               "sourceRef","tradeInferred","createdAt","updatedAt")
         VALUES ($1::text, NULL, 'Preflight Probe', $2::text, 'ELECTRICIAN'::"Trade", 'Bangalore',
                 'ACTIVE', false, false, 'PUBLIC_DIRECTORY', 'UNCLAIMED',
                 $3::text, true, NOW(), NOW())`,
        probeId, `+9100000${probeId.slice(-5)}`, probeId
      );
      const back = await tx.$queryRawUnsafe(
        `SELECT "listingSource","claimStatus","aadhaarHash","finalScore","tier"
           FROM "Worker" WHERE "id" = $1::text`,
        probeId
      );
      probe = back[0] || null;
      throw ROLLBACK;
    }, { maxWait: 15000, timeout: 30000 });
  } catch (e) {
    if (e !== ROLLBACK) {
      results.push({ ok: false, label: 'round-trip probe returned listingSource/claimStatus intact', detail: e.message });
      return results;
    }
  }
  const probeOk = !!probe
    && probe.listingSource === 'PUBLIC_DIRECTORY'
    && probe.claimStatus === 'UNCLAIMED'
    && probe.aadhaarHash === null
    && probe.finalScore === null
    && probe.tier === null;
  results.push({
    ok: probeOk,
    label: 'round-trip probe returned listingSource/claimStatus intact',
    detail: probeOk ? '' : `probe read back as ${JSON.stringify(probe)}`,
  });

  return results;
}

// Stages 9–11: collisions against live data. Never touches a signed-up worker.
async function applyDbGates(prisma, records) {
  const phones = records.map((r) => r.phoneNumber);
  const refs = records.map((r) => r.sourceRef);

  const existing = await prisma.$queryRawUnsafe(
    `SELECT "id","fullName","phoneNumber","listingSource","claimStatus","sourceRef"
       FROM "Worker" WHERE "phoneNumber" = ANY($1::text[])`,
    phones
  );
  const byPhone = new Map(existing.map((e) => [e.phoneNumber, e]));

  const suppressed = await prisma.$queryRawUnsafe(
    `SELECT "sourceRef" FROM "Worker"
      WHERE "suppressedAt" IS NOT NULL AND "sourceRef" IS NOT NULL AND "sourceRef" = ANY($1::text[])`,
    refs
  );
  const suppressedRefs = new Set(suppressed.map((s) => s.sourceRef));

  const skipped = { SKIPPED_REAL_USER: [], SKIPPED_PHONE_TAKEN_BY_OTHER_LISTING: [], SKIPPED_SUPPRESSED: [] };
  const kept = [];

  for (const r of records) {
    if (suppressedRefs.has(r.sourceRef)) {
      // The owner asked to be removed. A re-import must never resurrect them.
      skipped.SKIPPED_SUPPRESSED.push({ id: r.id, name: r.fullName });
      continue;
    }
    const hit = byPhone.get(r.phoneNumber);
    if (hit && hit.sourceRef !== r.sourceRef) {
      if (hit.listingSource === 'SELF_SIGNUP') {
        skipped.SKIPPED_REAL_USER.push({ id: hit.id, name: hit.fullName, phone: hit.phoneNumber });
      } else {
        skipped.SKIPPED_PHONE_TAKEN_BY_OTHER_LISTING.push({ id: hit.id, name: hit.fullName });
      }
      continue;
    }
    kept.push(r);
  }
  return { kept, skipped };
}

// The safety catch lives in the DO UPDATE's WHERE clause: a re-run can never
// overwrite a claimed listing, a suppressed listing, or a self-signup worker.
// A conflicting row in any of those states is a silent no-op, which is correct.
// RETURNING (xmax = 0) discriminates a fresh INSERT from an UPDATE; a row that
// hits the WHERE guard returns nothing at all.
const UPSERT_SQL = `
INSERT INTO "Worker" (
  "id","aadhaarHash","fullName","phoneNumber","trade","city","locality",
  "latitude","longitude","status","aadhaarVerified","underReview",
  "listingSource","claimStatus","sourceName","sourceRef","sourceUrl","sourceAddress",
  "importBatchId","importedAt","tradeInferred","createdAt","updatedAt"
) VALUES (
  $1::text, NULL, $2::text, $3::text, $4::"Trade", $5::text, $6::text,
  $7::double precision, $8::double precision, 'ACTIVE', false, false,
  'PUBLIC_DIRECTORY','UNCLAIMED', $9::text, $10::text, $11::text, $12::text,
  $13::text, NOW(), true, NOW(), NOW()
)
ON CONFLICT ("id") DO UPDATE SET
  "fullName"      = EXCLUDED."fullName",
  "phoneNumber"   = EXCLUDED."phoneNumber",
  "trade"         = EXCLUDED."trade",
  "locality"      = EXCLUDED."locality",
  "latitude"      = EXCLUDED."latitude",
  "longitude"     = EXCLUDED."longitude",
  "sourceUrl"     = EXCLUDED."sourceUrl",
  "sourceAddress" = EXCLUDED."sourceAddress",
  "importBatchId" = EXCLUDED."importBatchId",
  "updatedAt"     = NOW()
WHERE "Worker"."listingSource" = 'PUBLIC_DIRECTORY'
  AND "Worker"."claimStatus"   = 'UNCLAIMED'
  AND "Worker"."suppressedAt"  IS NULL
RETURNING (xmax = 0) AS inserted`;

async function writeRecords(prisma, records) {
  const tally = { inserted: 0, updated: 0, protected: 0, failed: 0, failedRefs: [] };

  for (let i = 0; i < records.length; i += WRITE_BATCH_SIZE) {
    const batch = records.slice(i, i + WRITE_BATCH_SIZE);

    // Belt-and-braces against Postgres 21000 aborting the whole transaction.
    if (new Set(batch.map((r) => r.id)).size !== batch.length) {
      throw new Error('Internal error: duplicate deterministic id inside a write batch');
    }

    try {
      const outcomes = await prisma.$transaction(async (tx) => {
        const out = [];
        for (const r of batch) {
          const rows = await tx.$queryRawUnsafe(
            UPSERT_SQL,
            r.id, r.fullName, r.phoneNumber, r.trade, r.city, r.locality,
            r.latitude, r.longitude, r.sourceName, r.sourceRef, r.sourceUrl,
            r.sourceAddress, r.importBatchId
          );
          out.push(rows.length === 0 ? 'protected' : (rows[0].inserted ? 'inserted' : 'updated'));
        }
        return out;
      }, { maxWait: 15000, timeout: 120000 });

      for (const o of outcomes) tally[o]++;
      console.log(`  ✓ batch ${Math.floor(i / WRITE_BATCH_SIZE) + 1}: ${batch.length} rows`);
    } catch (err) {
      tally.failed += batch.length;
      tally.failedRefs.push(...batch.map((r) => r.sourceRef));
      console.error(`  ❌ batch ${Math.floor(i / WRITE_BATCH_SIZE) + 1} rolled back: ${err.message}`);
      console.error(`     sourceRefs: ${batch.map((r) => r.sourceRef).join(', ')}`);
    }
  }
  return tally;
}

// ── Reporting ────────────────────────────────────────────────────────────────

function pad(s, n) { return String(s).padEnd(n); }
function lpad(s, n) { return String(s).padStart(n); }

function printFunnel(funnel, drops) {
  console.log('\n📊 FUNNEL');
  for (const f of funnel) {
    if (f.removed === null) {
      console.log(`   ${lpad(f.step, 2)}  ${pad(f.label, 44)}            ${lpad(f.remaining, 5)}`);
    } else {
      console.log(`   ${lpad(f.step, 2)}  ${pad(f.label, 44)}(− ${lpad(f.removed, 4)})   ${lpad(f.remaining, 5)}`);
    }
    if (f.step === 3) {
      for (const b of drops.brands) console.log(`         - "${b.name}" x${b.count}`);
    }
    if (f.step === 4) {
      const parts = Object.entries(drops.phoneStatus).sort((a, b) => b[1] - a[1])
        .map(([k, v]) => `${k} ${v}`);
      if (parts.length) console.log(`         ${parts.join(' · ')}`);
    }
  }
}

function printCoverage(records) {
  const n = records.length;
  const geo = records.filter((r) => r.latitude != null && r.longitude != null).length;
  const loc = records.filter((r) => r.locality).length;
  const pin = records.filter((r) => r._pincode).length;
  console.log('\n📍 COVERAGE');
  console.log(`   lat/lng present ${geo}/${n} · locality resolved ${loc}/${n} · pincode ${pin}/${n}`);
}

function printByTrade(records) {
  const counts = {};
  for (const r of records) counts[r.trade] = (counts[r.trade] || 0) + 1;
  const line = Object.entries(counts).sort((a, b) => b[1] - a[1])
    .map(([t, c]) => `${t} ${c}`).join(' · ');
  console.log('\n🧭 BY TRADE');
  console.log(`   ${line}`);
}

function printSafety(safety) {
  const { n, checks, childWrites } = safety;
  console.log('\n🔒 SAFETY ASSERTIONS (over every emitted record)');
  let allOk = true;
  for (const c of checks) {
    const ok = c.ok === n;
    if (!ok) allOk = false;
    console.log(`   ${ok ? '✓' : '❌'} ${pad(c.label, 62)} ${c.ok}/${n}`);
  }
  const cw = childWrites === 0;
  if (!cw) allOk = false;
  console.log(`   ${cw ? '✓' : '❌'} ${pad('child-table writes attempted', 62)} ${childWrites}`);
  return allOk;
}

function printSample(records, k = 10) {
  console.log(`\n🔎 SAMPLE (first ${Math.min(k, records.length)} emitted records)`);
  for (const r of records.slice(0, k)) {
    console.log(`   - ${pad(r.fullName, 34)} ${pad(r.trade, 14)} ${pad(r.phoneNumber, 14)} ${r.locality || '(no locality)'}`);
  }
}

// ── Main ─────────────────────────────────────────────────────────────────────

const HELP = `
📇 7 Kaam — public directory listing import

  node import_directory_workers.js [flags]

  --file <path>         input .json or .csv   (default: ../../Data_Scraped/google_maps_businesses.json)
  --dry-run             writes nothing (DEFAULT). No database connection is opened.
  --check-db            dry run PLUS live preflight + phone/suppression collision checks
  --commit              actually write. Required to touch the database.
  --limit <n>           cap the number of rows written (staged rollout)
  --batch-id <s>        value written to importBatchId (default: gmaps-<YYYYMMDD-HHmmss>)
  --report <path>       write the emitted records to a JSON file for review
  --source-name <s>     value written to sourceName (default: "Google Maps")
`;

async function main() {
  const opts = parseArgs(process.argv.slice(2));
  if (opts.help) { console.log(HELP); return; }

  console.log('📇 7 Kaam — public directory listing import');
  console.log(`   file      : ${opts.file}`);
  console.log(`   batch     : ${opts.batchId}`);
  console.log(`   mode      : ${opts.dryRun ? (opts.checkDb ? 'DRY RUN + DB CHECKS (no writes)' : 'DRY RUN (no writes)') : 'COMMIT'}`);
  console.log(`   source    : ${opts.sourceName}`);
  if (opts.limit) console.log(`   limit     : ${opts.limit}`);

  const needsDb = opts.commit || opts.checkDb;

  // ── Preflight ──────────────────────────────────────────────────────────────
  if (needsDb) {
    console.log('\n⏳ Preflight');
    const results = await preflight(db());
    let ok = true;
    for (const r of results) {
      console.log(`   ${r.ok ? '✓' : '❌'} ${r.label}${r.detail ? ` — ${r.detail}` : ''}`);
      if (!r.ok) ok = false;
    }
    if (!ok) {
      console.error('\n❌ Preflight failed. Nothing was written.');
      process.exitCode = 1;
      return;
    }
  } else {
    console.log('\n⏳ Preflight');
    console.log('   ⏭  skipped — dry run does not open a database connection (use --check-db to run it)');
  }

  // ── Normalise ──────────────────────────────────────────────────────────────
  const rows = readRows(opts.file);
  const { funnel, drops, records } = normalize(rows, opts);

  // ── DB gates ───────────────────────────────────────────────────────────────
  let eligible = records;
  let dbSkips = null;
  if (needsDb) {
    const gated = await applyDbGates(db(), records);
    eligible = gated.kept;
    dbSkips = gated.skipped;
  }

  printFunnel(funnel, drops);
  const base = records.length;
  if (dbSkips) {
    const a = dbSkips.SKIPPED_REAL_USER.length;
    const b = dbSkips.SKIPPED_PHONE_TAKEN_BY_OTHER_LISTING.length;
    const c = dbSkips.SKIPPED_SUPPRESSED.length;
    console.log(`    9  ${pad('− phone already held by a signed-up worker', 44)}(− ${lpad(a, 4)})   ${lpad(base - a, 5)}`);
    for (const s of dbSkips.SKIPPED_REAL_USER) console.log(`         - ${s.id} "${s.name}" ${s.phone}`);
    console.log(`   10  ${pad('− phone held by another directory listing', 44)}(− ${lpad(b, 4)})   ${lpad(base - a - b, 5)}`);
    console.log(`   11  ${pad('− previously suppressed (owner removal)', 44)}(− ${lpad(c, 4)})   ${lpad(base - a - b - c, 5)}`);
  } else {
    console.log(`    9  ${pad('− phone already held by a signed-up worker', 44)}(   n/a)   ${lpad(base, 5)}`);
    console.log(`   10  ${pad('− phone held by another directory listing', 44)}(   n/a)   ${lpad(base, 5)}`);
    console.log(`   11  ${pad('− previously suppressed (owner removal)', 44)}(   n/a)   ${lpad(base, 5)}`);
    console.log('         (stages 9–11 require the database — re-run with --check-db or --commit)');
  }
  console.log(`   ==  ${pad('ELIGIBLE', 44)}            ${lpad(eligible.length, 5)}`);

  if (drops.dupPhone.length) {
    console.log('\n   duplicate-phone drops:');
    for (const d of drops.dupPhone) console.log(`     - ${d.phone} dropped "${d.name}" (kept "${d.kept}")`);
  }
  if (drops.dupSourceRef.length) {
    console.log('\n   duplicate-sourceRef drops:');
    for (const d of drops.dupSourceRef) console.log(`     - ${d.sourceRef} dropped "${d.name}"`);
  }

  printByTrade(eligible);
  printCoverage(eligible);

  const safety = assertSafe(eligible);
  const safeOk = printSafety(safety);
  if (!safeOk) {
    console.error('\n❌ Safety assertions failed. Nothing was written.');
    process.exitCode = 1;
    return;
  }

  // ── Limit (applied after the funnel, for staged rollout) ───────────────────
  let toWrite = eligible;
  if (opts.limit > 0 && toWrite.length > opts.limit) {
    toWrite = toWrite.slice(0, opts.limit);
    console.log(`\n✂️  --limit ${opts.limit}: writing the first ${toWrite.length} of ${eligible.length} eligible records`);
  }

  // Strip the bookkeeping key so nothing but spec-listed fields leaves this file.
  const emitted = toWrite.map(({ _pincode, ...rest }) => rest);

  if (opts.report) {
    fs.writeFileSync(opts.report, JSON.stringify(emitted, null, 2));
    console.log(`\n📝 Report written: ${opts.report}`);
  }

  // ── Write ──────────────────────────────────────────────────────────────────
  console.log('\n📝 RESULT');
  if (opts.dryRun) {
    printSample(emitted);
    console.log(`\n   eligible ${eligible.length} · would write ${emitted.length}`);
    console.log('   (DRY RUN — nothing was written. Re-run with --commit to apply.)');
    return;
  }

  const tally = await writeRecords(db(), emitted);
  console.log(`   inserted ${tally.inserted} · updated ${tally.updated} · skipped ${tally.protected} · failed ${tally.failed}`);
  if (tally.protected) {
    console.log('   (skipped = conflicting row is claimed, suppressed, or self-signup — left untouched by design)');
  }
  if (tally.failed) {
    console.error(`   ❌ ${tally.failed} rows failed. sourceRefs: ${tally.failedRefs.join(', ')}`);
    process.exitCode = 1;
    return;
  }
  console.log('\n🎉 Import complete.');
}

main()
  .catch((err) => {
    console.error('❌ Import failed:', err.message);
    if (process.env.DEBUG) console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    if (_prisma) await _prisma.$disconnect();
  });
