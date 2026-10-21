// Throw-away PostgreSQL server for tests and local verification.
//
//   import { startTempPostgres } from "./pg-test-server.mjs"
//   const pg = await startTempPostgres();   // { adminUrl, stop() }
//
// It initialises a brand-new cluster in a temp folder with the PostgreSQL
// binaries already on the machine (PG_BIN, PATH, or the usual install folders),
// listens on 127.0.0.1 on a free port with trust auth, and deletes everything on
// stop(). It never touches an existing PostgreSQL installation or its data.
// CLI: `node scripts/pg-test-server.mjs` starts one and prints its URL until Ctrl+C.
import { spawn, spawnSync } from "node:child_process";
import fs from "node:fs";
import net from "node:net";
import os from "node:os";
import path from "node:path";

const EXE = process.platform === "win32" ? ".exe" : "";

function candidateBinDirs() {
  const dirs = [];
  if (process.env.PG_BIN) dirs.push(process.env.PG_BIN);
  for (const entry of (process.env.PATH || "").split(path.delimiter)) if (entry) dirs.push(entry);
  const roots = process.platform === "win32" ? ["C:/Program Files/PostgreSQL", "C:/Program Files (x86)/PostgreSQL"] : ["/usr/lib/postgresql", "/usr/local/pgsql", "/opt/homebrew/opt", "/usr/local/opt"];
  for (const root of roots) {
    if (!fs.existsSync(root)) continue;
    for (const sub of fs.readdirSync(root).sort().reverse()) {
      dirs.push(path.join(root, sub, "bin"));
      dirs.push(path.join(root, sub));
    }
  }
  return dirs;
}

export function findPostgresBin() {
  for (const dir of candidateBinDirs()) {
    if (fs.existsSync(path.join(dir, `initdb${EXE}`)) && fs.existsSync(path.join(dir, `postgres${EXE}`))) return dir;
  }
  return null;
}

function freePort() {
  return new Promise((resolve, reject) => {
    const srv = net.createServer();
    srv.on("error", reject);
    srv.listen(0, "127.0.0.1", () => {
      const { port } = srv.address();
      srv.close(() => resolve(port));
    });
  });
}

export async function startTempPostgres({ timeoutMs = 60_000 } = {}) {
  const bin = findPostgresBin();
  if (!bin) {
    throw new Error("No PostgreSQL binaries found. Install PostgreSQL, set PG_BIN to its bin folder, or set TEST_PG_ADMIN_URL to an existing server.");
  }
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "techotd-pg-"));
  const dataDir = path.join(dir, "data");
  const init = spawnSync(path.join(bin, `initdb${EXE}`), ["-D", dataDir, "-U", "postgres", "--auth=trust", "-E", "UTF8", "--locale=C"], { encoding: "utf8" });
  if (init.status !== 0) {
    fs.rmSync(dir, { recursive: true, force: true });
    throw new Error(`initdb failed: ${init.stderr || init.stdout}`);
  }
  const port = await freePort();
  const proc = spawn(
    path.join(bin, `postgres${EXE}`),
    ["-D", dataDir, "-p", String(port), "-c", "listen_addresses=127.0.0.1", "-c", "fsync=off", "-c", "synchronous_commit=off", "-c", "full_page_writes=off", "-c", "max_connections=300", "-c", "unix_socket_directories="],
    { stdio: ["ignore", "pipe", "pipe"] }
  );
  let log = "";
  proc.stdout.on("data", (c) => (log += c));
  proc.stderr.on("data", (c) => (log += c));
  let exited = false;
  proc.on("exit", () => (exited = true));

  const started = Date.now();
  while (!/ready to accept connections/.test(log)) {
    if (exited) throw new Error(`postgres exited during start-up:\n${log}`);
    if (Date.now() - started > timeoutMs) {
      proc.kill();
      throw new Error(`postgres did not become ready in ${timeoutMs}ms:\n${log}`);
    }
    await new Promise((r) => setTimeout(r, 100));
  }

  let stopped = false;
  return {
    port,
    adminUrl: `postgres://postgres@127.0.0.1:${port}/postgres`,
    async stop() {
      if (stopped) return;
      stopped = true;
      spawnSync(path.join(bin, `pg_ctl${EXE}`), ["stop", "-D", dataDir, "-m", "immediate"], { stdio: "ignore" });
      if (!exited) await new Promise((r) => (proc.once("exit", r), setTimeout(r, 5000)));
      try {
        fs.rmSync(dir, { recursive: true, force: true, maxRetries: 10, retryDelay: 300 });
      } catch {}
    },
  };
}

if (import.meta.url === `file:///${process.argv[1]?.replace(/\\/g, "/")}`) {
  const server = await startTempPostgres();
  console.log(`PostgreSQL ready: ${server.adminUrl}`);
  console.log("Press Ctrl+C to stop and delete it.");
  const stop = async () => {
    await server.stop();
    process.exit(0);
  };
  process.on("SIGINT", stop);
  process.on("SIGTERM", stop);
  await new Promise(() => {});
}
