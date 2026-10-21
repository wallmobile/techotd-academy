import { test } from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import { spawnSync } from "node:child_process";
import path from "node:path";
import pg from "pg";

const ROOT = path.resolve(import.meta.dirname, "..");
const ADMIN_URL = process.env.TEST_PG_ADMIN_URL;

async function newDatabase() {
  const name = `techotd_t_${crypto.randomBytes(6).toString("hex")}`;
  const admin = new pg.Client({ connectionString: ADMIN_URL });
  await admin.connect();
  await admin.query(`CREATE DATABASE "${name}"`);
  await admin.end();
  const url = new URL(ADMIN_URL);
  url.pathname = `/${name}`;
  return url.toString();
}

async function query(url, sql, params = []) {
  const c = new pg.Client({ connectionString: url });
  await c.connect();
  try {
    return (await c.query(sql, params)).rows;
  } finally {
    await c.end();
  }
}

function run(args, { databaseUrl, env = {} }) {
  return spawnSync(process.execPath, ["scripts/setup-admin.mjs", ...args], {
    cwd: ROOT,
    encoding: "utf8",
    env: { ...process.env, ADMIN_PASSWORD: "", NODE_ENV: "development", DATABASE_URL: databaseUrl, ...env },
  });
}

test("setup:admin bootstraps a hashed SUPER_ADMIN, never re-runs destructively, never escalates, never runs in production", async () => {
  const databaseUrl = await newDatabase();
  // generated password: printed once, stored only as a hash
  const first = run(["--email", "Owner@Example.test", "--name", "Owner"], { databaseUrl });
  assert.equal(first.status, 0, first.stderr);
  const generated = /Password:\s+(\S+)/.exec(first.stdout)?.[1];
  assert.ok(generated && generated.length >= 20, "a strong random password is shown once");

  const [row] = await query(databaseUrl, "SELECT role, status, password_hash FROM users WHERE email = 'owner@example.test'");
  assert.deepEqual({ role: row.role, status: row.status }, { role: "SUPER_ADMIN", status: "ACTIVE" });
  assert.ok(row.password_hash.startsWith("$2"), "bcrypt hash stored");
  assert.ok(!row.password_hash.includes(generated));
  assert.ok(!first.stdout.includes(row.password_hash), "hash is never printed");
  assert.ok(!first.stdout.includes(databaseUrl) && !first.stderr.includes(databaseUrl), "the connection string is never printed");

  // second run: reuses, doesn't print a password, doesn't change anything
  const again = run(["--email", "owner@example.test"], { databaseUrl });
  assert.equal(again.status, 0);
  assert.match(again.stdout, /already exists/);
  assert.ok(!/Password:\s+\S{20,}/.test(again.stdout));

  // supplied password via env is accepted and never echoed
  const envRun = run(["--email", "second@example.test", "--role", "admin"], { databaseUrl, env: { ADMIN_PASSWORD: "My-Own-Passw0rd" } });
  assert.equal(envRun.status, 0, envRun.stderr);
  assert.ok(!envRun.stdout.includes("My-Own-Passw0rd"));

  // no privilege escalation of an existing account, no invalid roles, no weak passwords
  await query(databaseUrl, "INSERT INTO users (id, name, email, password_hash, role) VALUES ('s1', 'Stu', 'student@example.test', 'x', 'STUDENT')");
  assert.notEqual(run(["--email", "student@example.test"], { databaseUrl }).status, 0);
  assert.notEqual(run(["--email", "x@example.test", "--role", "TRAINER"], { databaseUrl }).status, 0);
  assert.notEqual(run(["--email", "y@example.test", "--password", "short"], { databaseUrl }).status, 0);
  assert.equal((await query(databaseUrl, "SELECT role FROM users WHERE email = 'student@example.test'"))[0].role, "STUDENT");

  // production refusal
  const prod = run(["--email", "prod@example.test"], { databaseUrl, env: { NODE_ENV: "production" } });
  assert.notEqual(prod.status, 0);
  assert.match(prod.stderr, /refuses to run/);
  assert.equal((await query(databaseUrl, "SELECT COUNT(*)::int c FROM users WHERE email = 'prod@example.test'"))[0].c, 0);
});
