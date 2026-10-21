// Checks that a pg_dump backup is readable and contains the application's data,
// WITHOUT touching any database:
//
//   node scripts/verify-backup.mjs <backup-file>
//
// Runs `pg_restore --list` (which parses the whole archive table of contents and
// fails on a truncated or corrupt file) and confirms the tables the application
// needs are present with their data. Exit code 0 = usable backup, 1 = do not
// rely on it. To prove a restore actually works, also restore into a scratch
// database (docs/STAGING.md, "Restore drill").
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

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

const result = spawnSync("pg_restore", ["--list", target], { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
if (result.error?.code === "ENOENT") {
  console.error("pg_restore was not found. Install the PostgreSQL client tools.");
  process.exit(1);
}
if (result.status !== 0) {
  console.error(`Not a usable pg_dump archive: ${(result.stderr || "").trim().split("\n").slice(-2).join(" ")}`);
  process.exit(1);
}

const toc = result.stdout;
const REQUIRED = ["users", "sessions", "student_profiles", "batch_enrollments", "audit_log", "catalog_courses", "fee_plans", "payments", "certificates"];
const problems = [];
for (const table of REQUIRED) {
  if (!new RegExp(`\\bTABLE public ${table}\\b`).test(toc)) problems.push(`table missing: ${table}`);
  else if (!new RegExp(`\\bTABLE DATA public ${table}\\b`).test(toc)) problems.push(`table has no data section: ${table}`);
}
if (problems.length) {
  console.error("Backup is NOT usable:\n  - " + problems.join("\n  - "));
  process.exit(1);
}
const entries = toc.split("\n").filter((l) => l && !l.startsWith(";")).length;
console.log(`Backup archive is readable: ${entries} objects, all required tables present.`);
