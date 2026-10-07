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
  const assignmentColumns = db.prepare("PRAGMA table_info(assignments)").all();
  if (!assignmentColumns.some((c) => c.name === "created_by")) {
    db.exec("ALTER TABLE assignments ADD COLUMN created_by TEXT REFERENCES users (id) ON DELETE SET NULL");
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
