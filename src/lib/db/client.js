import crypto from "node:crypto";
import path from "node:path";
import fs from "node:fs";
import DatabaseConstructor from "better-sqlite3";
import { parseDatabaseUrl } from "@/lib/config";

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
  // Only SQLite is supported: an unsupported scheme (postgres://, mysql://...)
  // is a misconfiguration and must fail loudly instead of being turned into
  // an unexpected, empty database file (see src/lib/config.js).
  const parsed = parseDatabaseUrl(process.env.DATABASE_URL);
  if (!parsed.ok) throw new Error(parsed.error);
  const rawPath = parsed.rawPath;
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
  // Phase 10.10: per-user email opt-out (in-app notifications are unaffected).
  addColumnIfMissing(db, "users", "email_notifications", "INTEGER NOT NULL DEFAULT 1");
  addColumnIfMissing(db, "assignments", "created_by", "TEXT REFERENCES users (id) ON DELETE SET NULL");

  // Phase 10.3: lead -> student conversion reference (leads table is from 10.2).
  addColumnIfMissing(db, "leads", "converted_user_id", "TEXT REFERENCES users (id) ON DELETE SET NULL");
  addColumnIfMissing(db, "leads", "converted_at", "TEXT");

  // Phase 10.5: certificate issuance / verification / revocation columns.
  addColumnIfMissing(db, "certificates", "enrollment_id", "TEXT");
  addColumnIfMissing(db, "certificates", "verification_token", "TEXT");
  addColumnIfMissing(db, "certificates", "issued_by", "TEXT REFERENCES users (id) ON DELETE SET NULL");
  addColumnIfMissing(db, "certificates", "issuance_basis", "TEXT");
  addColumnIfMissing(db, "certificates", "approval_note", "TEXT");
  addColumnIfMissing(db, "certificates", "revoked_at", "TEXT");
  addColumnIfMissing(db, "certificates", "revoked_reason", "TEXT");
  addColumnIfMissing(db, "certificates", "revoked_by", "TEXT REFERENCES users (id) ON DELETE SET NULL");

  // Any pre-existing certificate gets an unguessable verification token.
  const untokened = db.prepare("SELECT id FROM certificates WHERE verification_token IS NULL").all();
  const setToken = db.prepare("UPDATE certificates SET verification_token = ? WHERE id = ? AND verification_token IS NULL");
  for (const row of untokened) setToken.run(crypto.randomBytes(18).toString("base64url"), row.id);

  // Phase 10.7: in-app notification deep link + idempotency key.
  addColumnIfMissing(db, "notifications", "link", "TEXT");
  addColumnIfMissing(db, "notifications", "event_key", "TEXT");
  db.exec(`
    CREATE UNIQUE INDEX IF NOT EXISTS idx_notifications_event_key
      ON notifications (user_id, event_key) WHERE event_key IS NOT NULL;
  `);

  db.exec(`
    CREATE UNIQUE INDEX IF NOT EXISTS idx_certificates_verification_token
      ON certificates (verification_token) WHERE verification_token IS NOT NULL;
    CREATE INDEX IF NOT EXISTS idx_certificates_enrollment_id ON certificates (enrollment_id);
  `);
  // At most one ACTIVE certificate per student + course (issuance is also
  // checked inside its transaction; this is the backstop).
  try {
    db.exec(`CREATE UNIQUE INDEX IF NOT EXISTS idx_certificates_one_active
      ON certificates (student_id, course_slug) WHERE status = 'ACTIVE'`);
  } catch {
    // Pre-existing duplicate ACTIVE rows would block the index; the
    // transactional check in issueCertificateTx still prevents new ones.
  }
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

/**
 * Creates the schema and applies the additive migrations as ONE IMMEDIATE
 * transaction (SQLite DDL is transactional): either everything is applied or,
 * if any statement fails, nothing is - a failed start can't leave a half
 * migrated database behind. IMMEDIATE also serializes processes that start at
 * the same moment (e.g. Next's parallel build workers).
 */
export function initializeDatabase(db, schemaSql) {
  db.transaction(() => {
    db.exec(schemaSql);
    migrate(db);
  }).immediate();
}

function createConnection() {
  const dbPath = resolveDatabasePath();
  fs.mkdirSync(path.dirname(dbPath), { recursive: true });

  const db = new DatabaseConstructor(dbPath);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");

  const schemaPath = path.join(process.cwd(), "src", "lib", "db", "schema.sql");
  const schema = fs.readFileSync(schemaPath, "utf-8");
  initializeDatabase(db, schema);

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
