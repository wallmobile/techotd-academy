// Phase 10.12: deployment-safety checks against the PRODUCTION build
// (`next start`): health endpoint, fail-fast configuration, secret
// non-disclosure (logs, HTML, JS bundles, responses) and security headers on
// every response type. Fake secret values only; no real provider is contacted.
import { test, after } from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { startStack } from "./stack.mjs";
import { Session, openDb } from "./helpers.mjs";

const ROOT = path.resolve(import.meta.dirname, "..");

// Fake values that look like real secrets, so any leak is unmistakable.
const FAKE = {
  RESEND_API_KEY: "re_FAKE_resend_key_9f8e7d6c5b4a",
  ANTHROPIC_API_KEY: "sk-ant-FAKE-anthropic-key-1a2b3c4d5e",
  CRON_SECRET: "FAKE-cron-secret-value-0123456789",
  PAYMENT_WEBHOOK_SECRET: "FAKE-webhook-secret-abcdef123456",
};
const SECRET_VALUES = Object.values(FAKE);

const stacks = [];
after(async () => {
  for (const s of stacks) await s.stop().catch(() => {});
});

// Starts `next start` directly (not through startStack) to observe a failed boot.
function tryBoot(env, port) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "techotd-boot-"));
  return new Promise((resolve) => {
    const p = spawn(process.execPath, ["node_modules/next/dist/bin/next", "start", "-p", String(port)], {
      cwd: ROOT,
      env: { ...process.env, NODE_ENV: "production", DATABASE_URL: "postgres://boot:bootpw@127.0.0.1:1/boot", ...env },
      stdio: ["ignore", "pipe", "pipe"],
    });
    let log = "";
    p.stdout.on("data", (c) => (log += c));
    p.stderr.on("data", (c) => (log += c));
    const finish = (result) => {
      clearTimeout(timer);
      p.kill();
      setTimeout(() => fs.rmSync(dir, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 }), 500);
      resolve({ ...result, log });
    };
    p.on("exit", (code) => finish({ exited: true, code }));
    const timer = setTimeout(() => finish({ exited: false, code: null }), 20000);
    // if it comes up, report that too
    const poll = setInterval(async () => {
      try {
        const r = await fetch(`http://localhost:${port}/api/health`);
        if (r.ok) {
          clearInterval(poll);
          finish({ exited: false, code: null, served: true });
        }
      } catch {}
    }, 400);
    p.on("exit", () => clearInterval(poll));
  });
}

// ------------------------------------------------------------------- health

test("DP1 /api/health reports ok with a real database round trip, is uncached, public, and leaks no detail", async () => {
  const stack = await startStack({ port: 3301 });
  stacks.push(stack);
  const res = await fetch(stack.base + "/api/health");
  assert.equal(res.status, 200);
  assert.deepEqual(await res.json(), { status: "ok" });
  assert.match(res.headers.get("cache-control"), /no-store/);
  assert.match(res.headers.get("x-robots-tag"), /noindex/);
  assert.equal((await fetch(stack.base + "/api/health", { method: "HEAD" })).status, 200);

  // when the database is unusable it says so, with no internals
  const d = openDb(stack);
  await d.exec("ALTER TABLE sessions RENAME TO sessions_hidden");
  try {
    const bad = await fetch(stack.base + "/api/health");
    assert.equal(bad.status, 503);
    const body = await bad.text();
    assert.deepEqual(JSON.parse(body), { status: "unavailable" });
    assert.ok(!/sessions|sqlite|no such table|at \w+/i.test(body));
  } finally {
    await d.exec("ALTER TABLE sessions_hidden RENAME TO sessions");
    d.close();
  }
  assert.equal((await fetch(stack.base + "/api/health")).status, 200, "recovers when the database does");
});

// ------------------------------------------------------- fail-fast on config

test("DP2 production refuses to start on dangerous configuration, with a clear message and no secret in the output", async () => {
  const cases = [
    [{ NEXT_PUBLIC_SITE_URL: "http://staging.example.test" }, /plain http:\/\/.*nobody could sign in/],
    [{ NEXT_PUBLIC_SITE_URL: "staging.example.test" }, /not a valid absolute URL/],
    [{ NEXT_PUBLIC_SITE_URL: "https://staging.example.test", DATABASE_URL: "mysql://appuser:Sup3rS3cretPw@db.internal/app" }, /PostgreSQL/],
  ];
  let port = 3311;
  for (const [env, re] of cases) {
    const r = await tryBoot({ ...env, RESEND_API_KEY: FAKE.RESEND_API_KEY }, port++);
    assert.equal(r.served, undefined, `the server must not come up: ${JSON.stringify(Object.keys(env))}`);
    assert.equal(r.exited, true, "it exits instead of serving");
    assert.notEqual(r.code, 0);
    assert.match(r.log, /\[config\] ERROR/);
    assert.match(r.log, re);
    assert.ok(!r.log.includes("Sup3rS3cretPw") && !r.log.includes(FAKE.RESEND_API_KEY), "credentials are not echoed");
  }
});

test("DP3 a valid configuration boots, and logs warnings by NAME for anything half configured or missing", async () => {
  // This test build has no NEXT_PUBLIC_SITE_URL baked in, so the runtime value is the one used.
  const stack = await startStack({
    port: 3321,
    env: {
      NEXT_PUBLIC_SITE_URL: "https://staging.example.org",
      TRUSTED_PROXY_HOPS: "1",
      EMAIL_PROVIDER: "resend",
      RESEND_API_KEY: FAKE.RESEND_API_KEY, // EMAIL_FROM missing
      AI_PROVIDER: "anthropic",
      ANTHROPIC_API_KEY: FAKE.ANTHROPIC_API_KEY, // AI_MODEL missing
      CRON_SECRET: FAKE.CRON_SECRET,
      PAYMENT_PROVIDER: "stripe",
      PAYMENT_WEBHOOK_SECRET: FAKE.PAYMENT_WEBHOOK_SECRET,
    },
  });
  stacks.push(stack);
  const log = fs.readFileSync(stack.logFile, "utf8");
  assert.match(log, /\[config\] Email \(Resend\) is partly configured \(missing EMAIL_FROM\)/);
  assert.match(log, /\[config\] AI assistant is partly configured \(missing AI_MODEL\)/);
  assert.match(log, /\[config\] PAYMENT_\* is set but no payment gateway is integrated/);
  assert.ok(!/\[config\] ERROR/.test(log));
  for (const secret of SECRET_VALUES) assert.ok(!log.includes(secret), "a secret value is in the startup log");
  assert.equal((await fetch(stack.base + "/api/health")).status, 200);
});

// ---------------------------------------------------- secrets never leak out

test("DP4 with provider secrets configured, they appear in no log, page, JS bundle or response, and half-configured providers stay safely off", async () => {
  const stack = stacks.find((s) => s.base.endsWith(":3321"));
  const anon = await new Session(stack, "anon").open();
  const student = await new Session(stack, "student").open();
  const seen = [];
  const watch = (page) =>
    page.on("response", async (r) => {
      const type = r.headers()["content-type"] || "";
      if (!/text|json|javascript|x-component/.test(type)) return;
      const body = await r.text().catch(() => "");
      for (const secret of SECRET_VALUES) if (body.includes(secret)) seen.push(`${secret.slice(0, 8)}… in ${r.url()}`);
    });
  try {
    watch(anon.page);
    watch(student.page);
    // public pages, the failing flows, and the endpoints that touch provider config
    for (const p of ["/", "/courses", "/enquiry", "/login", "/forgot-password", "/api/health"]) await anon.goto(p);
    await anon.goto("/forgot-password");
    await anon.page.getByLabel("Email").fill("student@e2e.test");
    await anon.page.getByRole("button", { name: /send reset instructions/i }).click();
    await anon.page.getByText(/isn.?t available right now/i).waitFor(); // email half-configured => honest message, no send
    await anon.loginRaw("student@e2e.test", "wrong-password-value");
    await anon.page.getByText(/Invalid email or password/).waitFor();

    await student.login("student");
    await student.goto("/student/assistant");
    assert.match(await student.page.locator("main").innerText(), /isn.?t set up|not available|isn.?t available/i, "AI stays off when half configured");
    for (const [method, body] of [["POST", undefined], ["GET", undefined]]) {
      const r = await fetch(stack.base + "/api/notifications/process", { method, headers: { "x-cron-secret": "wrong-secret" }, body });
      assert.ok([404, 405].includes(r.status));
      assert.ok(!(await r.text()).includes(FAKE.CRON_SECRET));
    }
    // the endpoint works only with the exact secret (the secret itself is the credential)
    const ok = await fetch(stack.base + "/api/notifications/process", { method: "POST", headers: { "x-cron-secret": FAKE.CRON_SECRET } });
    assert.equal(ok.status, 200);
    assert.ok(!(await ok.text()).includes(FAKE.CRON_SECRET));

    // every JS/CSS bundle served to browsers
    const home = await (await fetch(stack.base + "/")).text();
    const assets = [...new Set([...home.matchAll(/\/_next\/static\/[^"'\\\s]+\.(?:js|css)/g)].map((m) => m[0]))];
    assert.ok(assets.length > 3, `bundles found (${assets.length})`);
    for (const a of assets) {
      const body = await (await fetch(stack.base + a)).text();
      for (const secret of SECRET_VALUES) assert.ok(!body.includes(secret), `${a} contains a secret`);
      assert.ok(!/api\.anthropic\.com|api\.resend\.com|ANTHROPIC_API_KEY|RESEND_API_KEY|CRON_SECRET/.test(body), `${a} references provider internals`);
    }
    // the build output on disk that is publicly servable
    const staticDir = path.join(ROOT, ".next", "static");
    const scan = (dir) => {
      for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, e.name);
        if (e.isDirectory()) scan(full);
        else if (/\.(js|css|map|html|json)$/.test(e.name)) {
          const text = fs.readFileSync(full, "utf8");
          for (const secret of SECRET_VALUES) assert.ok(!text.includes(secret), `${full} contains a secret`);
        }
      }
    };
    scan(staticDir);
  } finally {
    await anon.close();
    await student.close();
  }
  assert.deepEqual(seen, [], "a secret reached the browser");
  const log = fs.readFileSync(stack.logFile, "utf8");
  for (const secret of SECRET_VALUES) assert.ok(!log.includes(secret), "a secret value is in the server log after real traffic");
  assert.ok(!/at .*node_modules|SQLITE_|stack/i.test(log.replace(/\[config\][^\n]*/g, "")), "no stack traces or database errors were logged during normal traffic");
});

// ------------------------------------------------------------------ headers

test("DP5 security headers are present on every response type (page, redirect, API, 404, static asset, download)", async () => {
  const stack = stacks.find((s) => s.base.endsWith(":3321"));
  const targets = [
    ["public page", "/", 200],
    ["course page", "/courses/full-stack-development", 200],
    ["private area redirect", "/admin", 307],
    ["login", "/login", 200],
    ["API (health)", "/api/health", 200],
    ["API (hidden)", "/api/notifications/process", 405],
    ["not found", "/this-route-does-not-exist", 404],
    ["robots", "/robots.txt", 200],
    ["sitemap", "/sitemap.xml", 200],
    ["certificate verify (unknown)", "/verify-certificate/" + "a".repeat(43), 404],
  ];
  const problems = [];
  for (const [label, p, expectedStatus] of targets) {
    const r = await fetch(stack.base + p, { redirect: "manual" });
    if (r.status !== expectedStatus) problems.push(`${label}: status ${r.status}, expected ${expectedStatus}`);
    const h = r.headers;
    if (!/frame-ancestors 'none'/.test(h.get("content-security-policy") || "")) problems.push(`${label}: no CSP`);
    if (h.get("x-content-type-options") !== "nosniff") problems.push(`${label}: no nosniff`);
    if (h.get("x-frame-options") !== "DENY") problems.push(`${label}: no X-Frame-Options`);
    if (!/max-age=\d{7,}/.test(h.get("strict-transport-security") || "")) problems.push(`${label}: no HSTS`);
    if (!h.get("referrer-policy")) problems.push(`${label}: no Referrer-Policy`);
    if (h.get("x-powered-by")) problems.push(`${label}: advertises ${h.get("x-powered-by")}`);
  }
  // a static asset and a server error response
  const home = await (await fetch(stack.base + "/")).text();
  const asset = home.match(/\/_next\/static\/[^"'\\\s]+\.js/)[0];
  const a = await fetch(stack.base + asset);
  if (a.headers.get("x-content-type-options") !== "nosniff") problems.push("static asset: no nosniff");
  assert.deepEqual(problems, []);

  // the canonical / sitemap / robots reflect the configured origin
  const robots = await (await fetch(stack.base + "/robots.txt")).text();
  const sitemap = await (await fetch(stack.base + "/sitemap.xml")).text();
  // everything that carries the site origin agrees with the configured one (not the production default)
  const urls = new Set([...sitemap.matchAll(/https:\/\/[a-z.-]+/g)].map((m) => m[0]));
  assert.deepEqual([...urls], ["https://staging.example.org"], "sitemap uses the configured origin only");
  assert.match(robots, /Sitemap: https:\/\/staging\.example\.org\/sitemap\.xml/, "robots.txt points at this site's sitemap, not production's");
  const course = await (await fetch(stack.base + "/courses/full-stack-development")).text();
  assert.match(course, /rel="canonical" href="https:\/\/staging\.example\.org\/courses\/full-stack-development"/);
  assert.match(robots, /Disallow: \/admin/);
  assert.match(robots, /Disallow: \/super-admin/);
  assert.match(robots, /Disallow: \/api/i, "robots keeps crawlers off the API");
});
