import path from "node:path";
import fs from "node:fs";
import DatabaseConstructor from "better-sqlite3";

// --- Data-access boundary -------------------------------------------------
//
// This is the ONE place that knows how to reach the database. Everything
// else in the app goes through `src/lib/db/users.js` / `sessions.js` /
// `passwordResetTokens.js`, never through this file's `Database` instance
// directly. That keeps a future swap to PostgreSQL (a real relational
// server) to this file plus the three data-access modules — no changes
// required in Server Actions, pages, or components.
//
// Why SQLite here: this project's build environment has no reachable
// PostgreSQL server and no route to download Prisma's query-engine binary
// (outbound network is allowlisted to package registries only), so a
// server-based ORM could not be configured. better-sqlite3 is a
// well-maintained, widely used, synchronous SQLite driver that needs no
// external service and no binary download from a non-allowlisted host.
// The schema (schema.sql) is written in portable SQL and the access layer
// is thin specifically so this decision is reversible without an app
// rewrite. See the Phase 7 report for the full evaluation.

function resolveDatabasePath() {
  const url = process.env.DATABASE_URL || "file:./data/app.db";
  const rawPath = url.startsWith("file:") ? url.slice("file:".length) : url;
  if (path.isAbsolute(rawPath)) return rawPath;

  // Deliberately scoped to a literal "data" subfolder (rather than
  // joining process.cwd() with an arbitrary dynamic path) so the bundler
  // doesn't trace and bundle the entire project as a filesystem
  // dependency of this module — see the Turbopack "Dynamic filesystem
  // access" warning this avoids.
  const fileName = path.basename(rawPath) || "app.db";
  return path.join(process.cwd(), "data", fileName);
}

// Additive, idempotent migrations for databases created before a column
// existed (schema.sql's CREATE TABLE IF NOT EXISTS never alters an existing
// table). Existing data is preserved; nothing is dropped or recreated.
function migrate(db) {
  // Phase 9.4: assignments.created_by (authoring trainer).
  addColumnIfMissing(db, "assignments", "created_by", "TEXT REFERENCES users (id) ON DELETE SET NULL");

  // Phase 10.3: lead -> student conversion reference (leads table is from 10.2).
  addColumnIfMissing(db, "leads", "converted_user_id", "TEXT REFERENCES users (id) ON DELETE SET NULL");
  addColumnIfMissing(db, "leads", "converted_at", "TEXT");
}

// `table`/`column`/`definition` are fixed literals from migrate() above,
// never external input. Several processes can open the database at the same
// moment (e.g. Next's parallel build workers), so losing the race to add the
// column is expected and harmless: "duplicate column name" is swallowed.
function addColumnIfMissing(db, table, column, definition) {
  const columns = db.prepare(`PRAGMA table_info(${table})`).all();
  if (columns.some((c) => c.name === column)) return;
  try {
    db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
  } catch (error) {
    if (!/duplicate column name/i.test(String(error?.message))) throw error;
  }
}

function createConnection() {
  const dbPath = resolveDatabasePath();
  fs.mkdirSync(path.dirname(dbPath), { recursive: true });

  const db = new DatabaseConstructor(dbPath);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");

  const schemaPath = path.join(process.cwd(), "src", "lib", "db", "schema.sql");
  const schema = fs.readFileSync(schemaPath, "utf-8");
  db.exec(schema);
  migrate(db);

  return db;
}

// Reused across hot-reloads in dev (mirrors the standard Next.js
// "globalThis singleton" pattern used for database clients) so we don't
// open a new file handle on every request.
const globalForDb = globalThis;

export const db = globalForDb.__techotdDb || createConnection();

if (process.env.NODE_ENV !== "production") {
  globalForDb.__techotdDb = db;
}
