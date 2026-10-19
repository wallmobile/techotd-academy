// Admin panel audit, part 2: module behaviour with real data (dashboard
// figures, lists / search / filters / pagination / empty states, forms and
// validation, staff management, error state, responsive pages + screenshots).
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
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
const db = (o) => openDb(stack, o);
const path = (s) => new URL(s.page.url()).pathname;
const SHOTS = process.env.E2E_ARTIFACTS;

before(async () => {
  stack = await startStack({ port: 3281, bulk: true });
  const admin = await as("admin");
  await admin.goto(`/admin/enrollments/new?student=${stack.data.users.student.id}`);
  await admin.page.selectOption('select[name="course"]', stack.data.course);
  await admin.page.selectOption('select[name="batch"]', stack.data.batch);
  await admin.page.getByRole("button", { name: /enroll student/i }).click();
  await admin.page.waitForURL(/\/admin\/enrollments\/[0-9a-f-]{36}$/);
  ids.enrollment = path(admin).split("/").pop();
});
after(async () => {
  for (const s of sessions.values()) await s.close();
  await stack?.stop();
});

const rowsOf = (page) => page.locator("main table tbody tr, main [data-row]").count();

// -------------------------------------------------------------- dashboard

test("M1 dashboard: summary cards, role distribution and recent registrations equal the database", async () => {
  const admin = await as("admin");
  await admin.goto("/admin");
  const text = await bodyText(admin.page);
  const d = db();
  const total = d.prepare("SELECT COUNT(*) c FROM users").get().c;
  const students = d.prepare("SELECT COUNT(*) c FROM users WHERE role='STUDENT'").get().c;
  const trainers = d.prepare("SELECT COUNT(*) c FROM users WHERE role='TRAINER'").get().c;
  const names = d.prepare("SELECT name FROM users").all().map((r) => r.name);
  d.close();
  assert.match(text, new RegExp(`TOTAL USERS ${total}\\b`, "i"));
  assert.match(text, new RegExp(`STUDENTS ${students}\\b`, "i"));
  assert.match(text, new RegExp(`TRAINERS ${trainers}\\b`, "i"));
  const section = text.split("Recent registrations")[1] || "";
  assert.ok(names.some((n) => section.includes(n)), "recent registrations lists real users from the database");
  assert.match(text, /Live figures from the platform database/);
  admin.assertClean("dashboard");
  if (SHOTS) await admin.shot("admin-dashboard-desktop");
});

test("M2 limited roles get a role-appropriate landing page, never a redirect loop or someone else's data", async () => {
  const expectations = { counsellor: /Open Leads/, accountant: /Open Fees/, placement: /Open Jobs/, contentmgr: /No modules available for your role/i };
  for (const [role, re] of Object.entries(expectations)) {
    const s = await as(role);
    await s.goto("/admin");
    assert.equal(path(s), "/admin");
    assert.match(await bodyText(s.page), re, role);
    assert.ok(!/TOTAL USERS/i.test(await bodyText(s.page)), `${role} must not see platform totals`);
  }
});

// ---------------------------------------------------- lists: pagination etc.

test("M3 users list: 20 per page, correct totals, Next/Previous, out-of-range and junk page params are clamped", async () => {
  const admin = await as("admin");
  const d = db();
  const total = d.prepare("SELECT COUNT(*) c FROM users").get().c;
  d.close();
  assert.ok(total > 20);
  await admin.goto("/admin/users");
  assert.match(await bodyText(admin.page), new RegExp(`Showing 1–20 of ${total}`));
  assert.equal(await rowsOf(admin.page), 20);
  await admin.page.getByRole("link", { name: "Next" }).click();
  await admin.page.waitForURL(/page=2/);
  assert.match(await bodyText(admin.page), new RegExp(`Showing 21–${total} of ${total}`));
  assert.equal(await rowsOf(admin.page), total - 20);
  await admin.page.getByRole("link", { name: "Previous" }).click();
  await admin.page.waitForURL((u) => !u.search.includes("page=2"));
  for (const bad of ["99999", "0", "-3", "abc", "1.5", "9".repeat(30)]) {
    await admin.goto(`/admin/users?page=${bad}`);
    const t = await bodyText(admin.page);
    assert.match(t, /Showing \d+–\d+ of \d+|Showing 0–0 of 0/, `page=${bad} renders a valid page`);
    assert.ok(!/NaN|undefined|Infinity/.test(t), `page=${bad}`);
  }
  admin.assertClean("users pagination");
});

test("M4 search, role filter, sort and reset work and survive paging; empty result shows an empty state", async () => {
  const admin = await as("admin");
  await admin.goto("/admin/students");
  await admin.page.getByLabel("Search").fill("Bulk Student 07");
  await admin.page.getByRole("button", { name: "Apply" }).click();
  await admin.page.waitForURL(/q=/);
  assert.equal(await rowsOf(admin.page), 1);
  assert.match(await bodyText(admin.page), /Bulk Student 07/);

  await admin.page.getByRole("link", { name: "Reset" }).click();
  await admin.page.waitForURL((u) => !u.search.includes("q="));
  await admin.page.getByLabel("Search").fill("Bulk Student");
  await admin.page.getByLabel("Sort").selectOption("name");
  await admin.page.getByRole("button", { name: "Apply" }).click();
  await admin.page.waitForURL(/sort=name/);
  const first = await admin.page.locator("main table tbody tr").first().innerText();
  assert.match(first, /Bulk Student 01/);
  await admin.page.getByRole("link", { name: "Next" }).click();
  await admin.page.waitForURL(/page=2/);
  assert.ok(admin.page.url().includes("q=Bulk"), "search preserved while paging");
  assert.ok(admin.page.url().includes("sort=name"), "sort preserved while paging");

  await admin.goto("/admin/students?q=zzzz-no-such-student");
  assert.equal(await rowsOf(admin.page), 0);
  assert.match(await bodyText(admin.page), /no (students|results|matches)|nothing|not found|no .* found/i, "empty state message");
  await admin.goto("/admin/users?role=TRAINER");
  assert.equal(await rowsOf(admin.page), 2);
  await admin.goto("/admin/users?role=NOT_A_ROLE");
  assert.ok(!/error|something went wrong/i.test(await bodyText(admin.page).then((t) => t.slice(0, 400))));
  admin.assertClean("list filters");
});

test("M5 leads list: 25 seeded leads page correctly; status/source/assignment filters narrow results; counsellor sees the queue", async () => {
  const admin = await as("admin");
  await admin.goto("/admin/leads");
  assert.match(await bodyText(admin.page), /Showing 1–20 of 25/);
  await admin.goto("/admin/leads?source=ENQUIRY");
  const d = db();
  const enq = d.prepare("SELECT COUNT(*) c FROM leads WHERE source='ENQUIRY'").get().c;
  d.close();
  assert.match(await bodyText(admin.page), new RegExp(`of ${enq}\\b`));
  await admin.goto("/admin/leads?status=CONVERTED");
  assert.equal(await rowsOf(admin.page), 0);
  assert.ok((await bodyText(admin.page)).length > 100, "empty filtered list still renders the page chrome");
  await admin.goto("/admin/leads?assigned=unassigned");
  assert.match(await bodyText(admin.page), /Showing 1–20 of 25/);

  const c = await as("counsellor");
  await c.goto("/admin/leads");
  assert.match(await bodyText(c.page), /Showing 1–20 of 25/, "unassigned queue visible to a counsellor");
  assert.match(await bodyText(c.page), /assigned to you, plus the unassigned queue/i);
  if (SHOTS) await admin.shot("admin-leads-desktop");
});

test("M6 lead assignment, status change, notes and conversion from the lead page update the list and the database", async () => {
  const admin = await as("admin");
  await admin.goto("/admin/leads?q=Bulk Lead 03");
  await admin.page.getByRole("link", { name: "Bulk Lead 03" }).first().click();
  await admin.page.waitForURL(/\/admin\/leads\/[0-9a-f-]{36}$/);
  const leadId = path(admin).split("/").pop();
  await admin.page.getByLabel("Assigned to").selectOption(stack.data.users.counsellor.id);
  await admin.page.getByRole("button", { name: /save assignment/i }).click();
  await admin.page.waitForTimeout(800);
  await admin.page.getByLabel("Status").selectOption("QUALIFIED");
  await admin.page.getByRole("button", { name: /update status/i }).click();
  await admin.page.waitForTimeout(800);
  await admin.page.getByLabel(/Add an internal note/i).fill("Audit note");
  await admin.page.getByRole("button", { name: /add note/i }).click();
  await admin.page.getByText("Audit note").waitFor();
  let d = db();
  const row = d.prepare("SELECT status, assigned_to FROM leads WHERE id = ?").get(leadId);
  d.close();
  assert.deepEqual({ ...row }, { status: "QUALIFIED", assigned_to: stack.data.users.counsellor.id });

  await admin.page.getByLabel(/Temporary password/i).fill("Audit-Passw0rd-1");
  await admin.page.getByRole("button", { name: /convert to student/i }).click();
  for (let i = 0; i < 40; i += 1) {
    const dd = db();
    const st = dd.prepare("SELECT status FROM leads WHERE id = ?").get(leadId).status;
    dd.close();
    if (st === "CONVERTED") break;
    await admin.page.waitForTimeout(250);
  }
  d = db();
  const conv = d.prepare("SELECT status, converted_user_id FROM leads WHERE id = ?").get(leadId);
  assert.equal(conv.status, "CONVERTED");
  assert.ok(conv.converted_user_id);
  assert.equal(d.prepare("SELECT role FROM users WHERE id = ?").get(conv.converted_user_id).role, "STUDENT");
  d.close();
  await admin.goto("/admin/leads?status=CONVERTED");
  assert.equal(await rowsOf(admin.page), 1);
});

test("M7 enrollments, fees, jobs, certificates lists render fixtures from the DB with working detail links; empty modules show empty states", async () => {
  const admin = await as("admin");
  await admin.goto("/admin/enrollments");
  assert.match(await bodyText(admin.page), /E2E student/);
  await admin.page.locator('main a[href^="/admin/enrollments/"]:not([href$="/new"])').first().click();
  await admin.page.waitForURL(/\/admin\/enrollments\/[0-9a-f-]{36}$/);
  assert.match(await bodyText(admin.page), /Change status/);

  for (const [route, re] of [
    ["/admin/fees", /no fees|nothing|get started|assign/i],
    ["/admin/jobs", /no jobs|nothing|post|create/i],
    ["/admin/certificates", /no certificates|nothing|issue/i],
  ]) {
    await admin.goto(route);
    const t = await bodyText(admin.page);
    assert.match(t, re, `${route} empty state`);
    assert.ok(!/NaN|undefined/.test(t), route);
  }
  admin.assertClean("module lists");
});

// ------------------------------------------------------------------- forms

test("M8 create trainer: validation messages, duplicate email, success creates exactly a TRAINER that can sign in", async () => {
  const admin = await as("admin");
  await admin.goto("/admin/trainers/new");
  await admin.page.getByRole("button", { name: /create trainer/i }).click();
  await admin.page.waitForTimeout(500);
  assert.match(await bodyText(admin.page), /required|enter|valid|name/i);

  await admin.page.getByLabel("Full name").fill("Audit Trainer");
  await admin.page.getByLabel("Email").fill("not-an-email");
  await admin.page.getByLabel("Temporary password").fill("short");
  await admin.page.getByRole("button", { name: /create trainer/i }).click();
  await admin.page.waitForTimeout(500);
  assert.match(await bodyText(admin.page), /valid email|at least 8|characters/i);

  await admin.page.getByLabel("Email").fill(stack.data.users.trainer.email);
  await admin.page.getByLabel("Temporary password").fill("Trainer-Passw0rd-1");
  await admin.page.getByRole("button", { name: /create trainer/i }).click();
  await admin.page.getByText(/already exists|already in use|already registered/i).first().waitFor();

  // the password is deliberately never echoed back, so it must be re-entered
  assert.equal(await admin.page.getByLabel("Temporary password").inputValue(), "");
  await admin.page.getByLabel("Email").fill("audit.trainer@e2e.test");
  await admin.page.getByLabel("Temporary password").fill("Trainer-Passw0rd-1");
  await admin.page.getByRole("button", { name: /create trainer/i }).click();
  await admin.page.waitForURL(/\/admin\/trainers\/[0-9a-f-]{36}$/, { timeout: 10000 });
  const d = db();
  const u = d.prepare("SELECT role, status FROM users WHERE email = 'audit.trainer@e2e.test'").get();
  d.close();
  assert.deepEqual({ ...u }, { role: "TRAINER", status: "ACTIVE" });

  // assign a batch from the trainer page; the same batch twice is harmless
  await admin.page.getByLabel("Batch").selectOption(stack.data.batch);
  await admin.page.getByRole("button", { name: /assign batch/i }).click();
  await admin.page.getByText(/Live Online/).first().waitFor();
  const d2 = db();
  assert.equal(d2.prepare("SELECT COUNT(*) c FROM trainer_batch_assignments WHERE batch_id = ? AND trainer_user_id = (SELECT id FROM users WHERE email = 'audit.trainer@e2e.test')").get(stack.data.batch).c, 1);
  d2.close();

  const fresh = await new Session(stack, "newtrainer").open();
  try {
    await fresh.loginRaw("audit.trainer@e2e.test", "Trainer-Passw0rd-1");
    await fresh.page.waitForURL((u) => u.pathname.startsWith("/trainer"));
  } finally {
    await fresh.close();
  }
});

test("M9 user status: an ADMIN cannot deactivate admin accounts; the last active SUPER_ADMIN cannot be deactivated; students can be toggled", async () => {
  const admin = await as("admin");
  await admin.goto(`/admin/users/${stack.data.users.superadmin.id}`);
  assert.equal(await admin.page.getByRole("button", { name: /deactivate/i }).count(), 0, "no control on a super admin");
  await admin.goto(`/admin/users/${stack.data.users.admin.id}`);
  assert.equal(await admin.page.getByRole("button", { name: /deactivate/i }).count(), 0, "no control on own account");

  const sa = await as("superadmin");
  await sa.goto(`/admin/users/${stack.data.users.superadmin.id}`);
  assert.equal(await sa.page.getByRole("button", { name: /deactivate/i }).count(), 0, "nobody deactivates themself");

  await sa.goto(`/admin/users/${stack.data.users.student2.id}`);
  await sa.page.getByRole("button", { name: /deactivate account/i }).click();
  await sa.page.getByText(/status set to (INACTIVE|SUSPENDED)/i).waitFor();
  await sa.page.getByRole("button", { name: /reactivate|activate/i }).click();
  await sa.page.getByText(/status set to ACTIVE/i).waitFor();
});

test("M10 super-admin console: staff list, create staff (validation, duplicate, role allow-list), created account signs in to /admin", async () => {
  const sa = await as("superadmin");
  await sa.goto("/super-admin");
  assert.match(await bodyText(sa.page), /Super Admin Console/);
  const d0 = db();
  const staffCount = d0.prepare("SELECT COUNT(*) c FROM users WHERE role NOT IN ('STUDENT','TRAINER')").get().c;
  d0.close();
  assert.match(await bodyText(sa.page), new RegExp(`STAFF ACCOUNTS ${staffCount}\\b`, "i"));

  await sa.goto("/super-admin/staff");
  assert.match(await bodyText(sa.page), /superadmin@e2e\.test/);
  await sa.page.getByLabel("Role").selectOption("COUNSELLOR");
  await sa.page.getByRole("button", { name: "Apply" }).click();
  await sa.page.waitForURL(/role=COUNSELLOR/);
  assert.equal(await rowsOf(sa.page), 1);

  await sa.goto("/super-admin/staff/new");
  await sa.page.getByRole("button", { name: /create account/i }).click();
  await sa.page.waitForTimeout(500);
  assert.match(await bodyText(sa.page), /required|choose a role|enter|name/i);
  await sa.page.getByLabel("Full name").fill("Audit Accountant");
  await sa.page.getByLabel("Email").fill(stack.data.users.accountant.email);
  await sa.page.getByLabel("Role").selectOption("ACCOUNTANT");
  await sa.page.getByLabel("Temporary password").fill("Account-Passw0rd-1");
  await sa.page.getByRole("button", { name: /create account/i }).click();
  await sa.page.getByText(/already exists|already in use|already registered/i).first().waitFor();

  assert.equal(await sa.page.getByLabel("Role").inputValue(), "ACCOUNTANT", "role kept after the error");
  assert.equal(await sa.page.getByLabel("Temporary password").inputValue(), "", "password is never echoed back");
  await sa.page.getByLabel("Email").fill("audit.accountant@e2e.test");
  await sa.page.getByLabel("Temporary password").fill("Account-Passw0rd-1");
  await sa.page.getByRole("button", { name: /create account/i }).click();
  // a successful create redirects to the new user's page
  await sa.page.waitForURL(/\/admin\/users\/[0-9a-f-]{36}$/, { timeout: 10000 });
  const d = db();
  const u = d.prepare("SELECT role, status FROM users WHERE email = 'audit.accountant@e2e.test'").get();
  d.close();
  assert.deepEqual({ ...u }, { role: "ACCOUNTANT", status: "ACTIVE" });

  const fresh = await new Session(stack, "newstaff").open();
  try {
    await fresh.loginRaw("audit.accountant@e2e.test", "Account-Passw0rd-1");
    await fresh.page.waitForURL((u) => u.pathname === "/admin");
    await fresh.page.getByText("Open Fees").first().waitFor({ timeout: 10000 });
  } finally {
    await fresh.close();
  }
  if (SHOTS) await sa.shot("super-admin-staff-desktop");
});

test("M11 privilege escalation is impossible: a forged role=SUPER_ADMIN is refused, and an ADMIN replaying the staff-create action is refused", async () => {
  const sa = await as("superadmin");
  await sa.goto("/super-admin/staff/new");
  const hidden = await sa.page.locator("main form").first().evaluate((f) => {
    const o = {};
    f.querySelectorAll("input[type=hidden]").forEach((i) => (o[i.name] = i.value));
    return o;
  });
  const fields = (extra) => ({ ...hidden, name: "Forged Admin", email: extra.email, phone: "", password: "Forged-Passw0rd-1", role: extra.role });
  const post = (session, extra) =>
    session.context.request.post(stack.base + "/super-admin/staff/new", { multipart: fields(extra), headers: { Origin: stack.base }, maxRedirects: 0 });

  await post(sa, { email: "forged.super@e2e.test", role: "SUPER_ADMIN" });
  await post(sa, { email: "forged.trainer@e2e.test", role: "TRAINER" });
  await post(sa, { email: "forged.student@e2e.test", role: "STUDENT" });
  const admin = await as("admin");
  await post(admin, { email: "forged.byadmin@e2e.test", role: "ADMIN" });
  const d = db();
  for (const e of ["forged.super", "forged.trainer", "forged.student", "forged.byadmin"]) {
    assert.equal(d.prepare("SELECT COUNT(*) c FROM users WHERE email = ?").get(`${e}@e2e.test`).c, 0, `${e} must not exist`);
  }
  assert.equal(d.prepare("SELECT COUNT(*) c FROM users WHERE role = 'SUPER_ADMIN'").get().c, 1);
  d.close();
});

test("M12 roles & access page documents every role and matches the real routing", async () => {
  const admin = await as("admin");
  await admin.goto("/admin/roles");
  const t = await bodyText(admin.page);
  for (const role of ["Super Admin", "Admin", "Counsellor", "Accountant", "Placement Manager", "Content Manager", "Trainer", "Student"]) {
    assert.ok(t.includes(role), `role ${role} is listed`);
  }
  assert.match(t, /\/super-admin/);
});

test("M13 'Soon' modules are inert: Content and Settings are not links and their URLs are real 404s; Courses and Batches are real modules", async () => {
  const admin = await as("admin");
  await admin.goto("/admin");
  for (const label of ["Content", "Settings"]) {
    const link = admin.page.locator("aside nav a", { hasText: new RegExp(`^${label}`) });
    assert.equal(await link.count(), 0, `${label} must not be a link`);
  }
  for (const p of ["/admin/content", "/admin/settings"]) {
    const r = await admin.goto(p);
    assert.equal(r.status(), 404, p);
  }
  for (const label of ["Courses", "Batches"]) {
    assert.equal(await admin.page.locator("aside nav a", { hasText: new RegExp(`^${label}`) }).count(), 0, "not on the 404 page's nav yet");
  }
  await admin.goto("/admin");
  for (const href of ["/admin/courses", "/admin/batches"]) assert.equal(await admin.page.locator(`aside nav a[href="${href}"]`).count(), 1, href);
  for (const p of ["/admin/courses", "/admin/batches"]) assert.equal((await admin.goto(p)).status(), 200, p);
});

// ------------------------------------------------------ error + responsive

test("M14 mobile layout: every list, detail and form page fits 390px without overflow or console errors", async () => {
  const m = await as("superadmin", { viewport: VIEWPORTS.mobile });
  const d = db();
  const leadId = d.prepare("SELECT id FROM leads LIMIT 1").get().id;
  d.close();
  const routes = [
    "/super-admin", "/super-admin/staff", "/super-admin/staff/new",
    "/admin", "/admin/users", `/admin/users/${stack.data.users.student.id}`, "/admin/students", `/admin/students/${stack.data.users.student.id}`,
    "/admin/trainers", "/admin/trainers/new", `/admin/trainers/${stack.data.users.trainer.id}`, "/admin/courses", "/admin/batches",
    "/admin/leads", `/admin/leads/${leadId}`, "/admin/enrollments", "/admin/enrollments/new", `/admin/enrollments/${ids.enrollment}`,
    "/admin/fees", "/admin/fees/new", "/admin/certificates", "/admin/certificates/new", "/admin/jobs", "/admin/jobs/new",
    "/admin/analytics", "/admin/notifications", "/admin/notifications/deliveries", "/admin/roles",
  ];
  const bad = [];
  for (const r of routes) {
    await m.goto(r);
    if (await m.hasHorizontalOverflow()) bad.push(`${r} overflows`);
    if (SHOTS && ["/admin", "/admin/leads", "/admin/users", "/admin/analytics", "/super-admin/staff/new"].includes(r)) await m.shot(`mobile${r.replace(/\//g, "-")}`);
  }
  assert.deepEqual(bad, []);
  m.assertClean("mobile admin pages");
});

test("M15 error state: a failing query shows the friendly error page (no stack, no SQL), other pages keep working, retry recovers", async () => {
  const admin = await as("admin");
  const d = db({ readonly: false });
  d.exec("ALTER TABLE leads RENAME TO leads_hidden");
  try {
    const r = await admin.goto("/admin/leads");
    const t = await bodyText(admin.page);
    assert.ok(r.status() >= 500 || /something went wrong|try again|error/i.test(t), "an error state is shown");
    assert.ok(!/no such table|SQLITE|leads_hidden|at \w+ \(|\.js:\d+/.test(t), "no internals leaked");
    assert.ok(await admin.page.getByRole("link", { name: /go to dashboard/i }).count() + (await admin.page.getByRole("button", { name: /try again/i }).count()) > 0, "recovery controls offered");
    if (SHOTS) await admin.shot("admin-error-state");
    await admin.goto("/admin/users");
    assert.match(await bodyText(admin.page), /Showing/, "unrelated pages unaffected");
  } finally {
    d.exec("ALTER TABLE leads_hidden RENAME TO leads");
    d.close();
  }
  await admin.goto("/admin/leads");
  assert.match(await bodyText(admin.page), /Showing 1–20/);
});

test("M16 the admin pages define a loading state and metadata keeps them out of search engines", async () => {
  const fs = await import("node:fs");
  const root = new URL("../src/app/", import.meta.url);
  for (const group of ["(admin)", "(super-admin)"]) {
    assert.ok(fs.existsSync(new URL(`${group}/loading.jsx`, root)), `${group} has loading.jsx`);
    assert.ok(fs.existsSync(new URL(`${group}/error.jsx`, root)), `${group} has error.jsx`);
  }
  const admin = await as("admin");
  for (const p of ["/admin", "/admin/users", "/admin/leads", "/admin/fees"]) {
    await admin.goto(p);
    const robots = await admin.page.locator('meta[name="robots"]').getAttribute("content");
    assert.match(robots || "", /noindex/, p);
  }
  const sa = await as("superadmin");
  await sa.goto("/super-admin");
  assert.match((await sa.page.locator('meta[name="robots"]').getAttribute("content")) || "", /noindex/);
});

// ------------------------------------------------- forms keep user input

test("M17 after a validation error every admin form keeps what the user typed/selected (passwords excepted)", async () => {
  const admin = await as("admin");
  const lost = [];
  const check = async (what, expectations) => {
    for (const [label, expected, kind] of expectations) {
      const el = admin.page.getByLabel(label, { exact: true });
      const got = kind === "select" ? await el.inputValue() : await el.inputValue();
      if (got !== expected) lost.push(`${what}: "${label}" was "${expected}" now "${got}"`);
    }
  };

  // Assign fee: invalid amount
  await admin.goto(`/admin/fees/new?enrollment=${ids.enrollment}`);
  await admin.page.getByLabel("Total fee").fill("abc");
  await admin.page.getByLabel(/Discount/).fill("10");
  await admin.page.getByLabel(/Internal note/).fill("keep me");
  await admin.page.getByRole("button", { name: /assign fee/i }).click();
  await admin.page.waitForTimeout(900);
  await check("assign fee", [["Total fee", "abc"], ["Discount (optional)", "10"], ["Internal note (optional)", "keep me"]]);

  // Create job: missing description, non-default selects
  await admin.goto("/admin/jobs/new");
  await admin.page.getByLabel("Job title").fill("Keep Title");
  await admin.page.getByLabel("Company").fill("Keep Co");
  await admin.page.getByLabel("Employment type").selectOption("INTERNSHIP");
  await admin.page.getByLabel("Work mode").selectOption("REMOTE");
  await admin.page.getByRole("button", { name: /create job/i }).click();
  await admin.page.waitForTimeout(900);
  await check("create job", [["Job title", "Keep Title"], ["Company", "Keep Co"], ["Employment type", "INTERNSHIP", "select"], ["Work mode", "REMOTE", "select"]]);

  // Create trainer: bad email
  await admin.goto("/admin/trainers/new");
  await admin.page.getByLabel("Full name").fill("Keep Name");
  await admin.page.getByLabel("Email").fill("bad-email");
  await admin.page.getByRole("button", { name: /create trainer/i }).click();
  await admin.page.waitForTimeout(900);
  await check("create trainer", [["Full name", "Keep Name"], ["Email", "bad-email"]]);

  // Create staff (super admin): duplicate email
  const sa = await as("superadmin");
  await sa.goto("/super-admin/staff/new");
  await sa.page.getByLabel("Full name").fill("Keep Staff");
  await sa.page.getByLabel("Email").fill(stack.data.users.accountant.email);
  await sa.page.getByLabel("Role").selectOption("COUNSELLOR");
  await sa.page.getByLabel("Temporary password").fill("Keep-Passw0rd-1");
  await sa.page.getByRole("button", { name: /create account/i }).click();
  await sa.page.getByText(/already exists/i).first().waitFor();
  for (const [label, expected] of [["Full name", "Keep Staff"], ["Email", stack.data.users.accountant.email], ["Role", "COUNSELLOR"]]) {
    const got = await sa.page.getByLabel(label, { exact: true }).inputValue();
    if (got !== expected) lost.push(`create staff: "${label}" was "${expected}" now "${got}"`);
  }
  assert.deepEqual(lost, []);
});
