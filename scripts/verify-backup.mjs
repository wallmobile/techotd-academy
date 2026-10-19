// Verifies a database backup WITHOUT modifying it (opens it read-only):
//
//   node scripts/verify-backup.mjs <backup-file>
//
// Checks SQLite integrity, foreign-key consistency and that every table the
// application schema defines is present, then prints row COUNTS (never row
// contents). Exit code 0 = usable backup, 1 = do not rely on it.
// Run it on a fresh backup, and on a backup restored to a scratch location,
// before trusting a backup routine (see docs/STAGING.md).
import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";

const file = process.argv[2];
if (!file) {
  console.error("Usage: node scripts/verify-backup.mjs <backup-file>");
  process.exit(2);
}
const target = path.resolve(file);
if (!fs.existsSync(target)) {
  console.error(`File not found: ${target}`);
  process.exit(1);
}

const problems = [];
let db;
try {
  db = new Database(target, { readonly: true, fileMustExist: true });
} catch (error) {
  console.error(`Not a usable SQLite database: ${error.message}`);
  process.exit(1);
}

try {
  const integrity = db.pragma("integrity_check", { simple: true });
  if (integrity !== "ok") problems.push(`integrity_check: ${integrity}`);

  const fk = db.pragma("foreign_key_check");
  if (fk.length > 0) problems.push(`foreign_key_check: ${fk.length} violation(s)`);

  // Every table the schema defines must exist in the backup.
  const schemaSql = fs.readFileSync(path.join(import.meta.dirname, "..", "src", "lib", "db", "schema.sql"), "utf8");
  // Statement starts only (a line beginning with the keywords), not prose in SQL comments.
  const expected = [...schemaSql.matchAll(/^CREATE TABLE IF NOT EXISTS\s+([a-z_]+)/gim)].map((m) => m[1]);
  const present = new Set(db.prepare("SELECT name FROM sqlite_master WHERE type = 'table'").all().map((r) => r.name));
  const missing = expected.filter((t) => !present.has(t));
  if (missing.length > 0) problems.push(`missing tables: ${missing.join(", ")}`);

  const counts = {};
  for (const table of ["users", "student_profiles", "batch_enrollments", "fee_plans", "payments", "certificates", "leads", "catalog_courses", "catalog_batches", "audit_log"]) {
    if (present.has(table)) counts[table] = db.prepare(`SELECT COUNT(*) AS c FROM ${table}`).get().c;
  }
  console.log(`Tables checked: ${expected.length - missing.length}/${expected.length}`);
  console.log("Row counts:", JSON.stringify(counts));
} catch (error) {
  problems.push(`unreadable: ${error.message}`);
} finally {
  db.close();
}

if (problems.length > 0) {
  console.error(`BACKUP NOT VALID:\n - ${problems.join("\n - ")}`);
  process.exit(1);
}
console.log(`Backup verified: ${target}`);
