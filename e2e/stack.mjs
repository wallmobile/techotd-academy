// Starts the PRODUCTION server (`next start`, so run `npm run build` first)
// against an isolated throwaway PostgreSQL database, and drives real Chrome through
// playwright-core. Uses TEST_PG_ADMIN_URL if set (a server you may create databases
// on), otherwise starts a temporary cluster that is deleted afterwards. Nothing here
// touches your own database or real credentials.
import { spawn, spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import crypto from "node:crypto";
import pg from "pg";
import { chromium } from "playwright-core";
import { startTempPostgres } from "../scripts/pg-test-server.mjs";

const ROOT = path.resolve(import.meta.dirname, "..");

export const CHROME_CANDIDATES = [
  process.env.E2E_CHROME,
  "C:/Program Files/Google/Chrome/Application/chrome.exe",
  "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
  "/usr/bin/google-chrome",
  "/usr/bin/chromium",
].filter(Boolean);

export function findChrome() {
  return CHROME_CANDIDATES.find((p) => fs.existsSync(p));
}

export async function startStack({ port = 3210, env = {}, bulk = false } = {}) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "techotd-e2e-"));
  const temp = process.env.TEST_PG_ADMIN_URL ? null : await startTempPostgres();
  const adminUrl = process.env.TEST_PG_ADMIN_URL || temp.adminUrl;
  const dbName = `techotd_e2e_${crypto.randomBytes(5).toString("hex")}`;
  const admin = new pg.Client({ connectionString: adminUrl });
  await admin.connect();
  await admin.query(`CREATE DATABASE "${dbName}"`);
  await admin.end();
  const dbUrl = new URL(adminUrl);
  dbUrl.pathname = `/${dbName}`;
  const DATABASE_URL = dbUrl.toString();
  const seedFile = path.join(dir, "seed.json");
  const seed = spawnSync(process.execPath, ["e2e/seed.mjs", seedFile, ...(bulk ? ["bulk"] : [])], {
    cwd: ROOT,
    env: { ...process.env, DATABASE_URL },
    encoding: "utf8",
  });
  if (seed.status !== 0) throw new Error(`seed failed: ${seed.stderr || seed.stdout}`);
  const data = JSON.parse(fs.readFileSync(seedFile, "utf8"));

  const serverEnv = { ...process.env, NODE_ENV: "production", DATABASE_URL, PORT: String(port), ...env };
  for (const k of ["RESEND_API_KEY", "EMAIL_PROVIDER", "ANTHROPIC_API_KEY", "AI_PROVIDER", "CRON_SECRET"]) {
    if (!(k in env)) delete serverEnv[k];
  }
  const logFile = path.join(dir, "server.log");
  const log = fs.openSync(logFile, "a");
  const server = spawn(process.execPath, ["node_modules/next/dist/bin/next", "start", "-p", String(port)], {
    cwd: ROOT,
    env: serverEnv,
    stdio: ["ignore", log, log],
  });
  const base = `http://localhost:${port}`;
  const deadline = Date.now() + 60_000;
  for (;;) {
    try {
      const r = await fetch(base + "/login");
      if (r.ok) break;
    } catch {}
    if (Date.now() > deadline) throw new Error("server did not start: " + fs.readFileSync(logFile, "utf8"));
    await new Promise((r) => setTimeout(r, 400));
  }
  const chrome = findChrome();
  if (!chrome) throw new Error("No Chrome/Edge found; set E2E_CHROME to a Chromium-based browser executable");
  const browser = await chromium.launch({ executablePath: chrome, headless: true });
  return {
    base,
    data,
    databaseUrl: DATABASE_URL,
    dir,
    logFile,
    browser,
    async stop() {
      await browser.close();
      server.kill();
      await new Promise((r) => setTimeout(r, 500));
      if (!process.env.E2E_KEEP) {
        if (temp) await temp.stop();
        else {
          const cleanup = new pg.Client({ connectionString: adminUrl });
          await cleanup.connect();
          await cleanup.query(`DROP DATABASE IF EXISTS "${dbName}" WITH (FORCE)`).catch(() => {});
          await cleanup.end();
        }
        try {
          fs.rmSync(dir, { recursive: true, force: true, maxRetries: 8, retryDelay: 250 });
        } catch {}
      } else if (temp) {
        console.log(`E2E_KEEP: temporary PostgreSQL left running at ${adminUrl}`);
      }
    },
  };
}
