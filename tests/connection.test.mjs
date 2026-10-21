// What happens on serverless hosting when the database (or the platform) drops idle
// connections while the instance is frozen - e.g. a Neon compute suspending, or a
// Vercel function thawing. The pool still believes its connections are alive, so the
// next request picks up a dead one.
import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import path from "node:path";
import { db } from "@/lib/db/client";

const ROOT = path.resolve(import.meta.dirname, "..");
// Terminates every other connection to this test database from a separate process, while
// THIS process is blocked (spawnSync), exactly like a frozen serverless instance: the pool
// cannot notice before it hands the dead connections out again.
const KILL = `
import pg from "pg";
const c = new pg.Client({ connectionString: process.env.DATABASE_URL });
await c.connect();
const r = await c.query("SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = current_database() AND pid <> pg_backend_pid()");
console.log(r.rowCount);
await c.end();
`;
function killConnectionsWhileFrozen() {
  const r = spawnSync(process.execPath, ["--input-type=module", "-e", KILL], { cwd: ROOT, env: process.env, encoding: "utf8" });
  assert.equal(r.status, 0, r.stderr);
  return Number(r.stdout.trim());
}

async function openPooledConnections() {
  await Promise.all(Array.from({ length: 5 }, () => db.get("SELECT pg_sleep(0.05)")));
}

test("a read that picks up a connection killed while the instance was frozen is retried on a fresh one", async () => {
  await openPooledConnections();
  assert.ok(killConnectionsWhileFrozen() >= 1);
  // issued in the same tick the process "thaws": the pool still lists the dead connections
  const reads = await Promise.all(Array.from({ length: 5 }, () => db.get("SELECT 1 AS ok")));
  assert.ok(reads.every((r) => r.ok === 1));
});

test("a transaction that starts on a dead connection is retried (nothing had run yet)", async () => {
  await openPooledConnections();
  assert.ok(killConnectionsWhileFrozen() >= 1);
  const results = await Promise.all(Array.from({ length: 5 }, (_, i) => db.tx(async (t) => (await t.get("SELECT ?::int AS v", [i])).v)));
  assert.deepEqual(results, [0, 1, 2, 3, 4]);
});

test("a write is NOT blindly retried on a dead connection (it might already have been applied)", async () => {
  await db.exec("CREATE TABLE IF NOT EXISTS conn_probe (id serial PRIMARY KEY, note text)");
  await openPooledConnections();
  assert.ok(killConnectionsWhileFrozen() >= 1);
  const outcomes = await Promise.allSettled(Array.from({ length: 5 }, () => db.run("INSERT INTO conn_probe (note) VALUES ('x')")));
  const rows = (await db.get("SELECT COUNT(*) AS c FROM conn_probe")).c;
  // every insert either succeeded exactly once or failed visibly - never applied twice
  assert.equal(rows, outcomes.filter((o) => o.status === "fulfilled").length);
  // and the pool has recovered for the next request
  assert.equal((await db.get("SELECT 1 AS ok")).ok, 1);
});
