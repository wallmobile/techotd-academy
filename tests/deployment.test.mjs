import { test } from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import { spawn, spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import pg from "pg";
import { inspectEnvironment, parseDatabaseUrl, parseSiteUrl, formatReport } from "@/lib/config";
import { SCHEMA_SQL } from "@/lib/db/schema";
import { findPostgresBin } from "../scripts/pg-test-server.mjs";

const ROOT = path.resolve(import.meta.dirname, "..");
const ADMIN_URL = process.env.TEST_PG_ADMIN_URL;
const PG_BIN = findPostgresBin();
const EXE = process.platform === "win32" ? ".exe" : "";
const GOOD_DB = "postgres://app:pw@db.example.org:5432/app?sslmode=require";

// A brand-new empty database on the test server (dropped with the server / by the runner).
async function newDatabase() {
  const name = `techotd_t_${crypto.randomBytes(6).toString("hex")}`;
  const admin = new pg.Client({ connectionString: ADMIN_URL });
  await admin.connect();
  await admin.query(`CREATE DATABASE "${name}"`);
  await admin.end();
  const url = new URL(ADMIN_URL);
  url.pathname = `/${name}`;
  return { name, url: url.toString() };
}

async function withClient(url, fn) {
  const client = new pg.Client({ connectionString: url });
  await client.connect();
  try {
    return await fn(client);
  } finally {
    await client.end();
  }
}

// ------------------------------------------------------------ configuration

test("config: the production environment report names problems but never prints a secret value", () => {
  const secrets = ["re_live_SECRET_KEY_VALUE", "sk-ant-SECRET-VALUE-123", "cron-secret-value-xyz-123456", "webhook-secret-value"];
  const report = inspectEnvironment({
    NODE_ENV: "production",
    NEXT_PUBLIC_SITE_URL: "https://staging.example.org",
    DATABASE_URL: GOOD_DB,
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
  assert.ok(!dump.includes("app:pw@") && !dump.includes(":pw@"), "the database password is not in the report");
  assert.equal(report.ok, true, "warnings are not errors");
  assert.equal(report.vars.RESEND_API_KEY, "present");
  assert.equal(report.vars.EMAIL_FROM, "missing");
  assert.equal(report.vars.AI_MODEL, "missing");
  assert.ok(report.warnings.some((w) => /Email \(Resend\) is partly configured \(missing EMAIL_FROM\)/.test(w)));
  assert.ok(report.warnings.some((w) => /AI assistant is partly configured \(missing AI_MODEL\)/.test(w)));
  assert.ok(report.warnings.some((w) => /no payment gateway is integrated/.test(w)));
});

test("config: a clean production setup has no errors and no warnings; an empty one fails on the database and warns about the gaps", () => {
  const good = inspectEnvironment({ NODE_ENV: "production", NEXT_PUBLIC_SITE_URL: "https://staging.example.org", DATABASE_URL: GOOD_DB, TRUSTED_PROXY_HOPS: "1" });
  assert.deepEqual([good.ok, good.errors, good.warnings], [true, [], []]);

  const bare = inspectEnvironment({ NODE_ENV: "production" });
  assert.equal(bare.ok, false, "there is no default database: production refuses to start without DATABASE_URL");
  assert.ok(bare.errors.some((e) => /DATABASE_URL is not set/.test(e)));
  assert.deepEqual([bare.vars.NEXT_PUBLIC_SITE_URL, bare.vars.DATABASE_URL, bare.vars.TRUSTED_PROXY_HOPS], ["missing", "missing", "default"]);
  for (const re of [/NEXT_PUBLIC_SITE_URL is not set/, /TRUSTED_PROXY_HOPS is not set/]) assert.ok(bare.warnings.some((w) => re.test(w)), String(re));

  // development is not nagged beyond the missing database
  const dev = inspectEnvironment({ NODE_ENV: "development", DATABASE_URL: "postgres://u:p@localhost:5432/dev" });
  assert.deepEqual(dev.warnings, []);
});

test("config: malformed or dangerous values are ERRORS (the server refuses to start in production)", () => {
  const cases = [
    [{ NEXT_PUBLIC_SITE_URL: "academy.example.org" }, /not a valid absolute URL/],
    [{ NEXT_PUBLIC_SITE_URL: "ftp://example.org" }, /https:\/\//],
    [{ NEXT_PUBLIC_SITE_URL: "https://user:pw@example.org" }, /credentials/],
    [{ NEXT_PUBLIC_SITE_URL: "https://example.org/app" }, /origin only/],
    [{ NEXT_PUBLIC_SITE_URL: "http://staging.example.org" }, /plain http:\/\/.*nobody could sign in/],
    [{ DATABASE_URL: "mysql://user:pw@db.example.org/app" }, /PostgreSQL/],
    [{ DATABASE_URL: "file:./data/app.db" }, /PostgreSQL/],
    [{ DATABASE_URL: "postgres://user:pw@db.example.org" }, /no database name/],
    [{ DATABASE_URL: "not a url" }, /not a valid connection URL/],
  ];
  for (const [env, re] of cases) {
    const r = inspectEnvironment({ NODE_ENV: "production", DATABASE_URL: GOOD_DB, ...env });
    assert.equal(r.ok, false, JSON.stringify(env));
    assert.ok(r.errors.some((e) => re.test(e)), `${JSON.stringify(env)} -> ${r.errors}`);
    assert.ok(!JSON.stringify(r).includes("pw@"), "no credentials from the URL are echoed");
  }
  // plain http is fine for localhost (secure-context exception) and ignored outside production
  assert.equal(inspectEnvironment({ NODE_ENV: "production", DATABASE_URL: GOOD_DB, NEXT_PUBLIC_SITE_URL: "http://localhost:3000" }).ok, true);
  assert.equal(inspectEnvironment({ NODE_ENV: "development", DATABASE_URL: GOOD_DB, NEXT_PUBLIC_SITE_URL: "http://staging.example.org" }).ok, true);
  assert.equal(parseSiteUrl("https://example.org/").ok, true, "a trailing slash is fine");
});

test("config: DATABASE_URL rules (PostgreSQL connection string; sslmode advised for remote hosts)", () => {
  assert.equal(parseDatabaseUrl(undefined).ok, false);
  assert.equal(parseDatabaseUrl("").ok, false);
  const local = parseDatabaseUrl("postgres://postgres@127.0.0.1:5432/app");
  assert.deepEqual([local.ok, local.local, local.sslmode], [true, true, null]);
  const remote = parseDatabaseUrl("postgresql://u:p@ep-x.neon.tech/neondb?sslmode=require");
  assert.deepEqual([remote.ok, remote.local, remote.sslmode], [true, false, "require"]);
  for (const bad of ["mysql://h/db", "https://example.org/x.db", "libsql://x", "file:./data/app.db", "/var/lib/app.db", "postgres://h"]) assert.equal(parseDatabaseUrl(bad).ok, false, bad);

  const noTls = inspectEnvironment({ NODE_ENV: "production", NEXT_PUBLIC_SITE_URL: "https://s.example.org", DATABASE_URL: "postgres://u:p@db.example.org/app", TRUSTED_PROXY_HOPS: "1" });
  assert.ok(noTls.warnings.some((w) => /sslmode/.test(w)));
  assert.deepEqual(
    inspectEnvironment({ NODE_ENV: "production", NEXT_PUBLIC_SITE_URL: "https://s.example.org", DATABASE_URL: "postgres://u:p@localhost:5432/app", TRUSTED_PROXY_HOPS: "1" }).warnings,
    [],
    "a local database needs no TLS"
  );
});

test("config: the client refuses an unsupported DATABASE_URL without echoing its credentials", () => {
  const r = spawnSync(process.execPath, ["tests/stubs/dbChild.mjs", "counts"], {
    cwd: ROOT,
    env: { ...process.env, DATABASE_URL: "mysql://user:secretpw@db.example.org/app", NODE_ENV: "test" },
    encoding: "utf8",
    timeout: 30000,
  });
  assert.notEqual(r.status, 0);
  assert.match(r.stderr, /PostgreSQL/);
  assert.ok(!r.stderr.includes("secretpw"), "the URL's credentials are not echoed");
});

test("config: a build made with a different (or no) NEXT_PUBLIC_SITE_URL than the runtime is refused", () => {
  const base = { NODE_ENV: "production", DATABASE_URL: GOOD_DB, TRUSTED_PROXY_HOPS: "1" };
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

// ------------------------------------------------------ database integrity

test("the schema applies to an empty database and re-applying it is safe (existing rows survive)", async () => {
  const { url } = await newDatabase();
  await withClient(url, async (c) => {
    const tables = async () => (await c.query("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY 1")).rows.map((r) => r.table_name);
    assert.deepEqual(await tables(), []);
    await c.query(SCHEMA_SQL);
    const first = await tables();
    assert.ok(first.includes("catalog_courses") && first.includes("catalog_batches") && first.includes("audit_log") && first.includes("rate_limits"));
    await c.query("INSERT INTO users (id, name, email, password_hash, role) VALUES ('u1', 'A', 'a@example.test', 'x', 'STUDENT')");
    await c.query(SCHEMA_SQL);
    assert.deepEqual(await tables(), first);
    assert.equal((await c.query("SELECT COUNT(*)::int c FROM users")).rows[0].c, 1, "existing rows survive a re-run");
  });
});

test("constraints are enforced by the database, not only by application code", async () => {
  const { url } = await newDatabase();
  await withClient(url, async (d) => {
    await d.query(SCHEMA_SQL);
    const q = (sql, params = []) => d.query(sql, params);
    const user = (id, role = "STUDENT") => q("INSERT INTO users (id, name, email, password_hash, role) VALUES ($1, $1, $2, 'x', $3)", [id, `${id}@example.test`, role]);
    await user("stu");
    await user("trn", "TRAINER");
    await q("INSERT INTO student_profiles (id, user_id) VALUES ('p1', 'stu')");
    const enrol = (id, student, batch) => q("INSERT INTO batch_enrollments (id, student_id, batch_id) VALUES ($1, $2, $3)", [id, student, batch]);
    await enrol("e1", "p1", "full-stack-development-01");

    const fails = (promise, code, what) => assert.rejects(promise, (e) => e.code === code, what);
    // foreign keys (23503)
    await fails(enrol("e2", "no-such-student", "b"), "23503", "enrollment needs a real student");
    await fails(q("INSERT INTO sessions (id, user_id, token_hash, expires_at) VALUES ('s', 'ghost', 'h', 'x')"), "23503");
    // uniqueness (23505)
    await fails(enrol("e3", "p1", "full-stack-development-01"), "23505", "one enrollment per student and batch");
    await q("INSERT INTO trainer_batch_assignments (id, trainer_user_id, batch_id) VALUES ('a1', 'trn', 'b1')");
    await fails(q("INSERT INTO trainer_batch_assignments (id, trainer_user_id, batch_id) VALUES ('a2', 'trn', 'b1')"), "23505");
    await fails(q("INSERT INTO users (id, name, email, password_hash) VALUES ('stu-dup', 'D', 'stu@example.test', 'x')"), "23505", "email is unique");
    // CHECK constraints (23514)
    await fails(q("INSERT INTO catalog_courses (slug, origin, status) VALUES ('c', 'CUSTOM', 'DELETED')"), "23514");
    await fails(q("INSERT INTO catalog_courses (slug, origin) VALUES ('c2', 'MAGIC')"), "23514");
    await fails(q("INSERT INTO catalog_batches (id, origin) VALUES ('b', 'MAGIC')"), "23514");
    await q("INSERT INTO fee_plans (id, enrollment_id, student_user_id, course_slug, batch_id, currency, total_minor, discount_minor) VALUES ('f1', 'e1', 'stu', 'c', 'b', 'INR', 1000, 100)");
    await assert.rejects(
      q("INSERT INTO fee_plans (id, enrollment_id, student_user_id, course_slug, batch_id, currency, total_minor, discount_minor) VALUES ('f2', 'e1', 'stu', 'c', 'b', 'INR', 100, 500)"),
      (e) => e.code === "23514" || e.code === "23505"
    );
    const pay = (id, amount) =>
      q(
        "INSERT INTO payments (id, fee_plan_id, amount_minor, currency, source, method, status, paid_on, receipt_number, receipt_token) VALUES ($1, 'f1', $2, 'INR', 'MANUAL', 'CASH', 'RECORDED', '2026-01-01', $3, $4)",
        [id, amount, `R-${id}`, `T-${id}`]
      );
    await pay("p-ok", 500);
    await fails(pay("p-zero", 0), "23514", "payments must be positive");
    await fails(pay("p-neg", -5), "23514");
    // ON DELETE RESTRICT: financial records block deletion of what they reference
    // ON DELETE RESTRICT reports SQLSTATE 23001 (restrict_violation); NO ACTION reports 23503
    const blocked = (e) => e.code === "23001" || e.code === "23503";
    await assert.rejects(q("DELETE FROM batch_enrollments WHERE id = 'e1'"), blocked, "an enrollment with a fee plan can't be deleted");
    await assert.rejects(q("DELETE FROM fee_plans WHERE id = 'f1'"), blocked, "a fee plan with payments can't be deleted");
    // one ACTIVE certificate per student + course, enforced by a partial unique index
    await q("INSERT INTO certificates (id, student_id, course_slug, certificate_number, status) VALUES ('c1', 'p1', 'x', 'N-1', 'ACTIVE')");
    await fails(q("INSERT INTO certificates (id, student_id, course_slug, certificate_number, status) VALUES ('c2', 'p1', 'x', 'N-2', 'ACTIVE')"), "23505");
    await q("INSERT INTO certificates (id, student_id, course_slug, certificate_number, status) VALUES ('c3', 'p1', 'x', 'N-3', 'REVOKED')");
  });
});

// -------------------------------------------------------------- concurrency

function child(databaseUrl, mode, ...args) {
  return new Promise((resolve) => {
    const p = spawn(process.execPath, ["tests/stubs/dbChild.mjs", mode, ...args], {
      cwd: ROOT,
      env: { ...process.env, DATABASE_URL: databaseUrl, NODE_ENV: "test" },
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
  const { url } = await newDatabase();
  const PROCS = 6;
  const WRITES = 120;
  const results = await Promise.all(Array.from({ length: PROCS }, () => child(url, "writes", String(WRITES))));
  for (const r of results) assert.equal(r.code, 0, `a process failed (init race?): ${r.err.slice(0, 400)}`);
  const counts = JSON.parse((await child(url, "counts")).out.trim());
  assert.equal(counts.load, PROCS * WRITES, "every audit insert from every process is present");
  assert.equal(counts.shared, PROCS * WRITES, "the cross-process counter was incremented atomically (no lost updates)");
});

test("thirteen processes opening a brand-new database at the same instant (what a parallel build or a serverless cold start does) all succeed, repeatedly (five rounds)", async () => {
  for (let round = 1; round <= 5; round += 1) {
    const { url } = await newDatabase();
    const results = await Promise.all(Array.from({ length: 13 }, () => child(url, "counts")));
    const failed = results.filter((r) => r.code !== 0);
    assert.equal(failed.length, 0, `round ${round}: ${failed.length} of 13 failed: ${failed[0]?.err.slice(0, 300)}`);
    assert.equal(JSON.parse(results[0].out.trim()).users, 0);
    // the schema was recorded exactly once
    await withClient(url, async (c) => {
      assert.equal((await c.query("SELECT COUNT(*)::int c FROM schema_meta WHERE key = 'schema_hash'")).rows[0].c, 1);
    });
  }
});

// ---------------------------------------------------- backup, verify, restore

const pgTools = { skip: !PG_BIN || !fs.existsSync(path.join(PG_BIN, `pg_dump${EXE}`)) ? "pg_dump / pg_restore not installed on this machine" : false };
const toolEnv = () => ({ ...process.env, PATH: `${PG_BIN}${path.delimiter}${process.env.PATH}`, NODE_ENV: "test" });

test("backup -> verify -> restore: a backup taken while another process is writing is valid and restores to the same data", pgTools, async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "techotd-bk-"));
  const { url: source } = await newDatabase();
  const run = (script, ...args) => spawnSync(process.execPath, [script, ...args], { cwd: ROOT, env: { ...toolEnv(), DATABASE_URL: source }, encoding: "utf8", timeout: 120000 });
  try {
    assert.equal((await child(source, "seed", "25")).code, 0);

    // take the backup WHILE a writer process is busy
    const writer = child(source, "writes", "300");
    await new Promise((r) => setTimeout(r, 150));
    const backup = path.join(dir, "backups", "snapshot.dump");
    const made = run("scripts/backup-db.mjs", backup);
    assert.equal(made.status, 0, made.stderr);
    assert.equal((await writer).code, 0);
    assert.ok(fs.existsSync(backup));
    assert.ok(!made.stdout.includes("postgres://") && !made.stderr.includes("postgres://"), "the connection string is never printed");
    assert.equal(run("scripts/backup-db.mjs", backup).status, 1, "a backup never overwrites an existing file");

    const verified = run("scripts/verify-backup.mjs", backup);
    assert.equal(verified.status, 0, verified.stdout + verified.stderr);
    assert.match(verified.stdout, /Backup archive is readable/);

    // restore into a SEPARATE database and read it through the app's own client
    const { url: target } = await newDatabase();
    const restore = spawnSync(path.join(PG_BIN, `pg_restore${EXE}`), ["--no-owner", `--dbname=${target}`, backup], { encoding: "utf8", timeout: 120000 });
    assert.equal(restore.status, 0, restore.stderr);
    const restored = JSON.parse((await child(target, "counts")).out.trim());
    assert.equal(restored.users, 25);
    assert.ok(restored.audit >= 25, "audit history came back");
    // and the live source is untouched by all of this
    const live = JSON.parse((await child(source, "counts")).out.trim());
    assert.equal(live.users, 25);
    assert.equal(live.load, 300);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true, maxRetries: 8, retryDelay: 250 });
  }
});

test("verify-backup rejects missing, corrupt, truncated and incomplete backups", pgTools, async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "techotd-badbk-"));
  const verify = (file) => spawnSync(process.execPath, ["scripts/verify-backup.mjs", file], { cwd: ROOT, env: toolEnv(), encoding: "utf8", timeout: 120000 });
  try {
    assert.equal(verify(path.join(dir, "nope.dump")).status, 1);
    assert.equal(spawnSync(process.execPath, ["scripts/verify-backup.mjs"], { cwd: ROOT, env: toolEnv(), encoding: "utf8" }).status, 2, "usage error without an argument");

    const garbage = path.join(dir, "garbage.dump");
    fs.writeFileSync(garbage, "this is not a pg_dump archive at all".repeat(50));
    assert.equal(verify(garbage).status, 1);

    // a valid archive that is missing application tables
    const partialDb = await newDatabase();
    await withClient(partialDb.url, (c) => c.query("CREATE TABLE users (id TEXT PRIMARY KEY); INSERT INTO users VALUES ('1');"));
    const partial = path.join(dir, "partial.dump");
    const dumped = spawnSync(path.join(PG_BIN, `pg_dump${EXE}`), ["--format=custom", `--file=${partial}`, `--dbname=${partialDb.url}`], { encoding: "utf8" });
    assert.equal(dumped.status, 0, dumped.stderr);
    const r = verify(partial);
    assert.equal(r.status, 1);
    assert.match(r.stderr, /table missing/);

    // a real backup, then truncated mid-file
    const fullDb = await newDatabase();
    await withClient(fullDb.url, async (c) => {
      await c.query(SCHEMA_SQL);
      await c.query("INSERT INTO users (id, name, email, password_hash, role) VALUES ('u1', 'A', 'a@example.test', 'x', 'STUDENT')");
    });
    const good = path.join(dir, "good.dump");
    const gd = spawnSync(path.join(PG_BIN, `pg_dump${EXE}`), ["--format=custom", `--file=${good}`, `--dbname=${fullDb.url}`], { encoding: "utf8" });
    assert.equal(gd.status, 0, gd.stderr);
    // every required table exists but most have no rows -> "no data section" is only for tables pg_dump skipped; empty tables still list TABLE DATA
    assert.equal(verify(good).status, 0, verify(good).stderr);
    const bytes = fs.readFileSync(good);
    const cut = path.join(dir, "cut.dump");
    fs.writeFileSync(cut, bytes.subarray(0, Math.floor(bytes.length / 3)));
    assert.equal(verify(cut).status, 1, "a truncated file is rejected");
  } finally {
    fs.rmSync(dir, { recursive: true, force: true, maxRetries: 8, retryDelay: 250 });
  }
});
