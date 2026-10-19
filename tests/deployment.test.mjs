import { test } from "node:test";
import assert from "node:assert/strict";
import { spawn, spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import Database from "better-sqlite3";
import { inspectEnvironment, parseDatabaseUrl, parseSiteUrl, formatReport } from "@/lib/config";
import { initializeDatabase } from "@/lib/db/client";

const ROOT = path.resolve(import.meta.dirname, "..");
const SCHEMA = fs.readFileSync(path.join(ROOT, "src", "lib", "db", "schema.sql"), "utf8");

// ------------------------------------------------------------ configuration

test("config: the production environment report names problems but never prints a secret value", () => {
  const secrets = ["re_live_SECRET_KEY_VALUE", "sk-ant-SECRET-VALUE-123", "cron-secret-value-xyz-123456", "webhook-secret-value"];
  const report = inspectEnvironment({
    NODE_ENV: "production",
    NEXT_PUBLIC_SITE_URL: "https://staging.example.org",
    DATABASE_URL: "file:/var/lib/techotd/app.db",
    TRUSTED_PROXY_HOPS: "1",
    EMAIL_PROVIDER: "resend",
    RESEND_API_KEY: secrets[0], // EMAIL_FROM missing => partly configured
    AI_PROVIDER: "anthropic",
    ANTHROPIC_API_KEY: secrets[1], // AI_MODEL missing
    CRON_SECRET: secrets[2],
    PAYMENT_PROVIDER: "x",
    PAYMENT_WEBHOOK_SECRET: secrets[3],
  });
  const dump = JSON.stringify(report) + formatReport(report).join("\n");
  for (const secret of secrets) assert.ok(!dump.includes(secret), "a secret value leaked into the report");
  assert.equal(report.ok, true, "warnings are not errors");
  assert.equal(report.vars.RESEND_API_KEY, "present");
  assert.equal(report.vars.EMAIL_FROM, "missing");
  assert.equal(report.vars.AI_MODEL, "missing");
  assert.ok(report.warnings.some((w) => /Email \(Resend\) is partly configured \(missing EMAIL_FROM\)/.test(w)));
  assert.ok(report.warnings.some((w) => /AI assistant is partly configured \(missing AI_MODEL\)/.test(w)));
  assert.ok(report.warnings.some((w) => /no payment gateway is integrated/.test(w)));
});

test("config: a clean production setup has no errors and no warnings; an empty one warns about the important gaps", () => {
  const good = inspectEnvironment({ NODE_ENV: "production", NEXT_PUBLIC_SITE_URL: "https://staging.example.org", DATABASE_URL: "file:/data/app.db", TRUSTED_PROXY_HOPS: "1" });
  assert.deepEqual([good.ok, good.errors, good.warnings], [true, [], []]);

  const bare = inspectEnvironment({ NODE_ENV: "production" });
  assert.equal(bare.ok, true);
  assert.deepEqual([bare.vars.NEXT_PUBLIC_SITE_URL, bare.vars.DATABASE_URL, bare.vars.TRUSTED_PROXY_HOPS], ["missing", "default", "default"]);
  for (const re of [/NEXT_PUBLIC_SITE_URL is not set/, /DATABASE_URL is not set/, /TRUSTED_PROXY_HOPS is not set/]) assert.ok(bare.warnings.some((w) => re.test(w)), String(re));

  const dev = inspectEnvironment({ NODE_ENV: "development" });
  assert.deepEqual(dev.warnings, [], "development is not nagged");
});

test("config: malformed or dangerous values are ERRORS (the server refuses to start in production)", () => {
  const cases = [
    [{ NEXT_PUBLIC_SITE_URL: "academy.example.org" }, /not a valid absolute URL/],
    [{ NEXT_PUBLIC_SITE_URL: "ftp://example.org" }, /https:\/\//],
    [{ NEXT_PUBLIC_SITE_URL: "https://user:pw@example.org" }, /credentials/],
    [{ NEXT_PUBLIC_SITE_URL: "https://example.org/app" }, /origin only/],
    [{ NEXT_PUBLIC_SITE_URL: "http://staging.example.org" }, /plain http:\/\/.*nobody could sign in/],
    [{ DATABASE_URL: "postgresql://user:pw@db.example.org/app" }, /SQLite/],
    [{ DATABASE_URL: "file:" }, /no path/],
  ];
  for (const [env, re] of cases) {
    const r = inspectEnvironment({ NODE_ENV: "production", ...env });
    assert.equal(r.ok, false, JSON.stringify(env));
    assert.ok(r.errors.some((e) => re.test(e)), `${JSON.stringify(env)} -> ${r.errors}`);
    assert.ok(!JSON.stringify(r).includes("pw@"), "no credentials from the URL are echoed");
  }
  // plain http is fine for localhost (secure-context exception) and ignored outside production
  assert.equal(inspectEnvironment({ NODE_ENV: "production", NEXT_PUBLIC_SITE_URL: "http://localhost:3000" }).ok, true);
  assert.equal(inspectEnvironment({ NODE_ENV: "development", NEXT_PUBLIC_SITE_URL: "http://staging.example.org" }).ok, true);
  assert.equal(parseSiteUrl("https://example.org/").ok, true, "a trailing slash is fine");
});

test("config: DATABASE_URL rules (file: URL, absolute path, default; other engines rejected)", () => {
  assert.deepEqual(parseDatabaseUrl(undefined), { ok: true, kind: "default", rawPath: "./data/app.db" });
  assert.deepEqual(parseDatabaseUrl("file:./data/x.db"), { ok: true, kind: "relative", rawPath: "./data/x.db" });
  assert.equal(parseDatabaseUrl("file:/var/lib/app.db").kind, "absolute");
  assert.equal(parseDatabaseUrl("file:C:/data/app.db").kind, "absolute");
  assert.equal(parseDatabaseUrl("/var/lib/app.db").kind, "absolute");
  for (const bad of ["postgres://h/db", "mysql://h/db", "https://example.org/x.db", "libsql://x"]) assert.equal(parseDatabaseUrl(bad).ok, false, bad);
  const rel = inspectEnvironment({ NODE_ENV: "production", NEXT_PUBLIC_SITE_URL: "https://s.example.org", DATABASE_URL: "file:./var/app.db", TRUSTED_PROXY_HOPS: "1" });
  assert.ok(rel.warnings.some((w) => /relative path outside \.\/data/.test(w)));
  assert.deepEqual(inspectEnvironment({ NODE_ENV: "production", NEXT_PUBLIC_SITE_URL: "https://s.example.org", DATABASE_URL: "file:./data/app.db", TRUSTED_PROXY_HOPS: "1" }).warnings, []);
});

test("config: the client refuses an unsupported DATABASE_URL instead of creating a stray database", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "techotd-cfg-"));
  try {
    const r = spawnSync(process.execPath, ["tests/stubs/dbChild.mjs", "counts"], {
      cwd: ROOT,
      env: { ...process.env, DATABASE_URL: "postgresql://user:secretpw@db.example.org/app", NODE_ENV: "test" },
      encoding: "utf8",
      timeout: 30000,
    });
    assert.notEqual(r.status, 0);
    assert.match(r.stderr, /SQLite/);
    assert.ok(!r.stderr.includes("secretpw"), "the URL's credentials are not echoed");
    assert.ok(!fs.existsSync(path.join(ROOT, "data", "app")), "no stray database file was created from the URL's last segment");
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

// ------------------------------------------------------ database integrity

test("schema initialization is atomic: a failure anywhere rolls the whole thing back, and re-running is safe", () => {
  const mem = new Database(":memory:");
  const tables = () => mem.prepare("SELECT name FROM sqlite_master WHERE type = 'table'").all().map((t) => t.name);

  // 1. a syntax error mid-schema leaves nothing behind
  assert.throws(() => initializeDatabase(mem, "CREATE TABLE a (x); CREATE TABLE b (y); THIS IS NOT SQL;"));
  assert.deepEqual(tables(), [], "partially applied schema was rolled back");

  // 2. schema that succeeds but a migration step that then fails (no users table) rolls back the schema too
  assert.throws(() => initializeDatabase(mem, "CREATE TABLE only_this (x);"));
  assert.deepEqual(tables(), [], "schema + migration are one unit");

  // 3. the real schema applies, and applying it again changes nothing (repeatable)
  initializeDatabase(mem, SCHEMA);
  const first = tables();
  mem.prepare("INSERT INTO users (id, name, email, password_hash, role) VALUES ('u1', 'A', 'a@example.test', 'x', 'STUDENT')").run();
  initializeDatabase(mem, SCHEMA);
  assert.deepEqual(tables(), first);
  assert.equal(mem.prepare("SELECT COUNT(*) c FROM users").get().c, 1, "existing rows survive a re-run");
  assert.ok(first.includes("catalog_courses") && first.includes("catalog_batches") && first.includes("audit_log"));
  mem.close();
});

test("constraints are enforced by the database, not only by application code", () => {
  const d = new Database(":memory:");
  d.pragma("foreign_keys = ON");
  initializeDatabase(d, SCHEMA);
  const user = (id, role = "STUDENT") => d.prepare("INSERT INTO users (id, name, email, password_hash, role) VALUES (?, ?, ?, 'x', ?)").run(id, id, `${id}@example.test`, role);
  user("stu");
  user("trn", "TRAINER");
  d.prepare("INSERT INTO student_profiles (id, user_id) VALUES ('p1', 'stu')").run();
  const enrol = d.prepare("INSERT INTO batch_enrollments (id, student_id, batch_id) VALUES (?, ?, ?)");
  enrol.run("e1", "p1", "full-stack-development-01");

  const fails = (fn, re, what) => assert.throws(fn, re, what);
  // foreign keys
  fails(() => enrol.run("e2", "no-such-student", "b"), /FOREIGN KEY/, "enrollment needs a real student");
  fails(() => d.prepare("INSERT INTO sessions (id, user_id, token_hash, expires_at) VALUES ('s', 'ghost', 'h', 'x')").run(), /FOREIGN KEY/);
  // uniqueness
  fails(() => enrol.run("e3", "p1", "full-stack-development-01"), /UNIQUE/, "one enrollment per student and batch");
  d.prepare("INSERT INTO trainer_batch_assignments (id, trainer_user_id, batch_id) VALUES ('a1', 'trn', 'b1')").run();
  fails(() => d.prepare("INSERT INTO trainer_batch_assignments (id, trainer_user_id, batch_id) VALUES ('a2', 'trn', 'b1')").run(), /UNIQUE/);
  fails(() => user("stu-clone") && d.prepare("INSERT INTO users (id, name, email, password_hash) VALUES (?, ?, ?, ?)").run("stu-dup", "D", "stu-clone@example.test", "x"), /UNIQUE/, "email is unique");
  // CHECK constraints
  fails(() => d.prepare("INSERT INTO catalog_courses (slug, origin, status) VALUES ('c', 'CUSTOM', 'DELETED')").run(), /CHECK/);
  fails(() => d.prepare("INSERT INTO catalog_courses (slug, origin) VALUES ('c2', 'MAGIC')").run(), /CHECK/);
  fails(() => d.prepare("INSERT INTO catalog_batches (id, origin) VALUES ('b', 'MAGIC')").run(), /CHECK/);
  d.prepare("INSERT INTO fee_plans (id, enrollment_id, student_user_id, course_slug, batch_id, currency, total_minor, discount_minor) VALUES ('f1', 'e1', 'stu', 'c', 'b', 'INR', 1000, 100)").run();
  fails(() => d.prepare("INSERT INTO fee_plans (id, enrollment_id, student_user_id, course_slug, batch_id, currency, total_minor, discount_minor) VALUES ('f2', 'e1', 'stu', 'c', 'b', 'INR', 100, 500)").run(), /CHECK|UNIQUE/);
  const pay = (id, amount) => d.prepare("INSERT INTO payments (id, fee_plan_id, amount_minor, currency, source, method, status, paid_on, receipt_number, receipt_token) VALUES (?, 'f1', ?, 'INR', 'MANUAL', 'CASH', 'RECORDED', '2026-01-01', ?, ?)").run(id, amount, `R-${id}`, `T-${id}`);
  pay("p-ok", 500);
  fails(() => pay("p-zero", 0), /CHECK/, "payments must be positive");
  fails(() => pay("p-neg", -5), /CHECK/);
  // ON DELETE RESTRICT: financial records block deletion of what they reference
  fails(() => d.prepare("DELETE FROM batch_enrollments WHERE id = 'e1'").run(), /FOREIGN KEY/, "an enrollment with a fee plan can't be deleted");
  fails(() => d.prepare("DELETE FROM fee_plans WHERE id = 'f1'").run(), /FOREIGN KEY/, "a fee plan with payments can't be deleted");
  assert.equal(d.pragma("foreign_key_check").length, 0);
  d.close();
});

// -------------------------------------------------------------- concurrency

function child(dbFile, mode, ...args) {
  return new Promise((resolve) => {
    const p = spawn(process.execPath, ["tests/stubs/dbChild.mjs", mode, ...args], {
      cwd: ROOT,
      env: { ...process.env, DATABASE_URL: `file:${dbFile.split(path.sep).join("/")}`, NODE_ENV: "test" },
      stdio: ["ignore", "pipe", "pipe"],
    });
    let out = "";
    let err = "";
    p.stdout.on("data", (c) => (out += c));
    p.stderr.on("data", (c) => (err += c));
    p.on("close", (code) => resolve({ code, out, err }));
  });
}

test("six processes starting at once on a fresh database initialise it safely and their concurrent writes are all durable and exact", async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "techotd-conc-"));
  const file = path.join(dir, "shared.db");
  try {
    const PROCS = 6;
    const WRITES = 120;
    const results = await Promise.all(Array.from({ length: PROCS }, () => child(file, "writes", String(WRITES))));
    for (const r of results) assert.equal(r.code, 0, `a process failed (database locked / init race?): ${r.err.slice(0, 400)}`);
    const counts = JSON.parse((await child(file, "counts")).out.trim());
    assert.equal(counts.load, PROCS * WRITES, "every audit insert from every process is present");
    assert.equal(counts.shared, PROCS * WRITES, "the cross-process counter was incremented atomically (no lost updates)");
    assert.deepEqual([counts.integrity, counts.fk], ["ok", 0]);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true, maxRetries: 8, retryDelay: 250 });
  }
});

// ---------------------------------------------------- backup, verify, restore

test("backup -> verify -> restore: a backup taken while another process is writing is valid and restores to the same data", async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "techotd-bk-"));
  const source = path.join(dir, "source.db");
  const url = `file:${source.split(path.sep).join("/")}`;
  const run = (script, ...args) => spawnSync(process.execPath, [script, ...args], { cwd: ROOT, env: { ...process.env, DATABASE_URL: url, NODE_ENV: "test" }, encoding: "utf8", timeout: 60000 });
  try {
    assert.equal((await child(source, "seed", "25")).code, 0);

    // take the backup WHILE a writer process is busy
    const writer = child(source, "writes", "300");
    await new Promise((r) => setTimeout(r, 150));
    const backup = path.join(dir, "backups", "snapshot.db");
    const made = run("scripts/backup-db.mjs", backup);
    assert.equal(made.status, 0, made.stderr);
    assert.equal((await writer).code, 0);
    assert.ok(fs.existsSync(backup));
    assert.equal(run("scripts/backup-db.mjs", backup).status, 1, "a backup never overwrites an existing file");

    const verified = run("scripts/verify-backup.mjs", backup);
    assert.equal(verified.status, 0, verified.stdout + verified.stderr);
    assert.match(verified.stdout, /Backup verified/);
    const usersInBackup = JSON.parse(/Row counts: (\{.*\})/.exec(verified.stdout)[1]).users;
    assert.equal(usersInBackup, 25);
    assert.ok(!/seed\d+@example\.test|password/i.test(verified.stdout), "verification prints counts only, never row contents");

    // restore into a SEPARATE database and read it through the app's own client
    const restored = path.join(dir, "restored.db");
    fs.copyFileSync(backup, restored);
    const counts = JSON.parse((await child(restored, "counts")).out.trim());
    assert.equal(counts.users, 25);
    assert.ok(counts.audit >= 25, "audit history came back");
    assert.deepEqual([counts.integrity, counts.fk], ["ok", 0]);
    // and the live source is untouched by all of this
    const live = JSON.parse((await child(source, "counts")).out.trim());
    assert.equal(live.users, 25);
    assert.equal(live.load, 300);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true, maxRetries: 8, retryDelay: 250 });
  }
});

test("verify-backup rejects missing, corrupt, truncated and incomplete backups", async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "techotd-badbk-"));
  const verify = (file) => spawnSync(process.execPath, ["scripts/verify-backup.mjs", file], { cwd: ROOT, encoding: "utf8", timeout: 60000 });
  try {
    assert.equal(verify(path.join(dir, "nope.db")).status, 1);
    assert.equal(spawnSync(process.execPath, ["scripts/verify-backup.mjs"], { cwd: ROOT, encoding: "utf8" }).status, 2, "usage error without an argument");

    const notDb = path.join(dir, "garbage.db");
    fs.writeFileSync(notDb, "this is not a sqlite database at all".repeat(50));
    assert.equal(verify(notDb).status, 1);

    // a valid database that is missing application tables
    const partial = path.join(dir, "partial.db");
    const p = new Database(partial);
    p.exec("CREATE TABLE users (id TEXT PRIMARY KEY); INSERT INTO users VALUES ('1');");
    p.close();
    const r = verify(partial);
    assert.equal(r.status, 1);
    assert.match(r.stderr, /missing tables/);

    // a real backup truncated mid-file
    const good = path.join(dir, "good.db");
    const g = new Database(good);
    initializeDatabase(g, SCHEMA);
    g.close();
    assert.equal(verify(good).status, 0);
    const bytes = fs.readFileSync(good);
    const cut = path.join(dir, "cut.db");
    fs.writeFileSync(cut, bytes.subarray(0, Math.floor(bytes.length / 3)));
    assert.equal(verify(cut).status, 1, "a truncated file is rejected");
  } finally {
    fs.rmSync(dir, { recursive: true, force: true, maxRetries: 8, retryDelay: 250 });
  }
});

test("config: a build made with a different (or no) NEXT_PUBLIC_SITE_URL than the runtime is refused", () => {
  const base = { NODE_ENV: "production", DATABASE_URL: "file:/data/app.db", TRUSTED_PROXY_HOPS: "1" };
  const check = (runtime, built) => inspectEnvironment({ ...base, ...(runtime ? { NEXT_PUBLIC_SITE_URL: runtime } : {}) }, { builtSiteUrl: built });

  assert.deepEqual([check("https://a.example.org", "https://a.example.org").ok, check("https://a.example.org/", "https://a.example.org").ok], [true, true], "same origin (trailing slash ignored)");
  const diff = check("https://b.example.org", "https://a.example.org");
  assert.equal(diff.ok, false);
  assert.match(diff.errors[0], /differs between build and runtime \(this build uses https:\/\/a\.example\.org, the environment says https:\/\/b\.example\.org\)/);
  const noBuild = check("https://b.example.org", "");
  assert.equal(noBuild.ok, false);
  assert.match(noBuild.errors[0], /built-in default https:\/\/academy\.techotd\.com/, "a build with no value falls back to the production domain");
  assert.equal(check(undefined, "https://a.example.org").ok, true, "built with a value, runtime var absent: the baked value is what counts");
  const both = check(undefined, "");
  assert.equal(both.ok, true);
  assert.ok(both.warnings.some((w) => /NEXT_PUBLIC_SITE_URL is not set/.test(w)));
  assert.equal(check("https://a.example.org", "not a url").ok, false, "an invalid baked value is an error");
  assert.equal(inspectEnvironment({ ...base, NEXT_PUBLIC_SITE_URL: "https://z.example.org" }).ok, true, "not checked when no built value is supplied");
});

test("thirteen processes opening a brand-new database at the same instant (what `next build` does) all succeed, repeatedly (eight rounds)", async () => {
  for (let round = 1; round <= 8; round += 1) {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "techotd-fresh-"));
    const file = path.join(dir, "fresh.db");
    try {
      const results = await Promise.all(Array.from({ length: 13 }, () => child(file, "counts")));
      const failed = results.filter((r) => r.code !== 0);
      assert.equal(failed.length, 0, `round ${round}: ${failed.length} of 13 failed: ${failed[0]?.err.slice(0, 300)}`);
      const counts = JSON.parse(results[0].out.trim());
      assert.deepEqual([counts.integrity, counts.fk], ["ok", 0]);
    } finally {
      fs.rmSync(dir, { recursive: true, force: true, maxRetries: 8, retryDelay: 250 });
    }
  }
});
