/**
 * Supabase-backed database client.
 *
 * We wrap @supabase/supabase-js so every controller continues to call
 * `prisma.<model>.<method>()` — identical API, no controller changes needed.
 */
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  throw new Error(
    'SUPABASE_URL and SUPABASE_SERVICE_KEY must be set in the environment — see backend/.env.example'
  );
}

const supabase = createClient(
  SUPABASE_URL,
  SUPABASE_SERVICE_KEY,
  { auth: { persistSession: false } }
);

const REL_TO_TABLE = {
  kaamCards: 'KaamCard',
  kaamCard: 'KaamCard',
  kaamCardHistories: 'KaamCardHistory',
  kaamCardHistory: 'KaamCardHistory',
  histories: 'KaamCardHistory',
  workHistories: 'WorkHistory',
  workHistory: 'WorkHistory',
  testSubmissions: 'TestSubmission',
  testSubmission: 'TestSubmission',
  scoringLogs: 'ScoringLog',
  scoringLog: 'ScoringLog',
  bookings: 'Booking',
  booking: 'Booking',
  createdTests: 'TradeTest',
  test: 'TradeTest',
  submissions: 'TestSubmission',
  admin: 'Admin',
  worker: 'Worker',
  customer: 'Customer',
  reporterCustomer: 'Customer',
  reports: 'Report',
  report: 'Report',
  skillCertificates: 'SkillCertificate',
  skillCertificate: 'SkillCertificate',
  certificates: 'SkillCertificate',
  videoAssessments: 'VideoAssessment',
  videoAssessment: 'VideoAssessment',
  prerequisite: 'TradeTest',
  dependentTests: 'TradeTest',
};

/** Throw a Prisma-style error so controllers don't need changes */
function dbError(op, table, msg) {
  const err = new Error(msg);
  err.code = 'SUPABASE';
  err.meta = { modelName: table, operation: op };
  throw err;
}

/** Convert Prisma `where` to Supabase filter chain */
function applyWhere(query, where = {}) {
  for (const [key, val] of Object.entries(where)) {
    if (val === null) {
      query = query.is(key, null);
    } else if (val instanceof Date) {
      query = query.eq(key, val.toISOString());
    } else if (typeof val === 'object' && !Array.isArray(val)) {
      const fmt = (v) => (v instanceof Date ? v.toISOString() : v);
      if (val.in) query = query.in(key, val.in.map(fmt));
      else if (val.gte) query = query.gte(key, fmt(val.gte));
      else if (val.lte) query = query.lte(key, fmt(val.lte));
      else if (val.gt) query = query.gt(key, fmt(val.gt));
      else if (val.lt) query = query.lt(key, fmt(val.lt));
      else if ('not' in val) {
        if (val.not === null) query = query.not(key, 'is', null);
        else query = query.neq(key, fmt(val.not));
      } else if (val.contains) {
        query = query.ilike(key, `%${val.contains}%`);
      } else {
        query = query.eq(key, val);
      }
    } else {
      query = query.eq(key, val);
    }
  }
  return query;
}

/** Build a Supabase select string from Prisma `include` */
function buildSelect(include = {}) {
  const parts = ['*'];
  for (const [rel, val] of Object.entries(include)) {
    if (rel.startsWith('_')) continue;
    const tableName = REL_TO_TABLE[rel] || rel;
    if (val === true) {
      parts.push(`${tableName}(*)`);
    } else if (typeof val === 'object') {
      const subSel = val.select
        ? Object.keys(val.select).join(',')
        : '*';
      parts.push(`${tableName}(${subSel})`);
    }
  }
  if (include._count && typeof include._count === 'object' && include._count.select) {
    for (const rel of Object.keys(include._count.select)) {
      const tableName = REL_TO_TABLE[rel] || rel;
      if (!parts.some(p => p.startsWith(tableName))) {
        parts.push(`${tableName}(id)`);
      }
    }
  }
  return parts.join(',');
}

/** Transform returned PostgREST row keys back to Prisma camelCase relation keys */
function transformRow(row, include) {
  if (!row) return row;
  const out = { ...row };
  if (include) {
    for (const [rel] of Object.entries(include)) {
      if (rel.startsWith('_')) continue;
      const tableName = REL_TO_TABLE[rel] || rel;
      if (out[tableName] !== undefined) {
        let val = out[tableName];
        if (['worker', 'admin', 'test', 'customer', 'kaamCard'].includes(rel) && Array.isArray(val)) {
          val = val[0] || null;
        }
        out[rel] = val;
        if (tableName !== rel) {
          delete out[tableName];
        }
      }
    }
    if (include._count) {
      out._count = {};
      if (typeof include._count === 'object' && include._count.select) {
        for (const [rel] of Object.entries(include._count.select)) {
          const tableName = REL_TO_TABLE[rel] || rel;
          const arr = row[tableName] || row[rel] || [];
          out._count[rel] = Array.isArray(arr) ? arr.length : (arr ? 1 : 0);
          if (!include[rel]) {
            delete out[tableName];
            delete out[rel];
          }
        }
      }
    }
  }
  return out;
}

// ── model proxy factory ───────────────────────────────────────────────────────

function makeModel(table) {
  return {
    async findUnique({ where, include } = {}) {
      let q = supabase.from(table).select(buildSelect(include)).limit(1);
      q = applyWhere(q, where);
      const { data, error } = await q;
      if (error) {
        if (error.message.includes('schema cache')) return null;
        dbError('findUnique', table, error.message);
      }
      return data?.[0] ? transformRow(data[0], include) : null;
    },

    async findFirst({ where, include, orderBy } = {}) {
      let q = supabase.from(table).select(buildSelect(include)).limit(1);
      q = applyWhere(q, where);
      if (orderBy) {
        for (const [col, dir] of Object.entries(orderBy)) {
          q = q.order(col, { ascending: dir === 'asc' });
        }
      }
      const { data, error } = await q;
      if (error) {
        if (error.message.includes('schema cache')) return null;
        dbError('findFirst', table, error.message);
      }
      return data?.[0] ? transformRow(data[0], include) : null;
    },

    async findMany({ where, include, orderBy, skip, take } = {}) {
      let q = supabase.from(table).select(buildSelect(include), { count: 'exact' });
      q = applyWhere(q, where);
      if (orderBy) {
        const orderObj = Array.isArray(orderBy)
          ? orderBy.reduce((a, o) => ({ ...a, ...o }), {})
          : orderBy;
        for (const [col, dir] of Object.entries(orderObj)) {
          q = q.order(col, { ascending: dir === 'asc' });
        }
      }
      if (skip != null) q = q.range(skip, skip + (take ?? 1000) - 1);
      else if (take != null) q = q.limit(take);

      const { data, error, count } = await q;
      if (error) {
        if (error.message.includes('schema cache')) {
          const empty = [];
          return Object.assign(empty, { _count: 0 });
        }
        dbError('findMany', table, error.message);
      }
      const transformed = (data ?? []).map(r => transformRow(r, include));
      return Object.assign(transformed, { _count: count });
    },

    async count({ where } = {}) {
      let q = supabase.from(table).select('*', { count: 'exact', head: true });
      q = applyWhere(q, where);
      const { count, error } = await q;
      if (error) {
        if (error.message.includes('schema cache')) return 0;
        dbError('count', table, error.message);
      }
      return count ?? 0;
    },

    async create({ data, include } = {}) {
      if (!data.id) {
        data.id = require('crypto').randomUUID();
      }
      if (table === 'Worker' && !data.updatedAt) {
        data.updatedAt = new Date().toISOString();
      }
      const { data: rows, error } = await supabase
        .from(table)
        .insert(data)
        .select(buildSelect(include));
      if (error) {
        const colMatch = error.message?.match(/Could not find the '([^']+)' column/i);
        if (colMatch && colMatch[1] && data[colMatch[1]] !== undefined) {
          const fallbackData = { ...data };
          delete fallbackData[colMatch[1]];
          return this.create({ data: fallbackData, include });
        }
        dbError('create', table, error.message);
      }
      return rows?.[0] ? transformRow(rows[0], include) : null;
    },

    async update({ where, data, include } = {}) {
      const cleaned = Object.fromEntries(
        Object.entries(data).filter(([, v]) => v !== undefined)
      );
      if (table === 'Worker' && !cleaned.updatedAt) {
        cleaned.updatedAt = new Date().toISOString();
      }
      let q = supabase.from(table).update(cleaned).select(buildSelect(include));
      q = applyWhere(q, where);
      const { data: rows, error } = await q;
      if (error) {
        const colMatch = error.message?.match(/Could not find the '([^']+)' column/i);
        if (colMatch && colMatch[1] && cleaned[colMatch[1]] !== undefined) {
          const fallbackData = { ...cleaned };
          delete fallbackData[colMatch[1]];
          return this.update({ where, data: fallbackData, include });
        }
        dbError('update', table, error.message);
      }
      return rows?.[0] ? transformRow(rows[0], include) : null;
    },

    async upsert({ where, create: createData, update: updateData, include } = {}) {
      let q = supabase.from(table).select('id');
      q = applyWhere(q, where);
      const { data: existing } = await q;
      if (existing?.length) {
        return this.update({ where, data: updateData, include });
      } else {
        return this.create({ data: { ...createData }, include });
      }
    },

    async delete({ where } = {}) {
      let q = supabase.from(table).delete().select('*');
      q = applyWhere(q, where);
      const { data, error } = await q;
      if (error) dbError('delete', table, error.message);
      return data?.[0] ?? null;
    },

    async aggregate({ where, _avg, _sum, _count } = {}) {
      let q = supabase.from(table).select('*');
      q = applyWhere(q, where);
      const { data, error } = await q;
      if (error) dbError('aggregate', table, error.message);
      const rows = data ?? [];
      const result = {};
      if (_avg) {
        result._avg = {};
        for (const f of Object.keys(_avg)) {
          const vals = rows.map(r => r[f]).filter(v => v != null);
          result._avg[f] = vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null;
        }
      }
      if (_sum) {
        result._sum = {};
        for (const f of Object.keys(_sum)) {
          result._sum[f] = rows.reduce((acc, r) => acc + (r[f] ?? 0), 0);
        }
      }
      if (_count) {
        result._count = typeof _count === 'object'
          ? Object.fromEntries(Object.keys(_count).map(f => [f, rows.filter(r => r[f] != null).length]))
          : rows.length;
      }
      return result;
    },

    async groupBy({ by, where, _count, _avg, _sum, orderBy } = {}) {
      let q = supabase.from(table).select('*');
      q = applyWhere(q, where);
      const { data, error } = await q;
      if (error) dbError('groupBy', table, error.message);
      const groups = {};
      for (const row of data ?? []) {
        const key = by.map(b => row[b]).join('\x00');
        if (!groups[key]) {
          groups[key] = { ...Object.fromEntries(by.map(b => [b, row[b]])), _rawCount: 0, _sumAcc: {}, _avgAcc: {} };
        }
        groups[key]._rawCount++;
        if (_sum) for (const f of Object.keys(_sum)) {
          groups[key]._sumAcc[f] = (groups[key]._sumAcc[f] ?? 0) + (row[f] ?? 0);
        }
        if (_avg) for (const f of Object.keys(_avg)) {
          if (!groups[key]._avgAcc[f]) groups[key]._avgAcc[f] = [];
          if (row[f] != null) groups[key]._avgAcc[f].push(row[f]);
        }
      }
      const result = Object.values(groups).map(g => {
        const out = Object.fromEntries(by.map(b => [b, g[b]]));
        if (_count) out._count = g._rawCount;
        if (_sum)  { out._sum = {}; for (const f of Object.keys(_sum)) out._sum[f] = g._sumAcc[f] ?? 0; }
        if (_avg)  { out._avg = {}; for (const f of Object.keys(_avg)) { const arr = g._avgAcc[f] ?? []; out._avg[f] = arr.length ? arr.reduce((a,b)=>a+b,0)/arr.length : null; } }
        return out;
      });
      if (orderBy) {
        const orderObj = Array.isArray(orderBy)
          ? orderBy.reduce((a, o) => ({ ...a, ...o }), {})
          : orderBy;
        const [col, dir] = Object.entries(orderObj)[0];
        result.sort((a, b) => {
          const av = col === '_count' ? a._count : a[col];
          const bv = col === '_count' ? b._count : b[col];
          return dir === 'asc' ? (av ?? 0) - (bv ?? 0) : (bv ?? 0) - (av ?? 0);
        });
      }
      return result;
    },
  };
}

// ── expose prisma-like interface ──────────────────────────────────────────────

const db = {
  worker:           makeModel('Worker'),
  admin:            makeModel('Admin'),
  tradeTest:        makeModel('TradeTest'),
  testSubmission:   makeModel('TestSubmission'),
  workHistory:      makeModel('WorkHistory'),
  kaamCard:         makeModel('KaamCard'),
  kaamCardHistory:  makeModel('KaamCardHistory'),
  skillCertificate: makeModel('SkillCertificate'),
  videoAssessment:  makeModel('VideoAssessment'),
  scoringLog:       makeModel('ScoringLog'),
  customer:         makeModel('Customer'),
  report:           makeModel('Report'),
  // DEPRECATED: booking is not part of the current product surface — kept
  // so historical rows remain queryable, but no route calls this.
  booking:          makeModel('Booking'),

  $queryRaw: async (query) => {
    const { data, error } = await supabase.rpc('exec_sql', { sql: String(query) });
    if (error) throw new Error(error.message);
    return data;
  },

  $disconnect: async () => {},
  supabase,
};

module.exports = db;
