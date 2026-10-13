// Workflows H (jobs/placement), I (email queue, provider unconfigured),
// J (analytics + CSV) and K (AI assistant, provider unconfigured) in real Chrome.
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
const state = {};
const db = (opts) => openDb(stack, opts);
const path = (s) => new URL(s.page.url()).pathname;

before(async () => {
  stack = await startStack({ port: 3251 });
  const admin = await as("admin");
  await admin.goto(`/admin/enrollments/new?student=${stack.data.users.student.id}`);
  await admin.page.selectOption('select[name="course"]', stack.data.course);
  await admin.page.selectOption('select[name="batch"]', stack.data.batch);
  await admin.page.getByRole("button", { name: /enroll student/i }).click();
  await admin.page.waitForURL(/\/admin\/enrollments\/[0-9a-f-]{36}$/);
  state.enrollmentId = new URL(admin.page.url()).pathname.split("/").pop();
});
after(async () => {
  for (const s of sessions.values()) await s.close();
  await stack?.stop();
});

// ---------------------------------------------------------------- H: jobs

test("H1 placement manager drafts a job; invalid input is rejected; students cannot see a draft", async () => {
  const place = await as("placement");
  await place.goto("/admin/jobs/new");
  await place.page.getByRole("button", { name: /create job/i }).click();
  await place.page.waitForTimeout(600);
  assert.match(await bodyText(place.page), /required|title|enter/i);
  assert.equal((() => { const d = db(); const n = d.prepare("SELECT COUNT(*) c FROM jobs").get().c; d.close(); return n; })(), 0);

  await place.page.getByLabel("Job title").fill("Junior React Developer");
  await place.page.getByLabel("Company").fill("Acme Labs");
  await place.page.getByLabel(/Skills/).fill("React, JavaScript, Kubernetes");
  await place.page.getByLabel("Description").fill("Build UI components with React for our product team.");
  await place.page.getByRole("button", { name: /create job/i }).click();
  await place.page.waitForURL(/\/admin\/jobs\/[0-9a-f-]{36}$/);
  state.jobUrl = path(place);
  state.jobId = state.jobUrl.split("/").pop();

  const student = await as("student");
  const r = await student.goto(`/student/jobs/${state.jobId}`);
  await student.page.waitForTimeout(500);
  assert.ok(r.status() === 404 || !/Junior React Developer/.test(await bodyText(student.page)), "draft job hidden from students");
  await student.goto("/student/jobs");
  assert.ok(!/Junior React Developer/.test(await bodyText(student.page)));
});

test("H2 publishing makes it visible to students; job-fit shows matching and missing skills with a caveat", async () => {
  const place = await as("placement");
  await place.goto(state.jobUrl);
  await place.page.getByLabel("Status").selectOption("PUBLISHED");
  await place.page.getByRole("button", { name: /update status/i }).click();
  await place.page.waitForTimeout(1000);

  const student = await as("student");
  await student.goto("/student/jobs");
  assert.match(await bodyText(student.page), /Junior React Developer/);
  await student.goto(`/student/jobs/${state.jobId}`);
  const text = await bodyText(student.page);
  assert.match(text, /How your skills match/i);
  assert.match(text, /not an assessment/i);
  assert.match(text, /Kubernetes/, "missing skill is listed");
  student.assertClean("job page");
});

test("H3 student applies once; a second application is impossible; staff see the application", async () => {
  const student = await as("student");
  await student.goto(`/student/jobs/${state.jobId}`);
  const msg = student.page.locator('textarea[name="coverMessage"]');
  if (await msg.count()) await msg.fill("I would love to join the team.");
  const apply = student.page.getByRole("button", { name: /^apply/i }).first();
  await apply.click();
  await student.page.waitForTimeout(1200);
  let d = db();
  assert.equal(d.prepare("SELECT COUNT(*) c FROM job_applications").get().c, 1);
  d.close();
  await student.goto(`/student/jobs/${state.jobId}`);
  assert.equal(await student.page.getByRole("button", { name: /^apply/i }).count(), 0, "apply control is gone after applying");
  assert.match(await bodyText(student.page), /applied/i);

  const place = await as("placement");
  await place.goto(state.jobUrl);
  assert.match(await bodyText(place.page), /Applications \(1\)/);
  assert.match(await bodyText(place.page), /E2E student/);
});

test("H4 status changes notify the student with generic text; placement needs explicit confirmation", async () => {
  const place = await as("placement");
  await place.goto(state.jobUrl);
  // Move to SHORTLISTED through the real status control inside the application card
  const select = place.page.locator('select[name="status"]').nth(1);
  const options = await select.locator("option").evaluateAll((o) => o.map((x) => x.value));
  assert.ok(options.includes("SHORTLISTED") || options.length > 1, `application statuses: ${options}`);
  await select.selectOption(options.includes("SHORTLISTED") ? "SHORTLISTED" : options[1]);
  await select.locator("xpath=ancestor::form").getByRole("button").first().click();
  await place.page.waitForTimeout(1200);
  let d = db();
  const app = d.prepare("SELECT status, placement_confirmed_at FROM job_applications").get();
  assert.notEqual(app.status, "APPLIED");
  assert.equal(app.placement_confirmed_at, null, "a status change is not a placement");
  const n = d.prepare("SELECT message FROM notifications WHERE user_id = ? ORDER BY created_at DESC").all(stack.data.users.student.id);
  d.close();
  assert.ok(n.length >= 1);
  assert.ok(n.every((r) => !/Acme|Kubernetes|cover|salary/i.test(r.message)));
});

test("H5 a deadline in the past hides the job from students; closing keeps applications", async () => {
  const d = db({ readonly: false });
  d.prepare("UPDATE jobs SET apply_deadline = date('now', '-2 day') WHERE id = ?").run(state.jobId);
  d.close();
  const student = await as("student2");
  await student.goto("/student/jobs");
  assert.ok(!/Junior React Developer/.test(await bodyText(student.page)), "expired job not listed");
  const r = await student.goto(`/student/jobs/${state.jobId}`);
  assert.ok(r.status() === 404 || !/Apply/.test(await bodyText(student.page)), "student without an application cannot open an expired job");
  const place = await as("placement");
  await place.goto(state.jobUrl);
  assert.match(await bodyText(place.page), /Applications \(1\)/);
});

test("H6 counsellor and accountant cannot manage jobs", async () => {
  for (const role of ["counsellor", "accountant"]) {
    const s = await as(role);
    await s.goto(state.jobUrl);
    await s.page.waitForURL((u) => u.pathname !== state.jobUrl, { timeout: 5000 }).catch(() => {});
    assert.notEqual(path(s), state.jobUrl, `${role} refused`);
  }
});

// -------------------------------------------------- I: email queue (unconfigured)

test("I1 with no provider, notifications are in-app only and each email is recorded as SKIPPED, never SENT", async () => {
  const d = db();
  const rows = d.prepare("SELECT status, last_error, COUNT(*) c FROM notification_deliveries GROUP BY status, last_error").all();
  d.close();
  assert.ok(rows.length > 0, "deliveries were recorded");
  for (const r of rows) {
    assert.equal(r.status, "SKIPPED", `unexpected status ${r.status}`);
    assert.equal(r.last_error, "provider_not_configured");
  }
});

test("I2 the delivery dashboard says email isn't configured and honestly reports zero sent; process-queue is a no-op", async () => {
  const admin = await as("admin");
  await admin.goto("/admin/notifications/deliveries");
  const text = await bodyText(admin.page);
  assert.match(text, /Email\s+Not configured\s+No email is being sent/i);
  assert.match(text, /WhatsApp\s+Not available/i, "WhatsApp is never presented as working");
  assert.match(text, /SENT\s+0\s+Accepted by provider/i, "nothing is reported as sent");
  const d = db();
  assert.equal(d.prepare("SELECT COUNT(*) c FROM notification_deliveries WHERE status = 'SENT'").get().c, 0);
  d.close();
  admin.assertClean("deliveries");
});

test("I3 delivery dashboard and processing endpoint are not available to other roles / anonymous callers", async () => {
  const counsellor = await as("counsellor");
  await counsellor.goto("/admin/notifications/deliveries");
  await counsellor.page.waitForURL((u) => u.pathname !== "/admin/notifications/deliveries", { timeout: 5000 }).catch(() => {});
  assert.notEqual(path(counsellor), "/admin/notifications/deliveries");

  const noSecret = await fetch(stack.base + "/api/notifications/process", { method: "POST" });
  assert.equal(noSecret.status, 404, "endpoint doesn't exist without CRON_SECRET configured");
  const wrong = await fetch(stack.base + "/api/notifications/process", { method: "POST", headers: { "x-cron-secret": "guess" } });
  assert.equal(wrong.status, 404);
  const get = await fetch(stack.base + "/api/notifications/process");
  assert.ok([404, 405].includes(get.status));
});

// ----------------------------------------------------------- J: analytics

test("J1 analytics figures match the database; custom range works; invalid ranges fall back with a message", async () => {
  const admin = await as("admin");
  await admin.goto("/admin/analytics?preset=last30");
  const text = await bodyText(admin.page);
  const d = db();
  const regs = d.prepare("SELECT COUNT(*) c FROM users WHERE role = 'STUDENT'").get().c;
  d.close();
  assert.ok(text.includes(String(regs)), "registrations figure appears");
  assert.match(text, /Fees & payments/);
  admin.assertClean("analytics");

  const today = new Date().toISOString().slice(0, 10);
  await admin.goto(`/admin/analytics?preset=custom&from=${today}&to=${today}`);
  assert.match(await bodyText(admin.page), new RegExp(`${today} to ${today}`));

  await admin.goto(`/admin/analytics?preset=custom&from=${today}&to=2020-01-01`);
  assert.match(await bodyText(admin.page), /before|after|invalid|must|Showing the last 30 days/i);
  await admin.goto("/admin/analytics?preset=custom&from=2000-01-01&to=2026-01-01");
  assert.match(await bodyText(admin.page), /366|too long|at most|Showing the last 30 days/i);
  await admin.goto("/admin/analytics?preset=custom&from=not-a-date&to=%3Cscript%3E");
  const t = await bodyText(admin.page);
  assert.ok(!t.includes("<script>"));
  assert.match(t, /Showing the last 30 days|invalid/i);
});

test("J2 role scoping: accountant sees finance only, counsellor sees leads only, placement sees jobs only", async () => {
  const cases = {
    accountant: { has: /Fees & payments/, not: /Leads & enquiries|Jobs & placements|Certificates/ },
    counsellor: { has: /Leads & enquiries/, not: /Fees & payments|Jobs & placements|Enrollments/ },
    placement: { has: /Jobs & placements/, not: /Fees & payments|Leads & enquiries/ },
  };
  for (const [role, rule] of Object.entries(cases)) {
    const s = await as(role);
    await s.goto("/admin/analytics");
    const headings = (await s.page.locator("main h2").allInnerTexts()).join(" | ");
    assert.match(headings, rule.has, `${role} sees own section`);
    assert.doesNotMatch(headings, rule.not, `${role} must not see other sections (${headings})`);
    assert.equal(await s.page.getByRole("link", { name: /download .*csv/i }).count(), 0, `${role} has no export links`);
  }
});

test("J3 CSV export: admins get a BOM-prefixed aggregate CSV; other roles and anonymous are refused", async () => {
  const admin = await as("admin");
  const ok = await admin.context.request.get(stack.base + "/admin/analytics/export?type=summary&preset=last30");
  assert.equal(ok.status(), 200);
  assert.match(ok.headers()["content-type"], /text\/csv/);
  assert.match(ok.headers()["content-disposition"], /attachment; filename=/);
  assert.match(ok.headers()["cache-control"], /no-store/);
  const bytes = await ok.body();
  assert.deepEqual([...bytes.subarray(0, 3)], [0xef, 0xbb, 0xbf], "UTF-8 BOM for spreadsheet compatibility");
  const csv = bytes.toString("utf8");
  assert.ok(!/@e2e\.test|@example\.test|9876543210/.test(csv), "aggregate export contains no personal data");
  assert.ok(csv.split("\n").length <= 1001);

  // real browser download through the link
  await admin.goto("/admin/analytics?preset=last30");
  const [download] = await Promise.all([admin.page.waitForEvent("download"), admin.page.getByRole("link", { name: /download summary/i }).click()]);
  assert.match(download.suggestedFilename(), /\.csv$/);

  for (const role of ["accountant", "counsellor", "placement", "student", "trainer"]) {
    const s = await as(role);
    const r = await s.context.request.get(stack.base + "/admin/analytics/export?type=summary&preset=last30", { maxRedirects: 0 });
    assert.ok([302, 303, 307, 401, 403].includes(r.status()), `${role} got ${r.status()}`);
    assert.ok(!(r.headers()["content-type"] || "").includes("csv"));
  }
  const anon = await fetch(stack.base + "/admin/analytics/export?type=summary", { redirect: "manual" });
  assert.ok([302, 303, 307, 401, 403].includes(anon.status));
  const bad = await admin.context.request.get(stack.base + "/admin/analytics/export?type=users&preset=last30");
  assert.equal(bad.status(), 400, "unknown export type refused");
});

test("J4 the page never prefetches exports (regression: <Link> prefetch ran the report on every view)", async () => {
  const admin = await as("admin");
  const seen = [];
  const onReq = (r) => seen.push(r.url());
  admin.page.on("request", onReq);
  await admin.goto("/admin/analytics");
  await admin.page.waitForTimeout(2500);
  admin.page.off("request", onReq);
  assert.deepEqual(seen.filter((u) => u.includes("/analytics/export")), []);
});

// -------------------------------------------------------------------- K: AI

test("K1 assistant is honest when unconfigured: no fake answers, no provider calls, no usage rows", async () => {
  const student = await as("student");
  await student.goto("/student/assistant");
  const text = await bodyText(student.page);
  assert.match(text, /isn.?t set up|not available|isn.?t available/i);
  assert.ok(!/sk-ant|ANTHROPIC|AI_MODEL/.test(text));
  const ask = student.page.getByRole("button", { name: /^ask/i });
  if (await ask.count()) assert.equal(await ask.first().isDisabled(), true, "ask control disabled while unconfigured");
  const d = db();
  assert.equal(d.prepare("SELECT COUNT(*) c FROM ai_usage").get().c, 0);
  d.close();
});

test("K2 recommendations work from the catalog, are labelled, and untrusted text is rendered inert", async () => {
  const student = await as("student");
  await student.goto("/student/assistant");
  await student.page.locator('textarea[name="interests"], input[name="interests"]').fill("<img src=x onerror=window.__xss=1> React and Node.js web apps");
  await student.page.getByRole("button", { name: /recommend|suggest|find/i }).first().click();
  await student.page.getByText(/Catalog match/i).first().waitFor({ timeout: 10000 });
  assert.match(await bodyText(student.page), /guarantee/i);
  assert.equal(await student.page.evaluate(() => window.__xss), undefined, "script injection did not execute");
  const links = await student.page.locator('main a[href^="/courses/"]').count();
  assert.ok(links >= 1, "recommendations link to real catalog courses");
  student.assertClean("recommendations");
});

test("K3 provider code and secrets are not shipped to the browser", async () => {
  const student = await as("student");
  await student.goto("/student/assistant");
  const scripts = await student.page.locator("script[src]").evaluateAll((s) => s.map((x) => x.getAttribute("src")));
  assert.ok(scripts.length > 0);
  for (const src of scripts) {
    const body = await (await student.context.request.get(new URL(src, stack.base).href)).text();
    assert.ok(!/api\.anthropic\.com|api\.resend\.com|ANTHROPIC_API_KEY|RESEND_API_KEY/.test(body), `${src} contains provider details`);
  }
});

test("K4 only students can use the assistant", async () => {
  for (const role of ["trainer", "admin"]) {
    const s = await as(role);
    await s.goto("/student/assistant");
    await s.page.waitForURL((u) => u.pathname !== "/student/assistant", { timeout: 5000 }).catch(() => {});
    assert.notEqual(path(s), "/student/assistant", `${role} refused`);
  }
});
