/**
 * Supabase-backed database client.
 *
 * We wrap @supabase/supabase-js so every controller continues to call
 * `prisma.<model>.<method>()` — identical API, no controller changes needed.
 *
 * Why: Supabase free-tier blocks external TCP on port 5432/6543 (IPv4 Add-on
 * required). The HTTPS REST API (PostgREST) always works on port 443.
 */
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY,
  { auth: { persistSession: false } }
);

// ── tiny helpers ──────────────────────────────────────────────────────────────

function snakeToModel(name) {
  // Prisma model names → Supabase table names (we use PascalCase for tables)
  return name;
}

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
    } else if (typeof val === 'object' && !Array.isArray(val)) {
      if (val.in)         query = query.in(key, val.in);
      else if (val.gte)   query = query.gte(key, val.gte);
      else if (val.lte)   query = query.lte(key, val.lte);
      else if (val.gt)    query = query.gt(key, val.gt);
      else if (val.lt)    query = query.lt(key, val.lt);
      else if (val.not)   query = query.neq(key, val.not);
      else if (val.contains) query = query.ilike(key, `%${val.contains}%`);
      else                query = query.eq(key, val);
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
    if (val === true) parts.push(`${rel}(*)`);
    else if (typeof val === 'object') {
      const subSel = val.select
        ? Object.keys(val.select).join(',')
        : '*';
      const subOrder = val.orderBy
        ? Object.entries(val.orderBy).map(([k, v]) => `${k}.${v}`).join(',')
        : null;
      let relStr = `${rel}(${subSel})`;
      parts.push(relStr);
    }
  }
  return parts.join(',');
}

// ── model proxy factory ───────────────────────────────────────────────────────

function makeModel(table) {
  return {
    async findUnique({ where, include, select } = {}) {
      let q = supabase.from(table).select(buildSelect(include)).limit(1);
      q = applyWhere(q, where);
      const { data, error } = await q;
      if (error) dbError('findUnique', table, error.message);
      return data?.[0] ?? null;
    },

    async findFirst({ where, include, orderBy, select } = {}) {
      let q = supabase.from(table).select(buildSelect(include)).limit(1);
      q = applyWhere(q, where);
      if (orderBy) {
        for (const [col, dir] of Object.entries(orderBy)) {
          q = q.order(col, { ascending: dir === 'asc' });
        }
      }
      const { data, error } = await q;
      if (error) dbError('findFirst', table, error.message);
      return data?.[0] ?? null;
    },

    async findMany({ where, include, orderBy, skip, take, select } = {}) {
      let q = supabase.from(table).select(buildSelect(include), { count: 'exact' });
      q = applyWhere(q, where);
      if (orderBy) {
        for (const [col, dir] of Object.entries(Array.isArray(orderBy) ? orderBy.reduce((a, o) => ({ ...a, ...o }), {}) : orderBy)) {
          q = q.order(col, { ascending: dir === 'asc' });
        }
      }
      if (skip != null) q = q.range(skip, skip + (take ?? 1000) - 1);
      else if (take != null) q = q.limit(take);
      const { data, error, count } = await q;
      if (error) dbError('findMany', table, error.message);
      return Object.assign(data ?? [], { _count: count });
    },

    async count({ where } = {}) {
      let q = supabase.from(table).select('*', { count: 'exact', head: true });
      q = applyWhere(q, where);
      const { count, error } = await q;
      if (error) dbError('count', table, error.message);
      return count ?? 0;
    },

    async create({ data, include } = {}) {
      // Prisma generates UUIDs — we need to supply them
      if (!data.id) {
        data.id = require('crypto').randomUUID();
      }
      const { data: rows, error } = await supabase
        .from(table)
        .insert(data)
        .select(buildSelect(include));
      if (error) dbError('create', table, error.message);
      return rows?.[0] ?? null;
    },

    async update({ where, data, include } = {}) {
      // Remove undefined values
      const cleaned = Object.fromEntries(
        Object.entries(data).filter(([, v]) => v !== undefined)
      );
      let q = supabase.from(table).update(cleaned).select(buildSelect(include));
      q = applyWhere(q, where);
      const { data: rows, error } = await q;
      if (error) dbError('update', table, error.message);
      return rows?.[0] ?? null;
    },

    async upsert({ where, create: createData, update: updateData, include } = {}) {
      // Try update first; if nothing updated, insert
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

    async aggregate({ where, _avg, _sum, _count, _min, _max } = {}) {
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
      // Manual grouping
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
        if (_count) out._count = (_count === true || _count?.id) ? { id: g._rawCount } : g._rawCount;
        if (_sum)  { out._sum = {}; for (const f of Object.keys(_sum)) out._sum[f] = g._sumAcc[f] ?? 0; }
        if (_avg)  { out._avg = {}; for (const f of Object.keys(_avg)) { const arr = g._avgAcc[f] ?? []; out._avg[f] = arr.length ? arr.reduce((a,b)=>a+b,0)/arr.length : null; } }
        return out;
      });
      if (orderBy) {
        const entries = Object.entries(Array.isArray(orderBy) ? orderBy.reduce((a,o)=>({...a,...o}),{}) : orderBy);
        const [col, dir] = entries[0];
        result.sort((a, b) => {
          const av = col === '_count' ? a._count?.id ?? a._count : a[col];
          const bv = col === '_count' ? b._count?.id ?? b._count : b[col];
          return dir === 'asc' ? (av??0)-(bv??0) : (bv??0)-(av??0);
        });
      }
      return result;
    },
  };
}

// ── expose prisma-like interface ──────────────────────────────────────────────

const db = {
  worker:         makeModel('Worker'),
  admin:          makeModel('Admin'),
  tradeTest:      makeModel('TradeTest'),
  testSubmission: makeModel('TestSubmission'),
  workHistory:    makeModel('WorkHistory'),
  kaamCard:       makeModel('KaamCard'),
  scoringLog:     makeModel('ScoringLog'),
  customer:       makeModel('Customer'),
  booking:        makeModel('Booking'),

  // Raw SQL via supabase rpc (for complex queries)
  $queryRaw: async (query, ...params) => {
    const { data, error } = await supabase.rpc('exec_sql', { sql: String(query) });
    if (error) throw new Error(error.message);
    return data;
  },

  $disconnect: async () => { /* no-op for supabase */ },
  supabase, // expose for direct usage
};

module.exports = db;
