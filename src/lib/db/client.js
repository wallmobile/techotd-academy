import crypto from "node:crypto";
import pg from "pg";
import { parseDatabaseUrl } from "@/lib/config";
import { SCHEMA_SQL } from "@/lib/db/schema";

// --- Data-access boundary (PostgreSQL) -----------------------------------------
//
// This is the ONE place that knows how to reach the database. Everything else goes
// through the modules in src/lib/db/*.js and uses the small async API exported here:
//
//   await db.all(sql, params)  -> rows[]
//   await db.get(sql, params)  -> first row | undefined
//   await db.run(sql, params)  -> { changes }   (rows affected)
//   await db.tx(async (t) => { ... })  -> runs t.all/get/run inside ONE transaction
//
// SQL is written with positional placeholders. For readability two spellings are
// accepted and translated to $1, $2, ...: `?` (params array) and `@name` (params
// object). Values are ALWAYS bound parameters, never interpolated.
//
// Connection: DATABASE_URL, a PostgreSQL connection string (use your provider's
// POOLED / serverless connection string, with sslmode=require, on Vercel-style
// serverless hosting). The pool is created lazily and kept on globalThis so hot
// reloads and duplicated bundles share it; nothing connects at import time, so
// `next build` needs no database.
//
// Schema: applied automatically on first use per process by ensureSchema(), under a
// transaction-scoped advisory lock, so many instances starting at once (serverless cold
// starts, parallel build workers) serialize safely; a hash of the schema text is
// stored so an already-current database costs one cheap query.

const { Pool, types } = pg;
// bigint (COUNT, SUM of bigint money) and numeric come back as strings by default.
types.setTypeParser(20, (v) => Number(v));
types.setTypeParser(1700, (v) => Number(v));

const SCHEMA_LOCK_KEY = 7240411; // arbitrary constant: "techotd schema"
const g = globalThis;

function createPool() {
  const parsed = parseDatabaseUrl(process.env.DATABASE_URL);
  if (!parsed.ok) throw new Error(parsed.error);
  const pool = new Pool({
    connectionString: parsed.url,
    // Small on purpose: serverless platforms run many instances, each with its own
    // pool, and managed databases cap total connections.
    max: 5,
    idleTimeoutMillis: 10_000,
    allowExitOnIdle: true,
    connectionTimeoutMillis: 15_000,
  });
  // A connection the server drops must never crash the process: idle ones are reported
  // on the pool, checked-out ones on the client itself (the running query still rejects
  // with the error, which is what callers see).
  pool.on("error", () => {});
  pool.on("connect", (client) => client.on("error", () => {}));
  return pool;
}

export function getPool() {
  g.__techotdPgPool ??= createPool();
  return g.__techotdPgPool;
}

/** Closes the pool (tests, scripts). The next query creates a new one. */
export async function closeDb() {
  const pool = g.__techotdPgPool;
  g.__techotdPgPool = undefined;
  g.__techotdPgReady = undefined;
  if (pool) await pool.end();
}

async function readSchemaHash(runner) {
  const meta = await runner.query("SELECT to_regclass('public.schema_meta') AS t");
  if (!meta.rows[0].t) return null;
  const row = await runner.query("SELECT value FROM schema_meta WHERE key = 'schema_hash'");
  return row.rows[0]?.value ?? null;
}

// Brings the schema up to date. Safe with many instances starting at once AND behind a
// transaction-pooling proxy (PgBouncer / Neon's pooled endpoint): the only lock is a
// transaction-scoped advisory lock taken inside one transaction, which stays on one
// server connection. (Session-level advisory locks would not.) The common case - the
// database is already current - is a read-only check with no lock at all.
async function ensureSchema(pool) {
  const hash = crypto.createHash("sha256").update(SCHEMA_SQL).digest("hex").slice(0, 16);
  if ((await readSchemaHash(pool)) === hash) return;
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query("SELECT pg_advisory_xact_lock($1)", [SCHEMA_LOCK_KEY]);
    if ((await readSchemaHash(client)) !== hash) {
      await client.query(SCHEMA_SQL);
      await client.query("CREATE TABLE IF NOT EXISTS schema_meta (key TEXT PRIMARY KEY, value TEXT NOT NULL)");
      await client.query("INSERT INTO schema_meta (key, value) VALUES ('schema_hash', $1) ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value", [hash]);
    }
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK").catch(() => {});
    throw error;
  } finally {
    client.release();
  }
}

/** Resolves once the schema is in place (cached; a failure is retried on the next call). */
export function ready() {
  if (!g.__techotdPgReady) {
    const promise = ensureSchema(getPool());
    g.__techotdPgReady = promise;
    promise.catch(() => {
      if (g.__techotdPgReady === promise) g.__techotdPgReady = undefined;
    });
  }
  return g.__techotdPgReady;
}

/**
 * Translates `?` (array params) or `@name` (object params) into $1..$n.
 * Quoted strings, quoted identifiers and comments are left untouched.
 */
export function toPositional(sql, params = []) {
  const values = [];
  const named = !Array.isArray(params) && params !== null && typeof params === "object";
  const index = new Map();
  let out = "";
  let i = 0;
  while (i < sql.length) {
    const ch = sql[i];
    const next = sql[i + 1];
    if (ch === "'" || ch === '"') {
      let j = i + 1;
      while (j < sql.length) {
        if (sql[j] === ch) {
          if (sql[j + 1] === ch) j += 2;
          else break;
        } else j += 1;
      }
      out += sql.slice(i, j + 1);
      i = j + 1;
    } else if (ch === "-" && next === "-") {
      const end = sql.indexOf("\n", i);
      const stop = end === -1 ? sql.length : end;
      out += sql.slice(i, stop);
      i = stop;
    } else if (ch === "/" && next === "*") {
      const end = sql.indexOf("*/", i + 2);
      const stop = end === -1 ? sql.length : end + 2;
      out += sql.slice(i, stop);
      i = stop;
    } else if (ch === "?" && !named) {
      values.push(params[values.length]);
      out += `$${values.length}`;
      i += 1;
    } else if (ch === "@" && named && /[A-Za-z_]/.test(next || "")) {
      let j = i + 1;
      while (j < sql.length && /[A-Za-z0-9_]/.test(sql[j])) j += 1;
      const name = sql.slice(i + 1, j);
      if (!(name in params)) throw new Error(`Missing SQL parameter @${name}`);
      if (!index.has(name)) {
        values.push(params[name]);
        index.set(name, values.length);
      }
      out += `$${index.get(name)}`;
      i = j;
    } else {
      out += ch;
      i += 1;
    }
  }
  if (!named && values.length !== params.length) throw new Error(`SQL has ${values.length} placeholders but ${params.length} values were given`);
  // undefined is not a valid parameter value: treat it as NULL
  return { text: out, values: values.map((v) => (v === undefined ? null : v)) };
}

function api(executor) {
  const exec = async (sql, params) => {
    const { text, values } = toPositional(sql, params);
    return executor.query(text, values);
  };
  return {
    async all(sql, params = []) {
      return (await exec(sql, params)).rows;
    },
    async get(sql, params = []) {
      return (await exec(sql, params)).rows[0];
    },
    async run(sql, params = []) {
      const r = await exec(sql, params);
      return { changes: r.rowCount ?? 0 };
    },
    /** Several statements without parameters (DDL / maintenance). */
    async exec(sql) {
      await executor.query(sql);
    },
  };
}

const RETRYABLE = new Set(["40001", "40P01"]); // serialization failure, deadlock detected

// A pooled connection can die while a serverless instance is frozen, or when a
// serverless database scales to zero and back. The pool replaces dead connections,
// but the request that picked one up first would fail. We retry exactly once, and
// only where that cannot repeat a write: plain reads, or a transaction whose BEGIN
// never reached the server.
// 57P01-57P03: the server is shutting the connection down (Neon sends 57P01 to idle
// connections when it suspends); 08xxx: connection exceptions.
const DEAD_CONNECTION_CODES = new Set(["57P01", "57P02", "57P03", "08000", "08003", "08006"]);
const isDeadConnection = (error) =>
  DEAD_CONNECTION_CODES.has(error?.code) || /not queryable|Connection terminated|ECONNRESET|EPIPE|ETIMEDOUT/i.test(`${error?.message ?? ""} ${error?.code ?? ""}`);
const isRead = (text) => /^\s*(SELECT|WITH)\b/i.test(text);

const pooled = {
  query: async (text, values) => {
    await ready();
    try {
      return await getPool().query(text, values);
    } catch (error) {
      if (isDeadConnection(error) && isRead(text)) return getPool().query(text, values);
      throw error;
    }
  },
};

export const db = {
  ...api(pooled),
  /**
   * Runs fn(t) in ONE transaction (READ COMMITTED). The function may be re-run
   * if PostgreSQL reports a deadlock / serialization failure, so keep side
   * effects (emails, notifications) outside it. Use `SELECT ... FOR UPDATE` on
   * the parent row (or t.lock(key), an advisory lock) where two requests must
   * not interleave.
   */
  async tx(fn) {
    await ready();
    for (let attempt = 1; ; attempt += 1) {
      const client = await getPool().connect();
      let begun = false;
      let broken = false;
      try {
        await client.query("BEGIN");
        begun = true;
        const result = await fn({ ...api(client), lock: (key) => client.query("SELECT pg_advisory_xact_lock(hashtext($1))", [String(key)]) });
        await client.query("COMMIT");
        return result;
      } catch (error) {
        broken = isDeadConnection(error);
        if (!broken) await client.query("ROLLBACK").catch(() => {});
        if (RETRYABLE.has(error?.code) && attempt < 4) continue;
        if (broken && !begun && attempt < 2) continue; // nothing ran: safe to try a fresh connection
        throw error;
      } finally {
        client.release(broken); // a dead connection is destroyed, not returned to the pool
      }
    }
  },
};

// PostgreSQL error classes the application reacts to.
export const isUniqueViolation = (error) => error?.code === "23505";
export const isForeignKeyViolation = (error) => error?.code === "23503" || error?.code === "23001"; // 23001 = ON DELETE RESTRICT
export const isCheckViolation = (error) => error?.code === "23514";
