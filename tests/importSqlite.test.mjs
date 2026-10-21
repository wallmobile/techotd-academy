import { test } from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import pg from "pg";

const ROOT = path.resolve(import.meta.dirname, "..");

async function newDatabase() {
  const name = `techotd_t_${crypto.randomBytes(6).toString("hex")}`;
  const admin = new pg.Client({ connectionString: process.env.TEST_PG_ADMIN_URL });
  await admin.connect();
  await admin.query(`CREATE DATABASE "${name}"`);
  await admin.end();
  const url = new URL(process.env.TEST_PG_ADMIN_URL);
  url.pathname = `/${name}`;
  return url.toString();
}

async function query(url, sql) {
  const c = new pg.Client({ connectionString: url });
  await c.connect();
  try {
    return (await c.query(sql)).rows;
  } finally {
    await c.end();
  }
}

const run = (file, databaseUrl) =>
  spawnSync(process.execPath, ["--disable-warning=ExperimentalWarning", "--disable-warning=MODULE_TYPELESS_PACKAGE_JSON", "scripts/import-sqlite.mjs", file], {
    cwd: ROOT,
    env: { ...process.env, DATABASE_URL: databaseUrl, NODE_ENV: "test" },
    encoding: "utf8",
  });

test("db:import-sqlite copies an old SQLite database into an empty PostgreSQL one, read-only and all-or-nothing", async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "techotd-import-"));
  const file = path.join(dir, "old.db");
  try {
    const old = new DatabaseSync(file);
    old.exec(`
      CREATE TABLE users (id TEXT PRIMARY KEY, name TEXT, email TEXT, phone TEXT, password_hash TEXT, role TEXT, status TEXT,
        email_notifications INTEGER, created_at TEXT, updated_at TEXT);
      CREATE TABLE student_profiles (id TEXT PRIMARY KEY, user_id TEXT, phone TEXT, city TEXT, created_at TEXT, updated_at TEXT);
      CREATE TABLE batch_enrollments (id TEXT PRIMARY KEY, student_id TEXT, batch_id TEXT, status TEXT, enrolled_at TEXT, created_at TEXT, updated_at TEXT);
      CREATE TABLE sessions (id TEXT PRIMARY KEY, user_id TEXT, token_hash TEXT, expires_at TEXT, created_at TEXT);
      CREATE TABLE rate_limits (key TEXT PRIMARY KEY, window_start INTEGER, count INTEGER);
      INSERT INTO users VALUES ('u1', 'Old Admin', 'admin@example.test', NULL, '$2a$12$hash', 'SUPER_ADMIN', 'ACTIVE', 1, '2026-01-01 10:00:00', '2026-01-01 10:00:00');
      INSERT INTO users VALUES ('u2', 'Old Student', 'stu@example.test', '900', '$2a$12$hash', 'STUDENT', 'ACTIVE', 0, '2026-01-02 10:00:00', '2026-01-02 10:00:00');
      INSERT INTO student_profiles VALUES ('p2', 'u2', '900', 'Pune', '2026-01-02 10:00:00', '2026-01-02 10:00:00');
      INSERT INTO batch_enrollments VALUES ('e1', 'p2', 'full-stack-development-01', 'ACTIVE', '2026-01-03 10:00:00', '2026-01-03 10:00:00', '2026-01-03 10:00:00');
      INSERT INTO sessions VALUES ('s1', 'u1', 'h', '2999-01-01T00:00:00.000Z', '2026-01-01 10:00:00');
      INSERT INTO rate_limits VALUES ('k', 1, 1);
    `);
    old.close();
    const before = fs.readFileSync(file);

    const target = await newDatabase();
    const r = run(file, target);
    assert.equal(r.status, 0, r.stderr);
    assert.match(r.stdout, /users: 2/);
    assert.ok(!r.stdout.includes(target), "the connection string is not printed");

    assert.deepEqual(
      (await query(target, "SELECT id, role, email_notifications, created_at FROM users ORDER BY id")).map((u) => ({ ...u })),
      [
        { id: "u1", role: "SUPER_ADMIN", email_notifications: 1, created_at: "2026-01-01 10:00:00" },
        { id: "u2", role: "STUDENT", email_notifications: 0, created_at: "2026-01-02 10:00:00" },
      ]
    );
    assert.equal((await query(target, "SELECT batch_id FROM batch_enrollments WHERE id = 'e1'"))[0].batch_id, "full-stack-development-01");
    assert.equal((await query(target, "SELECT COUNT(*)::int c FROM sessions"))[0].c, 0, "sessions are not carried over");
    assert.equal((await query(target, "SELECT COUNT(*)::int c FROM rate_limits"))[0].c, 0);
    assert.ok(fs.readFileSync(file).equals(before), "the SQLite file is untouched");

    // never merges into a database that already has users
    const again = run(file, target);
    assert.notEqual(again.status, 0);
    assert.match(again.stderr, /already has users/);
    assert.equal((await query(target, "SELECT COUNT(*)::int c FROM users"))[0].c, 2);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
