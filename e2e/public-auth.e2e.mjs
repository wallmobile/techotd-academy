// Workflows A (public site) and B (authentication / authorization) in real Chrome.
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import { startStack } from "./stack.mjs";
import { Session, VIEWPORTS, openDb, bodyText } from "./helpers.mjs";

let stack;
before(async () => {
  stack = await startStack({ port: 3221 });
});
after(async () => {
  await stack?.stop();
});

// ---------------------------------------------------------------- A. public

test("A1 home → catalog → course detail renders with real content, no console errors", async () => {
  const s = await new Session(stack, "anon").open();
  try {
    await s.goto("/");
    assert.match(await s.page.title(), /TechOTD Academy/);
    await s.goto("/courses");
    const links = await s.page.locator('a[href^="/courses/"]').evaluateAll((as) => [...new Set(as.map((a) => a.getAttribute("href")))]);
    assert.ok(links.length >= 3, `catalog lists several courses (${links.length})`);
    await s.goto(links[0]);
    assert.ok((await s.page.locator("h1").first().innerText()).length > 3);
    // structured data must be valid JSON with no raw "<" inside the script
    const ld = await s.page.locator('script[type="application/ld+json"]').first().innerHTML();
    assert.ok(!ld.includes("<"), "JSON-LD contains no raw <");
    assert.doesNotThrow(() => JSON.parse(ld));
    s.assertClean("public catalog");
  } finally {
    await s.close();
  }
});

test("A2 unknown course slug is a real 404, not a blank page", async () => {
  const s = await new Session(stack, "anon").open();
  try {
    const r = await s.goto("/courses/definitely-not-a-course");
    assert.equal(r.status(), 404);
    assert.match(await bodyText(s.page), /not found|404/i);
  } finally {
    await s.close();
  }
});

test("A3 enquiry: client-side validation blocks an empty submit, a valid one succeeds and creates exactly one lead", async () => {
  const s = await new Session(stack, "anon").open();
  try {
    await s.goto("/enquiry");
    await s.page.getByRole("button", { name: /submit request/i }).click();
    // nothing was stored and the user sees why
    const text = await bodyText(s.page);
    assert.match(text, /name|required|enter/i);
    const db = openDb(stack);
    assert.equal((await db.prepare("SELECT COUNT(*) c FROM leads").get()).c, 0);

    await s.page.getByLabel(/Full Name/i).fill("Browser Tester");
    await s.page.getByLabel(/Phone Number/i).fill("9876543210");
    await s.page.getByLabel(/Email/i).fill("browser.tester@example.test");
    await s.page.getByLabel(/Message/i).fill("I would like details about the course.");
    await s.page.locator('input[type="checkbox"]').check();
    await s.page.getByRole("button", { name: /submit request/i }).click();
    await s.page.getByText(/thank|received|we.?ll (be in touch|contact)|submitted/i).first().waitFor({ timeout: 10000 });
    const row = await db.prepare("SELECT name, source, email, consent FROM leads").all();
    assert.equal(row.length, 1);
    assert.equal(row[0].name, "Browser Tester");
    assert.equal(row[0].email, "browser.tester@example.test");
    db.close();
    s.assertClean("enquiry");
  } finally {
    await s.close();
  }
});

test("A4 book-demo works on a phone-sized viewport with no horizontal scrolling", async () => {
  const s = await new Session(stack, "anon-mobile", { viewport: VIEWPORTS.mobile }).open();
  try {
    await s.goto("/book-demo");
    assert.equal(await s.hasHorizontalOverflow(), false);
    await s.page.getByLabel(/Full Name/i).fill("Mobile Tester");
    await s.page.getByLabel(/Phone Number/i).fill("9123456780");
    await s.page.getByLabel(/Email/i).fill("mobile.tester@example.test");
    await s.page.locator('input[type="checkbox"]').check();
    await s.page.getByRole("button", { name: /book my free session/i }).click();
    await s.page.getByText(/thank|booked|received|we.?ll/i).first().waitFor({ timeout: 10000 });
    const db = openDb(stack);
    const row = await db.prepare("SELECT source FROM leads WHERE email = ?").get("mobile.tester@example.test");
    assert.equal(row.source, "BOOK_DEMO");
    db.close();
    s.assertClean("book demo (mobile)");
  } finally {
    await s.close();
  }
});

test("A5 consent is mandatory: submitting without it stores nothing", async () => {
  const s = await new Session(stack, "anon").open();
  try {
    await s.goto("/enquiry");
    await s.page.getByLabel(/Full Name/i).fill("No Consent");
    await s.page.getByLabel(/Phone Number/i).fill("9876543211");
    await s.page.getByLabel(/Email/i).fill("noconsent@example.test");
    await s.page.getByRole("button", { name: /submit request/i }).click();
    await s.page.waitForTimeout(500);
    const db = openDb(stack);
    assert.equal((await db.prepare("SELECT COUNT(*) c FROM leads WHERE email = ?").get("noconsent@example.test")).c, 0);
    db.close();
  } finally {
    await s.close();
  }
});

test("A6 CSP is delivered and actually enforced by the browser (remote script and framing blocked)", async () => {
  const s = await new Session(stack, "anon").open();
  try {
    const resp = await s.goto("/");
    const csp = resp.headers()["content-security-policy"];
    assert.ok(csp && csp.includes("frame-ancestors 'none'"));
    assert.equal(resp.headers()["x-frame-options"], "DENY");
    assert.equal(resp.headers()["x-content-type-options"], "nosniff");
    const violations = await s.page.evaluate(
      () =>
        new Promise((resolve) => {
          const seen = [];
          document.addEventListener("securitypolicyviolation", (e) => seen.push(e.violatedDirective));
          const script = document.createElement("script");
          script.src = "https://example.com/evil.js";
          document.head.appendChild(script);
          const img = document.createElement("img");
          img.src = "https://example.com/pixel.gif";
          document.body.appendChild(img);
          setTimeout(() => resolve(seen), 800);
        })
    );
    assert.ok(violations.some((v) => v.startsWith("script-src")), `remote script blocked (${violations})`);
    assert.ok(violations.some((v) => v.startsWith("img-src")), `remote image blocked (${violations})`);
  } finally {
    await s.close();
  }
});

// ---------------------------------------------------------------- B. auth

test("B1 wrong password and unknown email give the same generic message", async () => {
  const s = await new Session(stack, "anon").open();
  try {
    await s.loginRaw(stack.data.users.student.email, "not-the-password");
    await s.page.getByText(/Invalid email or password/i).waitFor();
    await s.loginRaw("ghost@e2e.test", "not-the-password");
    await s.page.getByText(/Invalid email or password/i).waitFor();
    assert.match(new URL(s.page.url()).pathname, /^\/login/);
    s.assertClean("failed login");
  } finally {
    await s.close();
  }
});

test("B2 each role signs in to its own area and the session cookie is HttpOnly + SameSite=Lax", async () => {
  const expected = { student: "/student", trainer: "/trainer", admin: "/admin", superadmin: "/super-admin", counsellor: "/admin", accountant: "/admin", placement: "/admin" };
  for (const [key, area] of Object.entries(expected)) {
    const s = await new Session(stack, key).open();
    try {
      await s.login(key);
      assert.ok(new URL(s.page.url()).pathname.startsWith(area), `${key} landed on ${s.page.url()}`);
      const cookie = (await s.context.cookies()).find((c) => c.name === "techotd_session");
      assert.ok(cookie, "session cookie set");
      assert.equal(cookie.httpOnly, true);
      assert.equal(cookie.sameSite, "Lax");
      assert.equal(cookie.secure, true, "production cookies are Secure");
      s.assertClean(`${key} dashboard`);
    } finally {
      await s.close();
    }
  }
});

test("B3 anonymous users are bounced to /login from every private area, and private pages aren't indexable", async () => {
  const s = await new Session(stack, "anon").open();
  try {
    for (const p of ["/admin", "/admin/fees", "/student", "/student/fees", "/trainer", "/trainer/students"]) {
      await s.goto(p);
      assert.equal(new URL(s.page.url()).pathname, "/login", p);
    }
    const robots = await (await fetch(stack.base + "/robots.txt")).text();
    assert.match(robots, /Disallow: \/admin/);
  } finally {
    await s.close();
  }
});

test("B4 cross-role access is refused server-side (student→admin/trainer, trainer→admin/student, accountant→CRM-only)", async () => {
  const cases = [
    ["student", ["/admin", "/admin/users", "/admin/fees", "/trainer"]],
    ["trainer", ["/admin", "/admin/users", "/student", "/student/fees"]],
    ["accountant", ["/admin/leads", "/admin/jobs", "/admin/users"]],
    ["placement", ["/admin/fees", "/admin/leads", "/admin/users"]],
    ["counsellor", ["/admin/fees", "/admin/jobs", "/admin/users"]],
  ];
  for (const [role, paths] of cases) {
    const s = await new Session(stack, role).open();
    try {
      await s.login(role);
      const home = new URL(s.page.url()).pathname;
      for (const p of paths) {
        await s.goto(p);
        // A page-level redirect() after the shell has streamed completes as a
        // client navigation, so wait for the URL to leave the denied route.
        await s.page.waitForURL((u) => u.pathname !== p, { timeout: 5000 }).catch(() => {});
        const landed = new URL(s.page.url()).pathname;
        const text = await bodyText(s.page);
        const denied = landed !== p || /not authorized|access denied|forbidden|don.?t have permission|not allowed/i.test(text);
        assert.ok(denied, `${role} must not see ${p} (landed ${landed}, home ${home})`);
        if (landed === p) assert.ok(!/E2E (student|trainer)|@example.test/.test(text), `${role} saw data on ${p}`);
      }
    } finally {
      await s.close();
    }
  }
});

test("B5 logout invalidates the session server-side (replaying the old cookie fails)", async () => {
  const s = await new Session(stack, "student").open();
  try {
    await s.login("student");
    const old = (await s.context.cookies()).find((c) => c.name === "techotd_session").value;
    await s.logout();
    // replay the pre-logout cookie in a fresh context
    const replay = await stack.browser.newContext();
    await replay.addCookies([{ name: "techotd_session", value: old, url: stack.base }]);
    const page = await replay.newPage();
    await page.goto(stack.base + "/student");
    assert.equal(new URL(page.url()).pathname, "/login");
    await replay.close();
  } finally {
    await s.close();
  }
});

test("B6 an expired session is rejected and sent to login", async () => {
  const s = await new Session(stack, "student2").open();
  try {
    await s.login("student2");
    await s.goto("/student");
    assert.equal(new URL(s.page.url()).pathname, "/student");
    const db = openDb(stack, { readonly: false });
    await db.prepare("UPDATE sessions SET expires_at = app_now('-1 hour') WHERE user_id = ?").run(stack.data.users.student2.id);
    db.close();
    await s.goto("/student");
    assert.equal(new URL(s.page.url()).pathname, "/login");
  } finally {
    await s.close();
  }
});

test("B7 deactivating an account kills its live session immediately", async () => {
  const victim = await new Session(stack, "student2").open();
  const admin = await new Session(stack, "superadmin").open();
  try {
    await victim.login("student2");
    await victim.goto("/student");
    assert.equal(new URL(victim.page.url()).pathname, "/student");

    await admin.login("superadmin");
    await admin.goto(`/admin/users/${stack.data.users.student2.id}`);
    await admin.page.getByRole("button", { name: /deactivate account/i }).click();
    await admin.page.waitForLoadState("load");
    await admin.page.waitForTimeout(600);

    await victim.goto("/student");
    assert.equal(new URL(victim.page.url()).pathname, "/login", "deactivated user's open session is no longer valid");
    // and they cannot sign in again
    await victim.loginRaw(stack.data.users.student2.email, stack.data.password);
    await victim.page.waitForTimeout(800);
    assert.match(new URL(victim.page.url()).pathname, /^\/login/);

    // reactivate so later tests can use the account
    await admin.goto(`/admin/users/${stack.data.users.student2.id}`);
    await admin.page.getByRole("button", { name: /reactivate|activate/i }).click();
    await admin.page.waitForTimeout(600);
  } finally {
    await victim.close();
    await admin.close();
  }
});

test("B8 password reset in production: no email provider ⇒ honest message, no token; seeded token ⇒ full reset, reuse refused", async () => {
  const s = await new Session(stack, "anon").open();
  try {
    await s.goto("/forgot-password");
    await s.page.getByLabel("Email").fill(stack.data.users.student.email);
    await s.page.getByRole("button", { name: /send reset instructions/i }).click();
    await s.page.getByText(/isn.?t available right now/i).waitFor();
    const db = openDb(stack, { readonly: false });
    assert.equal((await db.prepare("SELECT COUNT(*) c FROM password_reset_tokens").get()).c, 0);
    assert.ok(!(await bodyText(s.page)).includes("/reset-password?token="), "no link leaks into the page");

    // Arrange a token (what an email would have carried) and run the real reset UI.
    const raw = crypto.randomBytes(24).toString("base64url");
    await db.prepare("INSERT INTO password_reset_tokens (id, user_id, token_hash, expires_at) VALUES (?, ?, ?, ?)").run(
      crypto.randomUUID(),
      stack.data.users.student.id,
      crypto.createHash("sha256").update(raw).digest("hex"),
      new Date(Date.now() + 30 * 60 * 1000).toISOString()
    );
    db.close();

    await s.goto(`/reset-password?token=${raw}`);
    await s.page.getByLabel("New Password", { exact: true }).fill("Short1");
    await s.page.getByLabel("Confirm New Password").fill("Different-Pass-9");
    await s.page.getByRole("button", { name: /update password/i }).click();
    await s.page.waitForTimeout(500);
    assert.match(await bodyText(s.page), /match|at least|characters|password/i);

    await s.page.getByLabel("New Password", { exact: true }).fill("Fresh-Passw0rd-42");
    await s.page.getByLabel("Confirm New Password").fill("Fresh-Passw0rd-42");
    await s.page.getByRole("button", { name: /update password/i }).click();
    await s.page.getByText(/password (has been )?(updated|changed|reset)|sign in/i).first().waitFor({ timeout: 8000 });

    // reuse of the same link is refused
    await s.goto(`/reset-password?token=${raw}`);
    await s.page.getByLabel("New Password", { exact: true }).fill("Another-Passw0rd-1");
    await s.page.getByLabel("Confirm New Password").fill("Another-Passw0rd-1");
    await s.page.getByRole("button", { name: /update password/i }).click();
    await s.page.getByText(/invalid or has expired|invalid/i).first().waitFor();

    // new password works, old one doesn't
    await s.loginRaw(stack.data.users.student.email, stack.data.password);
    await s.page.getByText(/Invalid email or password/i).waitFor();
    await s.login("student", "Fresh-Passw0rd-42");
    assert.equal(new URL(s.page.url()).pathname, "/student");
  } finally {
    await s.close();
  }
});

test("B9 registration: validation, duplicate email, and a successful sign-up lands in the student area", async () => {
  const s = await new Session(stack, "anon").open();
  try {
    await s.goto("/register");
    await s.page.getByRole("button", { name: /create account/i }).click();
    await s.page.waitForTimeout(400);
    assert.match(await bodyText(s.page), /required|enter|valid|at least/i);

    const fill = async (email) => {
      await s.page.getByLabel("Full Name").fill("Registered Person");
      await s.page.getByLabel("Email").fill(email);
      await s.page.getByLabel("Password", { exact: true }).fill("Sign-Up-Passw0rd-7");
      await s.page.getByLabel("Confirm Password").fill("Sign-Up-Passw0rd-7");
      await s.page.locator('input[name="consent"]').check();
      await s.page.getByRole("button", { name: /create account/i }).click();
    };
    await fill(stack.data.users.admin.email);
    await s.page.getByText(/already exists/i).waitFor();

    await s.page.reload();
    await fill("new.registrant@e2e.test");
    await s.page.waitForURL((u) => u.pathname.startsWith("/student"), { timeout: 10000 });
    const db = openDb(stack);
    const u = await db.prepare("SELECT role, status FROM users WHERE email = ?").get("new.registrant@e2e.test");
    assert.deepEqual({ ...u }, { role: "STUDENT", status: "ACTIVE" }, "self-registration can only ever create a STUDENT");
    db.close();
    s.assertClean("registration");
  } finally {
    await s.close();
  }
});
