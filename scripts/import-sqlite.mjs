#!/usr/bin/env node
// Copies the data of an OLD SQLite database (from before the move to PostgreSQL) into the
// PostgreSQL database in DATABASE_URL:
//
//   npm run db:import-sqlite                    # reads data/app.db
//   npm run db:import-sqlite -- path/to/old.db
//
// Meant for carrying a development database across the migration. Safety:
// - the SQLite file is opened READ-ONLY and never changed;
// - it refuses if the target already contains users (it never merges into live data);
// - everything is copied in ONE transaction: all of it or nothing;
// - sessions, password-reset tokens and rate-limit counters are not copied (they are
//   short-lived; everyone simply signs in again);
// - row counts are printed, never row contents or the connection string.
import { register } from "node:module";
import path from "node:path";
import fs from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import { DatabaseSync } from "node:sqlite";

register(new URL("./alias-loader.mjs", import.meta.url));
const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const srcUrl = (p) => pathToFileURL(path.join(ROOT, p)).href;

const SKIP = new Set(["sessions", "password_reset_tokens", "rate_limits", "schema_meta"]);

const file = path.resolve(process.argv[2] || path.join(ROOT, "data", "app.db"));
if (!fs.existsSync(file)) {
  console.error(`SQLite file not found: ${file}`);
  process.exit(1);
}

const { db, closeDb } = await import(srcUrl("src/lib/db/client.js"));
const sqlite = new DatabaseSync(file, { readOnly: true });

try {
  await db.get("SELECT 1 AS ok"); // creates the PostgreSQL schema if needed
  if ((await db.get("SELECT COUNT(*) AS c FROM users")).c > 0) {
    console.error("The target database already has users. Import only into an empty database (nothing was changed).");
    process.exit(1);
  }

  // PostgreSQL tables + insertable columns (identity columns are generated)
  const cols = await db.all(
    `SELECT table_name, column_name, data_type, is_identity FROM information_schema.columns
     WHERE table_schema = current_schema() ORDER BY table_name, ordinal_position`
  );
  const pgTables = new Map();
  for (const c of cols) {
    if (c.is_identity === "YES") continue;
    if (!pgTables.has(c.table_name)) pgTables.set(c.table_name, new Map());
    pgTables.get(c.table_name).set(c.column_name, c.data_type);
  }

  // parents before children
  const fks = await db.all(
    `SELECT tc.table_name AS child, ccu.table_name AS parent
     FROM information_schema.table_constraints tc
     JOIN information_schema.constraint_column_usage ccu ON ccu.constraint_name = tc.constraint_name AND ccu.table_schema = tc.table_schema
     WHERE tc.constraint_type = 'FOREIGN KEY' AND tc.table_schema = current_schema()`
  );
  const sqliteTables = new Set(sqlite.prepare("SELECT name FROM sqlite_master WHERE type = 'table'").all().map((r) => r.name));
  const tables = [...pgTables.keys()].filter((t) => sqliteTables.has(t) && !SKIP.has(t));
  const ordered = [];
  const visiting = new Set();
  const visit = (t) => {
    if (ordered.includes(t) || visiting.has(t)) return;
    visiting.add(t);
    for (const fk of fks) if (fk.child === t && fk.parent !== t && tables.includes(fk.parent)) visit(fk.parent);
    ordered.push(t);
  };
  tables.forEach(visit);

  const convert = (value, type) => {
    if (value === null || value === undefined) return null;
    if (type === "boolean") return Boolean(Number(value));
    if (type === "bigint" || type === "integer" || type === "smallint") return Number(value);
    if (type === "text" || type.startsWith("character")) return String(value);
    return value;
  };

  const counts = {};
  await db.tx(async (t) => {
    for (const table of ordered) {
      const target = pgTables.get(table);
      const sourceCols = new Set(sqlite.prepare(`PRAGMA table_info("${table}")`).all().map((c) => c.name));
      const names = [...target.keys()].filter((c) => sourceCols.has(c));
      const rows = sqlite.prepare(`SELECT ${names.map((n) => `"${n}"`).join(", ")} FROM "${table}"`).all();
      const sql = `INSERT INTO ${table} (${names.join(", ")}) VALUES (${names.map(() => "?").join(", ")}) ON CONFLICT DO NOTHING`;
      let copied = 0;
      for (const row of rows) copied += (await t.run(sql, names.map((n) => convert(row[n], target.get(n))))).changes;
      counts[table] = copied;
    }
  });

  console.log(`Imported from ${path.relative(ROOT, file) || file}:`);
  for (const [table, n] of Object.entries(counts)) if (n) console.log(`  ${table}: ${n}`);
  console.log("Not copied (short-lived): sessions, password reset tokens, rate-limit counters. Sign in again.");
} finally {
  sqlite.close();
  await closeDb();
}
