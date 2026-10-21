// Runs a command with a PostgreSQL server available for tests:
//
//   node scripts/run-with-pg.mjs <command> [args...]
//
// If TEST_PG_ADMIN_URL is set (an existing server you may create databases on)
// it is used as-is; otherwise a temporary cluster is started and deleted after.
// The command sees TEST_PG_ADMIN_URL. Test databases created during the run
// (names starting "techotd_t_") are dropped afterwards.
import { spawn } from "node:child_process";
import pg from "pg";
import { startTempPostgres } from "./pg-test-server.mjs";

const [command, ...args] = process.argv.slice(2);
if (!command) {
  console.error("Usage: node scripts/run-with-pg.mjs <command> [args...]");
  process.exit(2);
}

let temp = null;
let adminUrl = process.env.TEST_PG_ADMIN_URL;
if (!adminUrl) {
  temp = await startTempPostgres();
  adminUrl = temp.adminUrl;
}

const bin = command === "node" ? process.execPath : command;
const child = spawn(bin, args, { stdio: "inherit", env: { ...process.env, TEST_PG_ADMIN_URL: adminUrl }, shell: process.platform === "win32" && bin !== process.execPath && !/.exe$/i.test(bin) });
const forward = (signal) => () => child.kill(signal);
process.on("SIGINT", forward("SIGINT"));
process.on("SIGTERM", forward("SIGTERM"));

const code = await new Promise((resolve) => child.on("exit", (c) => resolve(c ?? 1)));

try {
  if (!temp) {
    // an existing server: remove the databases this run created
    const admin = new pg.Client({ connectionString: adminUrl });
    await admin.connect();
    const { rows } = await admin.query("SELECT datname FROM pg_database WHERE datname LIKE 'techotd\\_t\\_%'");
    for (const r of rows) await admin.query(`DROP DATABASE IF EXISTS "${r.datname}" WITH (FORCE)`).catch(() => {});
    await admin.end();
  }
} finally {
  if (temp) await temp.stop();
}
process.exit(code);
