// Consistent backup of the PostgreSQL database with pg_dump (a single snapshot,
// safe while the app is running).
//
//   node scripts/backup-db.mjs [destination-file]
//
// Needs the PostgreSQL client tools (pg_dump) on PATH. DATABASE_URL is resolved
// exactly like the app does; the password is handed to pg_dump through the
// environment, never on the command line, and is never printed. The default
// destination is data/backups/app-<UTC timestamp>.dump (custom format, compressed).
// It never overwrites a file.
//
// On a managed host (Neon, Supabase, RDS, ...) prefer the provider's own backups /
// point-in-time recovery as the primary safety net, and use this for an extra copy
// you control (see docs/STAGING.md).
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

const raw = process.env.DATABASE_URL;
if (!raw) {
  console.error("DATABASE_URL is not set.");
  process.exit(1);
}
let url;
try {
  url = new URL(raw);
  if (!/^postgres(ql)?:$/.test(url.protocol)) throw new Error("not a postgres URL");
} catch {
  console.error("DATABASE_URL is not a valid PostgreSQL connection string.");
  process.exit(1);
}

const stamp = new Date().toISOString().replace(/[-:]/g, "").replace(/\..+/, "Z");
const dest = path.resolve(process.argv[2] || path.join(process.cwd(), "data", "backups", `app-${stamp}.dump`));
if (fs.existsSync(dest)) {
  console.error(`Refusing to overwrite existing file: ${dest}`);
  process.exit(1);
}
fs.mkdirSync(path.dirname(dest), { recursive: true });

const env = {
  ...process.env,
  PGHOST: url.hostname,
  PGPORT: url.port || "5432",
  PGUSER: decodeURIComponent(url.username),
  PGPASSWORD: decodeURIComponent(url.password),
  PGDATABASE: decodeURIComponent(url.pathname.replace(/^\//, "")),
};
const sslmode = url.searchParams.get("sslmode");
if (sslmode) env.PGSSLMODE = sslmode;

const result = spawnSync("pg_dump", ["--format=custom", "--no-owner", "--no-privileges", `--file=${dest}`], { env, encoding: "utf8" });
if (result.error?.code === "ENOENT") {
  console.error("pg_dump was not found. Install the PostgreSQL client tools, or use your provider's backups.");
  process.exit(1);
}
if (result.status !== 0) {
  fs.rmSync(dest, { force: true });
  console.error(`Backup failed: ${(result.stderr || "").trim().split("\n").slice(-3).join(" ")}`);
  process.exit(1);
}
console.log(`Backup written: ${dest}`);
console.log(`Verify it with: npm run backup:verify -- "${dest}"`);
