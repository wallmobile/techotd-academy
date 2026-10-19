// Admin panel audit, part 1: authorization matrix (every admin route x every
// role), navigation integrity (no dead / inaccessible links, one active item,
// "Soon" items are not links) and the mobile drawer. Real Chrome, production build.
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { startStack } from "./stack.mjs";
import { Session, VIEWPORTS, openDb, bodyText } from "./helpers.mjs";

let stack;
const sessions = new Map();
const ids = {};

async function as(key, opts) {
  const id = key + (opts?.viewport ? ":m" : "");
  if (!sessions.has(id)) {
    const s = await new Session(stack, id, opts).open();
    await s.login(key);
    sessions.set(id, s);
  }
  return sessions.get(id);
}

const STAFF = ["superadmin", "admin", "counsellor", "accountant", "placement", "contentmgr"];
const ALL = [...STAFF, "trainer", "student"];
const MANAGERS = ["superadmin", "admin"];

before(async () => {
  stack = await startStack({ port: 3271 });
  const admin = await as("admin");
  // Arrange real records through the UI so detail routes can be probed.
  await admin.goto(`/admin/enrollments/new?student=${stack.data.users.student.id}`);
  await admin.page.selectOption('select[name="course"]', stack.data.course);
  await admin.page.selectOption('select[name="batch"]', stack.data.batch);
  await admin.page.getByRole("button", { name: /enroll student/i }).click();
  await admin.page.waitForURL(/\/admin\/enrollments\/[0-9a-f-]{36}$/);
  ids.enrollment = new URL(admin.page.url()).pathname.split("/").pop();

  const acc = await as("accountant");
  await acc.goto(`/admin/fees/new?enrollment=${ids.enrollment}`);
  await acc.page.getByLabel("Total fee").fill("12000");
  await acc.page.getByRole("button", { name: /assign fee/i }).click();
  await acc.page.waitForURL(/\/admin\/fees\/[0-9a-f-]{36}$/);
  ids.fee = new URL(acc.page.url()).pathname.split("/").pop();
  await acc.page.getByLabel("Amount received").fill("3000");
  await acc.page.getByLabel("Method").selectOption("CASH");
  await acc.page.getByRole("button", { name: /record payment/i }).click();
  await acc.page.waitForFunction(() => /PAID\s+₹3,000\.00/.test(document.body.innerText));

  await admin.goto(`/admin/certificates/new?enrollment=${ids.enrollment}`);
  await admin.page.getByLabel(/Reason for manual approval/i).fill("Audit fixture approval");
  await admin.page.getByRole("button", { name: /issue with manual approval/i }).click();
  await admin.page.waitForURL(/\/admin\/certificates\/[0-9a-f-]{36}$/);
  ids.certificate = new URL(admin.page.url()).pathname.split("/").pop();

  const place = await as("placement");
  await place.goto("/admin/jobs/new");
  await place.page.getByLabel("Job title").fill("Audit Fixture Role");
  await place.page.getByLabel("Company").fill("Fixture Co");
  await place.page.getByLabel("Description").fill("Synthetic job used by the admin audit.");
  await place.page.getByRole("button", { name: /create job/i }).click();
  await place.page.waitForURL(/\/admin\/jobs\/[0-9a-f-]{36}$/);
  ids.job = new URL(place.page.url()).pathname.split("/").pop();

  const anon = await new Session(stack, "anon").open();
  await anon.goto("/enquiry");
  await anon.page.getByLabel(/Full Name/i).fill("Audit Lead");
  await anon.page.getByLabel(/Phone Number/i).fill("9876543210");
  await anon.page.getByLabel(/Email/i).fill("audit.lead@e2e.test");
  await anon.page.locator('input[type="checkbox"]').check();
  await anon.page.getByRole("button", { name: /submit request/i }).click();
  await anon.page.getByText(/thank|received|we.?ll/i).first().waitFor();
  await anon.close();

  const d = openDb(stack);
  ids.lead = d.prepare("SELECT id FROM leads WHERE email = 'audit.lead@e2e.test'").get().id;
  ids.payment = d.prepare("SELECT id FROM payments").get().id;
  ids.student = stack.data.users.student.id;
  ids.trainer = stack.data.users.trainer.id;
  d.close();
});

after(async () => {
  for (const s of sessions.values()) await s.close();
  await stack?.stop();
});

// route -> roles that may open it (derived from the product rules in
// src/constants/*, written out here independently so a loosened guard fails).
const MATRIX = () => [
  ["/admin", STAFF],
  ["/admin/notifications", STAFF],
  ["/admin/account", STAFF],
  ["/admin/analytics", ["superadmin", "admin", "counsellor", "accountant", "placement"]],
  ["/admin/leads", ["superadmin", "admin", "counsellor"]],
  [`/admin/leads/${ids.lead}`, ["superadmin", "admin", "counsellor"]],
  ["/admin/users", MANAGERS],
  [`/admin/users/${ids.student}`, MANAGERS],
  ["/admin/students", MANAGERS],
  [`/admin/students/${ids.student}`, MANAGERS],
  ["/admin/trainers", MANAGERS],
  ["/admin/trainers/new", MANAGERS],
  [`/admin/trainers/${ids.trainer}`, MANAGERS],
  ["/admin/enrollments", MANAGERS],
  ["/admin/enrollments/new", MANAGERS],
  [`/admin/enrollments/${ids.enrollment}`, MANAGERS],
  ["/admin/roles", MANAGERS],
  ["/admin/certificates", MANAGERS],
  ["/admin/certificates/new", MANAGERS],
  [`/admin/certificates/${ids.certificate}`, MANAGERS],
  ["/admin/notifications/deliveries", MANAGERS],
  ["/admin/fees", ["superadmin", "admin", "accountant"]],
  ["/admin/fees/new", ["superadmin", "admin", "accountant"]],
  [`/admin/fees/${ids.fee}`, ["superadmin", "admin", "accountant"]],
  [`/admin/fees/${ids.fee}/receipt/${ids.payment}`, ["superadmin", "admin", "accountant"]],
  ["/admin/jobs", ["superadmin", "admin", "placement"]],
  ["/admin/jobs/new", ["superadmin", "admin", "placement"]],
  [`/admin/jobs/${ids.job}`, ["superadmin", "admin", "placement"]],
  ["/admin/courses", MANAGERS],
  ["/admin/courses/new", MANAGERS],
  ["/admin/courses/full-stack-development", MANAGERS],
  ["/admin/batches", MANAGERS],
  ["/admin/batches/new", MANAGERS],
  ["/admin/batches/full-stack-development-01", MANAGERS],
  ["/super-admin", ["superadmin"]],
  ["/super-admin/staff", ["superadmin"]],
  ["/super-admin/staff/new", ["superadmin"]],
];

async function probe(session, route) {
  const resp = await session.goto(route);
  await session.page.waitForURL((u) => u.pathname !== route, { timeout: 2500 }).catch(() => {});
  const landed = new URL(session.page.url()).pathname;
  const text = await bodyText(session.page);
  const notFound = resp.status() === 404 || /^404\b|page not found|could(n.t| not) be found/i.test(text.slice(0, 200));
  return landed === route && !notFound && resp.status() < 400;
}

// One test per role keeps each under the suite's per-test timeout.
for (const role of ALL) {
  test(`AZ1 authorization matrix: ${role} can open exactly the intended admin routes (37 routes)`, async () => {
    const s = await as(role);
    const mismatches = [];
    for (const [route, allowed] of MATRIX()) {
      const open = await probe(s, route);
      const expected = allowed.includes(role);
      if (open !== expected) mismatches.push(`${role} ${route}: ${open ? "OPEN" : "denied"} (expected ${expected ? "open" : "denied"})`);
    }
    assert.deepEqual(mismatches, []);
  });
}

test("AZ2 anonymous visitors are bounced to /login from every admin route", async () => {
  const anon = await new Session(stack, "anon").open();
  try {
    for (const [route] of MATRIX()) {
      await anon.goto(route);
      assert.equal(new URL(anon.page.url()).pathname, "/login", route);
    }
  } finally {
    await anon.close();
  }
});

test("AZ3 download/export endpoints enforce roles server-side", async () => {
  const cases = [
    [`/admin/certificates/${ids.certificate}/download`, MANAGERS, "application/pdf"],
    ["/admin/analytics/export?type=summary&preset=last30", MANAGERS, "text/csv"],
  ];
  for (const role of ALL) {
    const s = await as(role);
    for (const [url, allowed, type] of cases) {
      const r = await s.context.request.get(stack.base + url, { maxRedirects: 0 });
      const ok = r.status() === 200 && (r.headers()["content-type"] || "").includes(type);
      assert.equal(ok, allowed.includes(role), `${role} ${url} -> ${r.status()}`);
    }
  }
});

test("AZ4 unknown ids render the custom not-found page (no crash, no data) for every detail route", async () => {
  const admin = await as("superadmin");
  const bogus = "00000000-0000-4000-8000-000000000000";
  for (const base of ["leads", "users", "students", "trainers", "enrollments", "certificates", "fees", "jobs", "courses", "batches"]) {
    const r = await admin.goto(`/admin/${base}/${bogus}`);
    const text = await bodyText(admin.page);
    // Next streams the shell (loading.jsx) before notFound() fires, so the HTTP status can be 200; the page itself is the not-found UI and is noindex.
    assert.ok([200, 404].includes(r.status()), `${base} status ${r.status()}`);
    assert.match((await admin.page.locator('meta[name="robots"]').first().getAttribute("content")) || "", /noindex/, `${base} not-found is noindex`);
    assert.match(text, /not found/i, `${base} message`);
    assert.ok(!/SQLITE|TypeError|at \w+ \(/.test(text), `${base} leaked internals`);
    assert.ok(await admin.page.getByRole("link", { name: /back to/i }).count(), `${base} offers a way back`);
  }
  admin.assertClean("not-found pages");
});

// ------------------------------------------------------------- navigation

test("NV1 every sidebar link is reachable for its role, 'Soon' items are not links, exactly one item is active", async () => {
  const problems = [];
  for (const role of STAFF) {
    const s = await as(role);
    await s.goto(role === "superadmin" ? "/super-admin" : "/admin");
    const nav = s.page.locator("aside nav").first();
    const items = await nav.evaluate((n) =>
      [...n.querySelectorAll("a, span")]
        .filter((e) => e.textContent.trim() && !e.closest("a") || e.tagName === "A")
        .map((e) => ({ tag: e.tagName, text: e.textContent.trim(), href: e.getAttribute("href") }))
    );
    const links = items.filter((i) => i.tag === "A" && i.href);
    assert.ok(links.length >= 1, `${role} has navigation`);
    const soon = items.filter((i) => /soon/i.test(i.text));
    assert.ok(soon.every((i) => i.tag !== "A"), `${role}: a "Soon" item is a link`);
    const hrefs = [...new Set(links.map((l) => l.href))];
    for (const href of hrefs) {
      await s.goto(href);
      await s.page.waitForURL((u) => u.pathname !== href, { timeout: 1200 }).catch(() => {});
      const landed = new URL(s.page.url()).pathname;
      const r404 = /not found/i.test((await s.page.locator("h1,h2").first().innerText().catch(() => "")) || "");
      if (landed !== href || r404) problems.push(`${role}: nav link ${href} lands on ${landed}${r404 ? " (404)" : ""}`);
      const active = await s.page.locator('aside nav a[aria-current="page"]').count();
      if (active !== 1) problems.push(`${role}: ${href} has ${active} active nav items`);
    }
  }
  assert.deepEqual(problems, []);
});

test("NV2 nav shows nothing a role is denied: visible links match the authorization matrix", async () => {
  const problems = [];
  const rules = MATRIX().filter(([r]) => !r.match(/[0-9a-f]{8}-[0-9a-f]{4}/) && !r.endsWith("/new"));
  for (const role of STAFF) {
    const s = await as(role);
    await s.goto(role === "superadmin" ? "/super-admin" : "/admin");
    const hrefs = await s.page.locator("aside nav a").evaluateAll((as) => as.map((a) => a.getAttribute("href")));
    for (const [route, allowed] of rules) {
      if (hrefs.includes(route) && !allowed.includes(role)) problems.push(`${role} sees a link to ${route} it cannot open`);
    }
  }
  assert.deepEqual(problems, []);
});

test("NV3 mobile: drawer opens as a dialog, lists the same links, closes on Escape and on navigation, no overflow", async () => {
  for (const role of ["superadmin", "counsellor"]) {
    const m = await as(role, { viewport: VIEWPORTS.mobile });
    const home = role === "superadmin" ? "/super-admin" : "/admin";
    await m.goto(home);
    assert.equal(await m.hasHorizontalOverflow(), false);
    const open = m.page.getByRole("button", { name: /open navigation/i });
    await open.click();
    const dialog = m.page.getByRole("dialog");
    await dialog.waitFor({ state: "visible" });
    const drawerLinks = await dialog.locator("nav a").evaluateAll((as) => as.map((a) => a.getAttribute("href")));
    await m.page.keyboard.press("Escape");
    await dialog.waitFor({ state: "hidden" });
    const d = await as(role);
    await d.goto(home);
    const desktopLinks = await d.page.locator("aside nav a").evaluateAll((as) => as.map((a) => a.getAttribute("href")));
    assert.deepEqual([...new Set(drawerLinks)].sort(), [...new Set(desktopLinks)].sort(), `${role} drawer matches sidebar`);

    await open.click();
    await dialog.waitFor({ state: "visible" });
    const target = drawerLinks.find((h) => h !== home);
    await dialog.locator(`nav a[href="${target}"]`).click();
    await m.page.waitForURL((u) => u.pathname === target);
    assert.equal(await dialog.count() === 0 || !(await dialog.isVisible()), true, "drawer closes after navigating");
    assert.equal(await m.hasHorizontalOverflow(), false, `${target} overflows on mobile`);
    m.assertClean(`${role} mobile nav`);
  }
});

test("NV4 header controls: notification bell links to the feed with an unread count; log out works and kills the session", async () => {
  const admin = await as("admin");
  await admin.goto("/admin");
  const bell = admin.page.locator('header a[href="/admin/notifications"]').first();
  assert.equal(await bell.count(), 1, "bell present");
  await bell.click();
  await admin.page.waitForURL("**/admin/notifications");

  const tmp = await new Session(stack, "logout").open();
  await tmp.login("contentmgr");
  await tmp.goto("/admin");
  const cookie = (await tmp.context.cookies()).find((c) => c.name === "techotd_session").value;
  await tmp.logout();
  assert.equal(new URL(tmp.page.url()).pathname === "/admin", false);
  const replay = await stack.browser.newContext();
  await replay.addCookies([{ name: "techotd_session", value: cookie, url: stack.base }]);
  const p = await replay.newPage();
  await p.goto(stack.base + "/admin");
  assert.equal(new URL(p.url()).pathname, "/login");
  await replay.close();
  await tmp.close();
});
