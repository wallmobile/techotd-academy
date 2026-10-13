// Online, consistent backup of the SQLite database (safe while the app runs;
// uses SQLite's backup API, so it is correct in WAL mode where copying the
// .db file alone is not).
//
//   node scripts/backup-db.mjs [destination-file]
//
// DATABASE_URL is resolved exactly like the app does. The default destination
// is data/backups/app-<UTC timestamp>.db. It never overwrites a file.
import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";

const url = process.env.DATABASE_URL || "file:./data/app.db";
const raw = url.startsWith("file:") ? url.slice("file:".length) : url;
const source = path.isAbsolute(raw) ? raw : path.join(process.cwd(), "data", path.basename(raw) || "app.db");

if (!fs.existsSync(source)) {
  console.error(`Database not found: ${source}`);
  process.exit(1);
}

const stamp = new Date().toISOString().replace(/[-:]/g, "").replace(/\..+/, "Z");
const dest = path.resolve(process.argv[2] || path.join(process.cwd(), "data", "backups", `app-${stamp}.db`));
if (fs.existsSync(dest)) {
  console.error(`Refusing to overwrite existing file: ${dest}`);
  process.exit(1);
}
fs.mkdirSync(path.dirname(dest), { recursive: true });

const db = new Database(source, { readonly: true, fileMustExist: true });
try {
  await db.backup(dest);
  const check = new Database(dest, { readonly: true });
  const result = check.pragma("integrity_check", { simple: true });
  check.close();
  if (result !== "ok") throw new Error(`integrity_check reported: ${result}`);
  console.log(`Backup written and verified: ${dest}`);
} catch (error) {
  fs.rmSync(dest, { force: true });
  console.error(`Backup failed: ${error.message}`);
  process.exitCode = 1;
} finally {
  db.close();
}
