// Security behaviour verified from the outside, against the production build.
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { startStack } from "./stack.mjs";
import { Session, openDb, bodyText } from "./helpers.mjs";

let stack;
const sessions = new Map();
async function as(key) {
  if (!sessions.has(key)) {
    const s = await new Session(stack, key).open();
    await s.login(key);
    sessions.set(key, s);
  }
  return sessions.get(key);
}

before(async () => {
  stack = await startStack({ port: 3261 });
});
after(async () => {
  for (const s of sessions.values()) await s.close();
  await stack?.stop();
});

// Reads the hidden Server-Action fields out of the rendered form so a request
// can be replayed outside the page (as a forged cross-site POST would).
async function actionFields(page, formSelector) {
  return page.locator(formSelector).first().evaluate((form) => {
    const out = {};
    form.querySelectorAll("input").forEach((i) => {
      if (i.name && i.type === "hidden") out[i.name] = i.value;
    });
    return out;
  });
}

test("S1 CSRF: a Server Action POST with a foreign Origin is rejected and changes nothing; same-origin works", async () => {
  const student = await as("student");
  await student.goto("/student/notifications");
  const form = 'form:has(input[name="emailNotifications"])';
  const fields = await actionFields(student.page, form);
  assert.ok(Object.keys(fields).some((k) => k.startsWith("$ACTION")), "server action fields present");
  const read = () => {
    const d = openDb(stack);
    const v = d.prepare("SELECT email_notifications e FROM users WHERE id = ?").get(stack.data.users.student.id).e;
    d.close();
    return v;
  };
  assert.equal(read(), 1);

  // no emailNotifications value => the action would switch email OFF
  const forged = await student.context.request.post(stack.base + "/student/notifications", {
    multipart: fields,
    headers: { Origin: "https://evil.example", Referer: "https://evil.example/attack.html" },
    maxRedirects: 0,
  });
  assert.notEqual(forged.status(), 200, "cross-origin action call must not succeed");
  assert.equal(read(), 1, "the forged request changed nothing");

  const genuine = await student.context.request.post(stack.base + "/student/notifications", {
    multipart: fields,
    headers: { Origin: stack.base },
    maxRedirects: 0,
  });
  assert.ok(genuine.status() < 400, `same-origin works (${genuine.status()})`);
  assert.equal(read(), 0, "the genuine request took effect");
});

test("S2 login throttling cannot be dodged by forging X-Forwarded-For (a trusted proxy appends the real address last)", async () => {
  const email = stack.data.users.trainer2.email;
  const ctx = await stack.browser.newContext();
  const page = await ctx.newPage();
  try {
    const attempt = async (spoof, password) => {
      await ctx.setExtraHTTPHeaders({ "x-forwarded-for": `${spoof}, 198.51.100.9` });
      await page.goto(stack.base + "/login");
      await page.fill("#email", email);
      await page.fill("#password", password);
      await page.click("button[type=submit]");
      await page.getByText(/Invalid email or password|Too many sign-in attempts/).first().waitFor({ timeout: 8000 });
      return bodyText(page);
    };
    let last = "";
    for (let i = 0; i < 10; i += 1) last = await attempt(`10.0.${i}.1`, `wrong-${i}`);
    assert.match(last, /Invalid email or password/);
    // 11th attempt, brand-new forged address, CORRECT password: still locked out
    const locked = await attempt("10.9.9.9", stack.data.password);
    assert.match(locked, /Too many sign-in attempts/);
    assert.notEqual(new URL(page.url()).pathname.split("/")[1], "trainer");

    // the same account from a different real client address is not locked out
    await ctx.setExtraHTTPHeaders({ "x-forwarded-for": "1.1.1.1, 198.51.100.200" });
    await page.goto(stack.base + "/login");
    await page.fill("#email", email);
    await page.fill("#password", stack.data.password);
    await page.click("button[type=submit]");
    await page.waitForURL((u) => u.pathname.startsWith("/trainer"), { timeout: 8000 });
  } finally {
    await ctx.close();
  }
});

test("S3 authenticated pages are not cacheable; anonymous replay of a private URL gets the login page", async () => {
  const student = await as("student");
  const res = await student.context.request.get(stack.base + "/student/fees");
  const cc = res.headers()["cache-control"] || "";
  assert.match(cc, /no-store|private/, `cache-control: ${cc}`);
  const anon = await fetch(stack.base + "/student/fees", { redirect: "manual" });
  assert.ok([302, 303, 307].includes(anon.status));
  assert.match(anon.headers.get("location"), /\/login/);
});

test("S4 hostile input: malformed ids, SQL metacharacters and script text produce clean 404/200s with no stack traces or reflection", async () => {
  const admin = await as("admin");
  const probes = [
    "/admin/leads/not-a-uuid",
    "/admin/fees/%27%20OR%201%3D1--",
    "/admin/users/..%2F..%2Fetc%2Fpasswd",
    "/admin/users?q=%27%20OR%201%3D1%20--",
    "/admin/leads?q=%3Cscript%3Ealert(1)%3C%2Fscript%3E&status=NOPE&page=-5",
    "/admin/enrollments?page=99999999999999999999&sort=%3Bdrop%20table%20users",
    "/admin/analytics?preset=%27%3Bselect%201",
  ];
  for (const p of probes) {
    const r = await admin.goto(p);
    const html = await admin.page.content();
    assert.ok([200, 404].includes(r.status()), `${p} -> ${r.status()}`);
    assert.ok(!/SQLITE_|SqliteError|syntax error|at Object\.|node_modules|\.js:\d+:\d+/.test(html), `${p} leaked internals`);
    assert.ok(!html.includes("<script>alert(1)</script>"), `${p} reflected markup unescaped`);
  }
  const d = openDb(stack);
  assert.ok(d.prepare("SELECT COUNT(*) c FROM users").get().c >= 9, "users table intact");
  d.close();
  admin.assertClean("hostile input");
});

test("S5 no framework banner, no exposed data files, no source maps", async () => {
  const r = await fetch(stack.base + "/");
  assert.equal(r.headers.get("x-powered-by"), null, "X-Powered-By should not advertise the framework");
  for (const p of ["/.env", "/.env.local", "/data/app.db", "/app.db", "/package.json", "/next.config.mjs", "/src/lib/db/client.js", "/tests/helpers.mjs", "/.git/config"]) {
    const res = await fetch(stack.base + p);
    assert.equal(res.status, 404, `${p} must not be served (${res.status})`);
  }
  const home = await (await fetch(stack.base + "/")).text();
  const chunk = home.match(/\/_next\/static\/chunks\/[^"']+\.js/)?.[0];
  assert.ok(chunk);
  const map = await fetch(stack.base + chunk + ".map");
  assert.equal(map.status, 404, "production source maps are not published");
});

test("S6 the session cookie never reaches client scripts and survives no JS access", async () => {
  const student = await as("student");
  await student.goto("/student");
  const visible = await student.page.evaluate(() => document.cookie);
  assert.ok(!visible.includes("techotd_session"), "HttpOnly cookie is invisible to document.cookie");
  const storage = await student.page.evaluate(() => JSON.stringify({ ...localStorage, ...sessionStorage }));
  assert.ok(!/session|token|password/i.test(storage), "no credentials in web storage");
});

test("S7 cross-user object access: student cannot read staff pages or another student's records by id", async () => {
  const s1 = await as("student");
  const d = openDb(stack);
  const target = d.prepare("SELECT id FROM users WHERE id = ?").get(stack.data.users.student2.id);
  d.close();
  for (const p of [`/admin/users/${target.id}`, `/admin/students/${target.id}`, `/trainer/students/${target.id}`]) {
    await s1.goto(p);
    await s1.page.waitForURL((u) => u.pathname !== p, { timeout: 5000 }).catch(() => {});
    const t = await bodyText(s1.page);
    assert.ok(new URL(s1.page.url()).pathname !== p || !/E2E student2/.test(t), `${p} leaked a record`);
  }
});
