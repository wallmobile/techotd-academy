import { test } from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import { db } from "@/lib/db/client";
import { consumeRateLimit } from "@/lib/db/rateLimits";
import { hitLimit, getClientIp, LIMITS } from "@/lib/rateLimit";
import { loginAction, forgotPasswordAction } from "@/lib/auth/actions";
import { submitEnquiryAction } from "@/lib/enquiryActions";
import { verificationUrl } from "@/lib/certificates/service";
import robots from "@/app/robots";
import nextConfig from "../next.config.mjs";
import { setRequestHeaders } from "./stubs/headers.mjs";
import { makeUser, PASSWORD } from "./helpers.mjs";

function form(values) {
  const fd = new FormData();
  for (const [k, v] of Object.entries(values)) fd.set(k, v);
  return fd;
}

async function attemptLogin(email, password) {
  try {
    return await loginAction(null, form({ email, password }));
  } catch (error) {
    if (error.location) return { redirected: error.location };
    throw error;
  }
}

test("rate limiter: fixed window, per key, resets after the window", () => {
  const key = `unit:${crypto.randomUUID()}`;
  const cfg = { limit: 3, windowSeconds: 60 };
  assert.deepEqual([1, 2, 3].map(() => consumeRateLimit(key, cfg).allowed), [true, true, true]);
  const blocked = consumeRateLimit(key, cfg);
  assert.equal(blocked.allowed, false);
  assert.ok(blocked.retryAfterSeconds >= 1 && blocked.retryAfterSeconds <= 60);
  assert.equal(consumeRateLimit(`${key}:other`, cfg).allowed, true, "independent keys");

  // an expired window starts over
  db.prepare("UPDATE rate_limits SET window_start = window_start - 120 WHERE key = ?").run(key);
  assert.equal(consumeRateLimit(key, cfg).allowed, true);
});

test("limiter state is in the shared database (not process memory) and stores no raw identifiers", () => {
  const email = `secret-${crypto.randomUUID()}@example.test`;
  hitLimit("login", "203.0.113.9", email);
  const keys = db.prepare("SELECT key FROM rate_limits").all().map((r) => r.key).join("\n");
  assert.ok(!keys.includes(email));
  assert.ok(!keys.includes("203.0.113.9"));
  assert.ok(db.prepare("SELECT COUNT(*) AS c FROM rate_limits WHERE key LIKE 'login:%'").get().c >= 1);
});

test("client IP comes from the forwarding headers, with a safe fallback", async () => {
  setRequestHeaders({ "x-forwarded-for": "198.51.100.7, 10.0.0.1" });
  assert.equal(await getClientIp(), "198.51.100.7");
  setRequestHeaders({ "x-real-ip": "198.51.100.8" });
  assert.equal(await getClientIp(), "198.51.100.8");
  setRequestHeaders({});
  assert.equal(await getClientIp(), "unknown");
});

test("login is throttled per account+IP: guessing is cut off, even with the right password afterwards", async () => {
  const user = await makeUser("STUDENT", "brute");
  setRequestHeaders({ "x-forwarded-for": "192.0.2.10" });

  for (let i = 0; i < LIMITS.login.limit; i += 1) {
    const r = await attemptLogin(user.email, `wrong-password-${i}`);
    assert.match(r.formError, /Invalid email or password/);
  }
  const locked = await attemptLogin(user.email, PASSWORD);
  assert.equal(locked.redirected, undefined, "the correct password is refused while locked out");
  assert.match(locked.formError, /Too many sign-in attempts/);

  // another account from the same IP, and the same account from another IP, are unaffected
  const other = await makeUser("STUDENT", "bystander");
  assert.ok((await attemptLogin(other.email, PASSWORD)).redirected, "a different account still signs in");
  setRequestHeaders({ "x-forwarded-for": "192.0.2.11" });
  assert.ok((await attemptLogin(user.email, PASSWORD)).redirected, "a different client is not locked out");
});

test("forgot-password is throttled but the public response never changes (no enumeration, no extra tokens)", async () => {
  const user = await makeUser("STUDENT", "forgot");
  setRequestHeaders({ "x-forwarded-for": "192.0.2.20" });
  const tokensFor = () => db.prepare("SELECT COUNT(*) AS c FROM password_reset_tokens WHERE user_id = ?").get(user.id).c;

  const responses = [];
  for (let i = 0; i < LIMITS.forgotPassword.limit + 3; i += 1) {
    responses.push(await forgotPasswordAction(null, form({ email: user.email })));
  }
  assert.equal(new Set(responses.map((r) => r.message)).size, 1, "identical public message throughout");
  assert.ok(responses.every((r) => r.status === "success"));
  assert.equal(tokensFor(), LIMITS.forgotPassword.limit, "no tokens are minted past the limit");
});

test("public enquiry submissions are throttled per client IP and write nothing once limited", async () => {
  setRequestHeaders({ "x-forwarded-for": "192.0.2.30" });
  const mk = (i) => ({ name: "Rate Tester", phone: "9876543210", email: `rl-${i}-${crypto.randomUUID().slice(0, 6)}@example.test`, consent: true });
  const results = [];
  for (let i = 0; i < LIMITS.enquiry.limit + 2; i += 1) results.push(await submitEnquiryAction(mk(i), "enquiry"));
  assert.equal(results.filter((r) => r.ok).length, LIMITS.enquiry.limit);
  assert.match(results.at(-1).error, /several requests/);
  const stored = db.prepare("SELECT COUNT(*) AS c FROM leads WHERE name = 'Rate Tester'").get().c;
  assert.equal(stored, LIMITS.enquiry.limit);
  setRequestHeaders({ "x-forwarded-for": "192.0.2.31" });
  assert.equal((await submitEnquiryAction(mk("other"), "enquiry")).ok, true, "other clients unaffected");
});

test("certificate verification limiter allows normal use and blocks bursts per IP", () => {
  const ip = `192.0.2.${40 + Math.floor(Math.random() * 100)}`;
  let blockedAt = null;
  for (let i = 1; i <= LIMITS.verifyCertificate.limit + 5; i += 1) {
    if (!hitLimit("verifyCertificate", ip).allowed) {
      blockedAt = i;
      break;
    }
  }
  assert.equal(blockedAt, LIMITS.verifyCertificate.limit + 1);
  assert.equal(hitLimit("verifyCertificate", "198.18.0.1").allowed, true);
});

test("production never prints a guessed domain on a certificate", () => {
  const original = { site: process.env.NEXT_PUBLIC_SITE_URL, env: process.env.NODE_ENV };
  try {
    delete process.env.NEXT_PUBLIC_SITE_URL;
    process.env.NODE_ENV = "production";
    assert.equal(verificationUrl("tok123"), "/verify-certificate/tok123");
    process.env.NEXT_PUBLIC_SITE_URL = "https://academy.example.org/";
    assert.equal(verificationUrl("tok123"), "https://academy.example.org/verify-certificate/tok123");
    process.env.NODE_ENV = "test";
    delete process.env.NEXT_PUBLIC_SITE_URL;
    assert.match(verificationUrl("tok123"), /^https:\/\/.+\/verify-certificate\/tok123$/);
  } finally {
    if (original.site === undefined) delete process.env.NEXT_PUBLIC_SITE_URL;
    else process.env.NEXT_PUBLIC_SITE_URL = original.site;
    process.env.NODE_ENV = original.env;
  }
});

test("robots.txt keeps private areas away from crawlers and security headers are configured", async () => {
  const rules = robots().rules;
  for (const path of ["/admin", "/student", "/trainer", "/verify-certificate"]) assert.ok(rules.disallow.includes(path), path);

  const [{ headers }] = await nextConfig.headers();
  const names = headers.map((h) => h.key);
  for (const required of ["X-Content-Type-Options", "X-Frame-Options", "Referrer-Policy", "Permissions-Policy"]) {
    assert.ok(names.includes(required), required);
  }
  assert.equal(headers.find((h) => h.key === "X-Frame-Options").value, "DENY");
});
