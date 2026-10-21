#!/usr/bin/env node
// Local DEVELOPMENT PostgreSQL that lives inside the project (data/pg, git-ignored),
// so `npm run dev` works without installing or configuring a server by hand.
//
//   npm run db:start    first run: creates the cluster + the techotd_dev database,
//                       adds DATABASE_URL to .env.local if it has none; then starts it
//   npm run db:stop
//   npm run db:status
//
// It uses the PostgreSQL binaries already on this machine (PG_BIN, PATH, or the usual
// install folders), listens on 127.0.0.1 only (port 54329, or DEV_PG_PORT) and trusts
// local connections - for development on your own computer only, never a server.
// It never touches any other PostgreSQL installation or its data.
import { spawn, spawnSync } from "node:child_process";
import fs from "node:fs";
import net from "node:net";
import path from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";
import { findPostgresBin } from "./pg-test-server.mjs";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const DATA_DIR = path.join(ROOT, "data", "pg");
const LOG_FILE = path.join(ROOT, "data", "pg.log");
const PORT = Number(process.env.DEV_PG_PORT || 54329);
const DB_NAME = "techotd_dev";
const ADMIN_URL = `postgres://postgres@127.0.0.1:${PORT}/postgres`;
const DEV_URL = `postgres://postgres@127.0.0.1:${PORT}/${DB_NAME}`;
const EXE = process.platform === "win32" ? ".exe" : "";

function portOpen() {
  return new Promise((resolve) => {
    const socket = net.connect(PORT, "127.0.0.1");
    socket.once("connect", () => (socket.destroy(), resolve(true)));
    socket.once("error", () => resolve(false));
  });
}

async function canQuery() {
  const c = new pg.Client({ connectionString: ADMIN_URL, connectionTimeoutMillis: 2000 });
  try {
    await c.connect();
    await c.query("SELECT 1");
    return true;
  } catch {
    return false;
  } finally {
    await c.end().catch(() => {});
  }
}

function ensureEnvLocal() {
  const file = path.join(ROOT, ".env.local");
  const current = fs.existsSync(file) ? fs.readFileSync(file, "utf8") : "";
  if (/^\s*DATABASE_URL\s*=/m.test(current)) {
    console.log(".env.local already has a DATABASE_URL - left unchanged.");
    return;
  }
  const line = `# Local development database (npm run db:start)\nDATABASE_URL="${DEV_URL}"\n`;
  fs.writeFileSync(file, current + (current && !current.endsWith("\n") ? "\n" : "") + line);
  console.log(`Added DATABASE_URL for the local development database to .env.local.`);
}

async function start() {
  const bin = findPostgresBin();
  if (!bin) {
    console.error("No PostgreSQL binaries found. Install PostgreSQL (or set PG_BIN to its bin folder).");
    process.exit(1);
  }
  if (!fs.existsSync(path.join(DATA_DIR, "PG_VERSION"))) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
    const init = spawnSync(path.join(bin, `initdb${EXE}`), ["-D", DATA_DIR, "-U", "postgres", "--auth=trust", "-E", "UTF8", "--locale=C"], { encoding: "utf8" });
    if (init.status !== 0) {
      console.error(`initdb failed:\n${init.stderr || init.stdout}`);
      process.exit(1);
    }
    console.log(`Created a development PostgreSQL cluster in ${path.relative(ROOT, DATA_DIR)}`);
  }

  if (await portOpen()) {
    if (await canQuery()) console.log(`Already running on 127.0.0.1:${PORT}.`);
    else {
      console.error(`Port ${PORT} is used by something else. Set DEV_PG_PORT to a free port.`);
      process.exit(1);
    }
  } else {
    const args = ["-D", DATA_DIR, "-p", String(PORT), "-c", "listen_addresses=127.0.0.1", "-c", "unix_socket_directories="];
    if (process.platform === "win32") {
      // On Windows the server must own a (hidden) console: started without one, every
      // backend it launches for a new connection would pop up its own terminal window.
      // Start-Process -WindowStyle Hidden gives it a hidden console that survives this script.
      const quoted = [...args, "-c", "logging_collector=on", "-c", `log_directory=${path.join(ROOT, "data", "pg-logs")}`]
        .map((a) => (/[\s"]/.test(a) || a === "" ? `"${a.replace(/"/g, '\\"')}"` : a))
        .join(" ");
      const ps = `Start-Process -FilePath '${path.join(bin, `postgres${EXE}`).replace(/'/g, "''")}' -ArgumentList '${quoted.replace(/'/g, "''")}' -WindowStyle Hidden`;
      const r = spawnSync("powershell.exe", ["-NoProfile", "-NonInteractive", "-Command", ps], { stdio: "ignore", windowsHide: true, timeout: 60_000 });
      if (r.status !== 0) {
        console.error("Could not start PostgreSQL (PowerShell Start-Process failed).");
        process.exit(1);
      }
    } else {
      const log = fs.openSync(LOG_FILE, "a");
      const child = spawn(path.join(bin, `postgres${EXE}`), args, { detached: true, stdio: ["ignore", log, log] });
      child.unref();
    }
    const deadline = Date.now() + 30_000;
    while (!(await canQuery())) {
      if (Date.now() > deadline) {
        console.error(`PostgreSQL did not start; see ${path.relative(ROOT, LOG_FILE)}`);
        process.exit(1);
      }
      await new Promise((r) => setTimeout(r, 300));
    }
    console.log(`Started PostgreSQL on 127.0.0.1:${PORT}.`);
  }

  const admin = new pg.Client({ connectionString: ADMIN_URL });
  await admin.connect();
  const exists = (await admin.query("SELECT 1 FROM pg_database WHERE datname = $1", [DB_NAME])).rowCount > 0;
  if (!exists) {
    await admin.query(`CREATE DATABASE ${DB_NAME}`);
    console.log(`Created database ${DB_NAME}.`);
  }
  await admin.end();
  ensureEnvLocal();
  console.log(`\nDATABASE_URL=${DEV_URL}\nTables are created automatically on first use (npm run dev).`);
}

function stop() {
  const bin = findPostgresBin();
  if (!bin || !fs.existsSync(path.join(DATA_DIR, "PG_VERSION"))) {
    console.log("No development database here.");
    return;
  }
  const r = spawnSync(path.join(bin, `pg_ctl${EXE}`), ["stop", "-D", DATA_DIR, "-m", "fast", "-w"], { stdio: "ignore", timeout: 60_000 });
  console.log(r.status === 0 ? "Stopped." : "It was not running.");
}

async function status() {
  console.log((await canQuery()) ? `Running on 127.0.0.1:${PORT} (${DEV_URL})` : "Not running.");
}

const command = process.argv[2] || "start";
if (command === "start") await start();
else if (command === "stop") stop();
else if (command === "status") await status();
else {
  console.error("Usage: node scripts/dev-db.mjs start|stop|status");
  process.exit(2);
}
