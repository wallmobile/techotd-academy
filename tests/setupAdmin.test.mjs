import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import Database from "better-sqlite3";

const ROOT = path.resolve(import.meta.dirname, "..");

function run(args, { dbFile, env = {} }) {
  return spawnSync(process.execPath, ["scripts/setup-admin.mjs", ...args], {
    cwd: ROOT,
    encoding: "utf8",
    env: { ...process.env, ADMIN_PASSWORD: "", NODE_ENV: "development", DATABASE_URL: `file:${dbFile.split(path.sep).join("/")}`, ...env },
  });
}

test("setup:admin bootstraps a hashed SUPER_ADMIN, never re-runs destructively, never escalates, never runs in production", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "techotd-admin-"));
  const dbFile = path.join(dir, "admin-test.db");
  try {
    // generated password: printed once, stored only as a hash
    const first = run(["--email", "Owner@Example.test", "--name", "Owner"], { dbFile });
    assert.equal(first.status, 0, first.stderr);
    const generated = /Password:\s+(\S+)/.exec(first.stdout)?.[1];
    assert.ok(generated && generated.length >= 20, "a strong random password is shown once");

    const d = new Database(dbFile, { readonly: true });
    const row = d.prepare("SELECT role, status, password_hash FROM users WHERE email = 'owner@example.test'").get();
    d.close();
    assert.deepEqual({ role: row.role, status: row.status }, { role: "SUPER_ADMIN", status: "ACTIVE" });
    assert.ok(row.password_hash.startsWith("$2"), "bcrypt hash stored");
    assert.ok(!row.password_hash.includes(generated));
    assert.ok(!first.stdout.includes(row.password_hash), "hash is never printed");

    // second run: reuses, doesn't print a password, doesn't change anything
    const again = run(["--email", "owner@example.test"], { dbFile });
    assert.equal(again.status, 0);
    assert.match(again.stdout, /already exists/);
    assert.ok(!/Password:\s+\S{20,}/.test(again.stdout));

    // supplied password via env is accepted and never echoed
    const envRun = run(["--email", "second@example.test", "--role", "admin"], { dbFile, env: { ADMIN_PASSWORD: "My-Own-Passw0rd" } });
    assert.equal(envRun.status, 0, envRun.stderr);
    assert.ok(!envRun.stdout.includes("My-Own-Passw0rd"));

    // no privilege escalation of an existing account, no invalid roles, no weak passwords
    const d2 = new Database(dbFile);
    d2.prepare("INSERT INTO users (id, name, email, password_hash, role) VALUES ('s1', 'Stu', 'student@example.test', 'x', 'STUDENT')").run();
    d2.close();
    assert.notEqual(run(["--email", "student@example.test"], { dbFile }).status, 0);
    assert.notEqual(run(["--email", "x@example.test", "--role", "TRAINER"], { dbFile }).status, 0);
    assert.notEqual(run(["--email", "y@example.test", "--password", "short"], { dbFile }).status, 0);
    const check = new Database(dbFile, { readonly: true });
    assert.equal(check.prepare("SELECT role FROM users WHERE email = 'student@example.test'").get().role, "STUDENT");
    check.close();

    // production refusal
    const prod = run(["--email", "prod@example.test"], { dbFile, env: { NODE_ENV: "production" } });
    assert.notEqual(prod.status, 0);
    assert.match(prod.stderr, /refuses to run/);
    const check2 = new Database(dbFile, { readonly: true });
    assert.equal(check2.prepare("SELECT COUNT(*) c FROM users WHERE email = 'prod@example.test'").get().c, 0);
    check2.close();
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
