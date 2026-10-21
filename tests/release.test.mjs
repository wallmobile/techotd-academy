import { test } from "node:test";
import assert from "node:assert/strict";
import { tdb } from "./tdb.mjs";
import crypto from "node:crypto";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import pg from "pg";
import { db } from "@/lib/db/client";
import { clientIpFromHeaders, trustedProxyHops, getClientIp } from "@/lib/rateLimit";
import { canDeliverResetEmail, deliverPasswordResetEmail, RESET_EMAIL_SUBJECT } from "@/lib/auth/resetEmail";
import { forgotPasswordAction } from "@/lib/auth/actions";
import { notify, processDeliveries } from "@/lib/notifications/service";
import { setEmailPreferenceAction } from "@/lib/notifications/actions";
import { getEmailNotificationsEnabled, setEmailNotificationsEnabled } from "@/lib/db/users";
import { getDeliveryForNotification } from "@/lib/db/notificationDeliveries";
import nextConfig from "../next.config.mjs";
import { setRequestHeaders } from "./stubs/headers.mjs";
import { makeUser, signIn, signOut } from "./helpers.mjs";

const EMAIL_ENV = { EMAIL_PROVIDER: "resend", RESEND_API_KEY: "re_test_key_do_not_log", EMAIL_FROM: "Academy <no-reply@example.test>" };

function form(values) {
  const fd = new FormData();
  for (const [k, v] of Object.entries(values)) fd.set(k, v);
  return fd;
}

// Runs fn with env overrides (undefined = delete) and a scripted global fetch.
async function withEnv(overrides, responder, fn) {
  const saved = Object.fromEntries(Object.keys(overrides).map((k) => [k, process.env[k]]));
  const savedFetch = globalThis.fetch;
  const calls = [];
  for (const [k, v] of Object.entries(overrides)) {
    if (v === undefined) delete process.env[k];
    else process.env[k] = v;
  }
  globalThis.fetch = async (url, init) => {
    calls.push({ url, init, body: JSON.parse(init.body) });
    return responder(calls.length);
  };
  try {
    return await fn(calls);
  } finally {
    globalThis.fetch = savedFetch;
    for (const [k, v] of Object.entries(saved)) {
      if (v === undefined) delete process.env[k];
      else process.env[k] = v;
    }
  }
}
const accepted = () => ({ ok: true, status: 200, json: async () => ({ id: "msg_reset" }) });
const flush = () => new Promise((resolve) => setTimeout(resolve, 20));

// --- client IP / proxy trust ------------------------------------------------

test("client IP: the address a trusted proxy appended wins; a forged leftmost entry is ignored", () => {
  const get = (h) => (name) => h[name];
  // attacker sends "X-Forwarded-For: 1.2.3.4"; the single proxy appends the real peer
  assert.equal(clientIpFromHeaders(get({ "x-forwarded-for": "1.2.3.4, 198.51.100.7" }), 1), "198.51.100.7");
  // two trusted hops (CDN -> load balancer -> app)
  assert.equal(clientIpFromHeaders(get({ "x-forwarded-for": "9.9.9.9, 198.51.100.7, 10.0.0.2" }), 2), "198.51.100.7");
  // fewer entries than hops: best effort, never an out-of-range read
  assert.equal(clientIpFromHeaders(get({ "x-forwarded-for": "198.51.100.7" }), 3), "198.51.100.7");
  // x-real-ip is only a fallback when there is no forwarding chain
  assert.equal(clientIpFromHeaders(get({ "x-real-ip": "198.51.100.8" }), 1), "198.51.100.8");
  // not behind a trusted proxy: headers (forgeable) are ignored entirely
  assert.equal(clientIpFromHeaders(get({ "x-forwarded-for": "1.2.3.4", "x-real-ip": "1.2.3.5" }), 0), "unknown");
  // garbage is never used as a bucket identity
  assert.equal(clientIpFromHeaders(get({ "x-forwarded-for": "<script>alert(1)</script>" }), 1), "unknown");
  assert.equal(clientIpFromHeaders(get({}), 1), "unknown");
  assert.equal(clientIpFromHeaders(get({ "x-forwarded-for": "2001:db8::1" }), 1), "2001:db8::1");
});

test("TRUSTED_PROXY_HOPS parsing: default 1, 0 allowed, junk falls back safely", async () => {
  assert.equal(trustedProxyHops({}), 1);
  assert.equal(trustedProxyHops({ TRUSTED_PROXY_HOPS: "0" }), 0);
  assert.equal(trustedProxyHops({ TRUSTED_PROXY_HOPS: "2" }), 2);
  for (const junk of ["-1", "abc", "1.5", "99"]) assert.equal(trustedProxyHops({ TRUSTED_PROXY_HOPS: junk }), 1, junk);

  setRequestHeaders({ "x-forwarded-for": "1.2.3.4, 198.51.100.77" });
  assert.equal(await getClientIp(), "198.51.100.77");
  await withEnv({ TRUSTED_PROXY_HOPS: "0" }, () => accepted(), async () => {
    assert.equal(await getClientIp(), "unknown");
  });
});

// --- password reset email ---------------------------------------------------

test("reset email: link goes to the provider only, never into the notification outbox", async () => {
  const token = crypto.randomBytes(24).toString("base64url");
  await withEnv({ ...EMAIL_ENV, NEXT_PUBLIC_SITE_URL: "https://academy.example.org/" }, accepted, async (calls) => {
    assert.equal(canDeliverResetEmail(), true);
    const r = await deliverPasswordResetEmail({ to: "someone@example.test", token });
    assert.deepEqual(r, { ok: true });
    assert.equal(calls.length, 1);
    assert.deepEqual(calls[0].body.to, ["someone@example.test"]);
    assert.equal(calls[0].body.subject, RESET_EMAIL_SUBJECT);
    assert.match(calls[0].body.text, new RegExp(`https://academy\\.example\\.org/reset-password\\?token=${token}`));
    assert.equal(calls[0].init.headers.Authorization, `Bearer ${EMAIL_ENV.RESEND_API_KEY}`);
  });
  const stored = (await tdb.prepare("SELECT COUNT(*) AS c FROM notifications WHERE message LIKE ? OR title LIKE ?").get(`%${token}%`, `%${token}%`)).c;
  assert.equal(stored, 0);
});

test("reset email: nothing is sent without a provider or without an absolute site URL; failures are reported honestly", async () => {
  await withEnv({ EMAIL_PROVIDER: undefined, RESEND_API_KEY: undefined, EMAIL_FROM: undefined, NEXT_PUBLIC_SITE_URL: "https://academy.example.org" }, accepted, async (calls) => {
    assert.equal(canDeliverResetEmail(), false);
    assert.deepEqual(await deliverPasswordResetEmail({ to: "a@example.test", token: "t" }), { ok: false, code: "provider_not_configured" });
    assert.equal(calls.length, 0);
  });
  await withEnv({ ...EMAIL_ENV, NEXT_PUBLIC_SITE_URL: undefined }, accepted, async (calls) => {
    assert.equal(canDeliverResetEmail(), false);
    assert.deepEqual(await deliverPasswordResetEmail({ to: "a@example.test", token: "t" }), { ok: false, code: "site_url_not_configured" });
    assert.equal(calls.length, 0, "a relative link in an email would be useless, so nothing is sent");
  });
  await withEnv({ ...EMAIL_ENV, NEXT_PUBLIC_SITE_URL: "https://academy.example.org" }, () => ({ ok: false, status: 401, json: async () => ({ message: "key leaked?" }) }), async () => {
    const r = await deliverPasswordResetEmail({ to: "a@example.test", token: "t" });
    assert.deepEqual(r, { ok: false, code: "http_401" });
  });
});

test("forgot-password in production: honest when email can't be delivered, emails the link when it can, never leaks the link", async () => {
  const user = await makeUser("STUDENT", "prodforgot");
  setRequestHeaders({ "x-forwarded-for": "192.0.2.77" });
  const tokensFor = async () => (await tdb.prepare("SELECT COUNT(*) AS c FROM password_reset_tokens WHERE user_id = ?").get(user.id)).c;

  // no provider: tell the user, mint nothing
  await withEnv({ NODE_ENV: "production", EMAIL_PROVIDER: undefined, RESEND_API_KEY: undefined, EMAIL_FROM: undefined }, accepted, async (calls) => {
    const r = await forgotPasswordAction(null, form({ email: user.email }));
    assert.equal(r.status, "error");
    assert.match(r.errors.email, /isn't available/);
    assert.equal(r.devResetPath, undefined);
    assert.equal(await tokensFor(), 0);
    assert.equal(calls.length, 0);
  });

  // provider configured: same public message for a real and an unknown account, link only by email
  await withEnv({ NODE_ENV: "production", ...EMAIL_ENV, NEXT_PUBLIC_SITE_URL: "https://academy.example.org" }, accepted, async (calls) => {
    const real = await forgotPasswordAction(null, form({ email: user.email }));
    const unknown = await forgotPasswordAction(null, form({ email: `nobody-${crypto.randomUUID().slice(0, 6)}@example.test` }));
    assert.equal(real.status, "success");
    assert.equal(real.message, unknown.message);
    assert.equal(real.devResetPath, undefined, "the link is never in the HTTP response in production");
    assert.equal(unknown.devResetPath, undefined);
    await flush();
    assert.equal(calls.length, 1, "only the real account gets an email");
    assert.deepEqual(calls[0].body.to, [user.email]);
    assert.match(calls[0].body.text, /reset-password\?token=/);
    assert.equal(await tokensFor(), 1);
  });
});

// --- email opt-out ----------------------------------------------------------

test("email opt-out: defaults on, honoured at queue time and after queueing, in-app unaffected", async () => {
  const user = await makeUser("STUDENT", "optout");
  assert.equal(await getEmailNotificationsEnabled(user.id), true);

  await withEnv(EMAIL_ENV, accepted, async (calls) => {
    const on = await notify({ userId: user.id, type: "SYSTEM", title: "Hello", message: "Generic message", eventKey: `t:${crypto.randomUUID()}` });
    assert.equal(on.email, "QUEUED");

    // opt out AFTER the email was queued: it must not be sent
    assert.equal(await setEmailNotificationsEnabled(user.id, false), true);
    const summary = await processDeliveries({ limit: 10 });
    assert.equal(summary.sent, 0);
    assert.equal(calls.length, 0);
    const d = await getDeliveryForNotification(on.notificationId, "EMAIL");
    assert.equal(d.status, "SKIPPED");
    assert.equal(d.lastError, "user_opted_out");

    // new events while opted out: in-app notification still created, email skipped
    const off = await notify({ userId: user.id, type: "SYSTEM", title: "Again", message: "Another generic message", eventKey: `t:${crypto.randomUUID()}` });
    assert.equal(off.created, true);
    assert.equal(off.email, "SKIPPED");
    assert.equal((await getDeliveryForNotification(off.notificationId, "EMAIL")).lastError, "user_opted_out");
    assert.equal((await tdb.prepare("SELECT COUNT(*) AS c FROM notifications WHERE user_id = ?").get(user.id)).c, 2);
  });
});

test("email preference action only ever changes the signed-in user", async () => {
  const me = await makeUser("STUDENT", "pref-me");
  const other = await makeUser("STUDENT", "pref-other");
  await signIn(me);
  // a forged userId field changes nothing; the target is always the session user
  await setEmailPreferenceAction(form({ userId: other.id, emailNotifications: "" }));
  assert.equal(await getEmailNotificationsEnabled(me.id), false);
  assert.equal(await getEmailNotificationsEnabled(other.id), true);
  await setEmailPreferenceAction(form({ emailNotifications: "on" }));
  assert.equal(await getEmailNotificationsEnabled(me.id), true);
  await signOut();
  await setEmailPreferenceAction(form({ emailNotifications: "" }));
  assert.equal(await getEmailNotificationsEnabled(me.id), true, "anonymous callers change nothing");
});

// --- CSP ----------------------------------------------------------------------

test("CSP is configured: self-only sources, no framing, no plugins, no wildcards or remote scripts", async () => {
  const [{ headers }] = await nextConfig.headers();
  const csp = headers.find((h) => h.key === "Content-Security-Policy")?.value;
  assert.ok(csp, "Content-Security-Policy header present");
  const directive = (name) => csp.split(";").map((d) => d.trim()).find((d) => d.startsWith(`${name} `));
  assert.equal(directive("default-src"), "default-src 'self'");
  assert.equal(directive("frame-ancestors"), "frame-ancestors 'none'");
  assert.equal(directive("object-src"), "object-src 'none'");
  assert.equal(directive("base-uri"), "base-uri 'self'");
  assert.equal(directive("form-action"), "form-action 'self'");
  assert.ok(!/(^|\s)\*(\s|;|$)/.test(csp), "no bare wildcard source");
  assert.ok(!/https?:/.test(csp), "no remote origins are allowed");
  assert.ok(!directive("script-src").includes("unsafe-eval"), "no eval in production builds");
});

// --- opening a database whose schema is behind -------------------------------

test("opening a database recorded with an older schema re-applies it in place and keeps the data", async () => {
  const adminUrl = process.env.TEST_PG_ADMIN_URL;
  const name = `techotd_t_${crypto.randomBytes(6).toString("hex")}`;
  const admin = new pg.Client({ connectionString: adminUrl });
  await admin.connect();
  await admin.query(`CREATE DATABASE "${name}"`);
  await admin.end();
  const url = new URL(adminUrl);
  url.pathname = `/${name}`;
  const databaseUrl = url.toString();

  const root = path.resolve(import.meta.dirname, "..");
  const script = path.join(os.tmpdir(), `techotd-open-${name}.mjs`);
  fs.writeFileSync(
    script,
    `import { register } from "node:module";
register(new URL(${JSON.stringify(pathToFileURL(path.join(root, "tests", "loader.mjs")).href)}));
const { db, closeDb } = await import("@/lib/db/client");
await db.get("SELECT 1 AS ok");
await closeDb();
`
  );
  const open = () => spawnSync(process.execPath, [script], { cwd: root, env: { ...process.env, DATABASE_URL: databaseUrl, NODE_ENV: "test" }, encoding: "utf8" });
  try {
    assert.equal(open().status, 0, "first open creates the schema");

    const c = new pg.Client({ connectionString: databaseUrl });
    await c.connect();
    await c.query("INSERT INTO users (id, name, email, password_hash) VALUES ('u1', 'Legacy User', 'legacy@example.test', 'x')");
    // simulate a database created by an older build: the recorded schema hash no longer matches, and a table is gone
    await c.query("UPDATE schema_meta SET value = 'old-schema' WHERE key = 'schema_hash'");
    await c.query("DROP TABLE ai_usage");
    await c.end();

    for (const attempt of [1, 2]) {
      const r = open();
      assert.equal(r.status, 0, `open #${attempt} failed: ${r.stderr}`);
    }
    const check = new pg.Client({ connectionString: databaseUrl });
    await check.connect();
    assert.equal((await check.query("SELECT name FROM users WHERE id = 'u1'")).rows[0].name, "Legacy User", "data kept");
    assert.ok((await check.query("SELECT to_regclass('public.ai_usage') AS t")).rows[0].t, "the missing table was recreated");
    assert.notEqual((await check.query("SELECT value FROM schema_meta WHERE key = 'schema_hash'")).rows[0].value, "old-schema", "the recorded schema version was updated");
    await check.end();
  } finally {
    fs.rmSync(script, { force: true });
  }
});

test("the framework banner is not advertised", () => {
  assert.equal(nextConfig.poweredByHeader, false);
});
