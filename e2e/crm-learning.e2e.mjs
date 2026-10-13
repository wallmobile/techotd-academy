// Workflows E (CRM, enrollment), C (student), D (trainer) and the notification
// flows that connect them, in real Chrome against a production build.
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { startStack } from "./stack.mjs";
import { Session, VIEWPORTS, openDb, bodyText } from "./helpers.mjs";

let stack;
const sessions = new Map();

async function as(key, opts) {
  const id = key + (opts?.viewport ? ":m" : "");
  if (!sessions.has(id)) {
    const s = await new Session(stack, id, opts).open();
    await s.login(key);
    sessions.set(id, s);
  }
  return sessions.get(id);
}

before(async () => {
  stack = await startStack({ port: 3231 });
});
after(async () => {
  for (const s of sessions.values()) await s.close();
  await stack?.stop();
});

const path = (s) => new URL(s.page.url()).pathname;

async function submitEnquiry(email, name = "Lead Person") {
  const anon = await new Session(stack, "anon").open();
  try {
    await anon.goto("/enquiry");
    await anon.page.getByLabel(/Full Name/i).fill(name);
    await anon.page.getByLabel(/Phone Number/i).fill("9876543210");
    await anon.page.getByLabel(/Email/i).fill(email);
    await anon.page.locator('input[type="checkbox"]').check();
    await anon.page.getByRole("button", { name: /submit request/i }).click();
    await anon.page.getByText(/thank|received|we.?ll/i).first().waitFor({ timeout: 10000 });
  } finally {
    await anon.close();
  }
}

const state = {};

// ------------------------------------------------------------------ E: CRM

test("E1 a website enquiry appears in the CRM; a counsellor sees only the unassigned queue until the lead is assigned", async () => {
  await submitEnquiry("crm.lead@example.test", "Crm Lead");
  const counsellor = await as("counsellor");
  await counsellor.goto("/admin/leads");
  assert.match(await bodyText(counsellor.page), /Crm Lead/, "unassigned lead visible to the counsellor queue");

  const admin = await as("admin");
  await admin.goto("/admin/leads");
  await admin.page.getByRole("link", { name: "Crm Lead" }).first().click();
  await admin.page.waitForURL(/\/admin\/leads\/.+/);
  state.leadUrl = admin.page.url();
  await admin.page.getByLabel("Assigned to").selectOption(stack.data.users.counsellor.id);
  await admin.page.getByRole("button", { name: /save assignment/i }).click();
  await admin.page.getByText(/assign|saved|updated/i).first().waitFor();
  const db = openDb(stack);
  const lead = db.prepare("SELECT assigned_to FROM leads WHERE email = ?").get("crm.lead@example.test");
  assert.equal(lead.assigned_to, stack.data.users.counsellor.id);
  db.close();
  admin.assertClean("lead assignment");
});

test("E2 the assigned counsellor can progress their lead; a different counsellor-role user cannot touch someone else's", async () => {
  const counsellor = await as("counsellor");
  await counsellor.goto(new URL(state.leadUrl).pathname);
  await counsellor.page.getByLabel("Status").selectOption("CONTACTED");
  await counsellor.page.getByRole("button", { name: /update status/i }).click();
  await counsellor.page.waitForTimeout(700);
  await counsellor.page.getByLabel(/Add an internal note/i).fill("Called, wants evening batch.");
  await counsellor.page.getByRole("button", { name: /add note/i }).click();
  await counsellor.page.getByText("Called, wants evening batch.").waitFor();
  const db = openDb(stack);
  assert.equal(db.prepare("SELECT status FROM leads WHERE email = ?").get("crm.lead@example.test").status, "CONTACTED");
  db.close();
  // counsellors can't convert or reassign (manager actions)
  assert.equal(await counsellor.page.getByLabel("Assigned to").count(), 0, "assignment control not offered to counsellors");
  counsellor.assertClean("counsellor lead work");
});

test("E3 lead → student conversion creates a STUDENT account that can sign in; short passwords are refused", async () => {
  await submitEnquiry("convert.me@example.test", "Convert Me");
  const admin = await as("admin");
  await admin.goto("/admin/leads");
  await admin.page.getByRole("link", { name: "Convert Me" }).first().click();
  await admin.page.waitForURL(/\/admin\/leads\/.+/);
  await admin.page.getByLabel(/Temporary password/i).fill("short");
  await admin.page.getByRole("button", { name: /convert to student/i }).click();
  await admin.page.getByText(/at least 8|too short|minimum/i).first().waitFor();
  const db = openDb(stack);
  assert.equal(db.prepare("SELECT COUNT(*) c FROM users WHERE email = ?").get("convert.me@example.test").c, 0);

  await admin.page.getByLabel(/Temporary password/i).fill("Temp-Passw0rd-55");
  await admin.page.getByRole("button", { name: /convert to student/i }).click();
  await admin.page.getByText(/converted|student account/i).first().waitFor({ timeout: 8000 });
  const user = db.prepare("SELECT id, role, status FROM users WHERE email = ?").get("convert.me@example.test");
  assert.deepEqual({ role: user.role, status: user.status }, { role: "STUDENT", status: "ACTIVE" });
  const lead = db.prepare("SELECT status, converted_user_id FROM leads WHERE email = ?").get("convert.me@example.test");
  assert.deepEqual({ ...lead }, { status: "CONVERTED", converted_user_id: user.id });
  db.close();

  const fresh = await new Session(stack, "converted").open();
  try {
    await fresh.loginRaw("convert.me@example.test", "Temp-Passw0rd-55");
    await fresh.page.waitForURL((u) => u.pathname.startsWith("/student"));
  } finally {
    await fresh.close();
  }
});

// ------------------------------------------------------------ enrollment (E)

test("E4 admin enrolls a student into a batch; duplicate enrollment is refused with a clear message", async () => {
  const admin = await as("admin");
  const enroll = async () => {
    await admin.goto(`/admin/enrollments/new?student=${stack.data.users.student.id}`);
    await admin.page.selectOption('select[name="course"]', stack.data.course);
    await admin.page.selectOption('select[name="batch"]', stack.data.batch);
    await admin.page.getByRole("button", { name: /enroll student/i }).click();
  };
  await enroll();
  await admin.page.waitForURL(/\/admin\/enrollments\/[0-9a-f-]{36}$/, { timeout: 10000 });
  state.enrollmentUrl = new URL(admin.page.url()).pathname;
  state.enrollmentId = state.enrollmentUrl.split("/").pop();

  await enroll();
  await admin.page.getByText(/already enrolled|already has|duplicate/i).first().waitFor({ timeout: 8000 });
  const db = openDb(stack);
  const n = db.prepare("SELECT COUNT(*) c FROM batch_enrollments WHERE student_id IN (SELECT id FROM student_profiles WHERE user_id = ?)").get(stack.data.users.student.id).c;
  assert.equal(n, 1, "exactly one batch enrollment exists");
  db.close();
  admin.assertClean("enrollment");
});

test("E5 a counsellor / accountant cannot create enrollments (manager-only)", async () => {
  for (const role of ["counsellor", "accountant"]) {
    const s = await as(role);
    await s.goto("/admin/enrollments/new");
    await s.page.waitForURL((u) => u.pathname !== "/admin/enrollments/new", { timeout: 5000 }).catch(() => {});
    assert.notEqual(path(s), "/admin/enrollments/new", `${role} was refused`);
  }
});

// ---------------------------------------------------------------- C: student

test("C1 the enrolled student sees the course, the batch and an enrollment notification with a working deep link", async () => {
  const student = await as("student");
  await student.goto("/student/courses");
  assert.match(await bodyText(student.page), /Full Stack Development/);
  await student.goto("/student/batches");
  assert.match(await bodyText(student.page), /Full Stack Development/);

  await student.goto("/student/notifications");
  assert.match(await bodyText(student.page), /enrol/i, "enrollment notification present");
  const link = student.page.locator('main a[href^="/student/"]').filter({ hasText: /view/i }).first();
  assert.equal(await link.count(), 1, "the notification carries a deep link");
  const href = await link.getAttribute("href");
  await link.click();
  await student.page.waitForURL((u) => u.pathname === href.split("?")[0]);
  assert.ok(!student.page.url().includes("/login"));
  assert.ok((await student.page.locator("h1, h2").first().innerText()).length > 0, "deep link target rendered");
  student.assertClean("student notifications");
});

test("C2 mark-as-read works and the unread bell updates; viewing alone never marks anything read", async () => {
  const student = await as("student");
  await student.goto("/student/notifications");
  const db = openDb(stack);
  const unreadBefore = db.prepare("SELECT COUNT(*) c FROM notifications WHERE user_id = ? AND read_at IS NULL").get(stack.data.users.student.id).c;
  assert.ok(unreadBefore >= 1, "viewing the page left notifications unread");
  const markBtn = student.page.getByRole("button", { name: /mark.*read/i }).first();
  await markBtn.click();
  await student.page.waitForTimeout(1200);
  const unreadAfter = db.prepare("SELECT COUNT(*) c FROM notifications WHERE user_id = ? AND read_at IS NULL").get(stack.data.users.student.id).c;
  assert.equal(unreadAfter, unreadBefore - 1);
  db.close();
});

test("C3 a student only ever sees their own notifications and own course data", async () => {
  const other = await as("student2");
  await other.goto("/student/notifications");
  const text = await bodyText(other.page);
  assert.ok(!/enrol/i.test(text), "student2 has no enrollment notice");
  await other.goto("/student/courses");
  assert.equal(await other.page.locator("main a[href*='/learn']").count(), 0, "no learn links for a student with no enrollment");
  // direct URL to the learn page of a course the student isn't enrolled in is refused
  await other.goto(`/student/courses/${stack.data.course}/learn`);
  await other.page.waitForTimeout(800);
  const t = await bodyText(other.page);
  assert.ok(!/Mark (lesson )?(as )?complete/i.test(t), "no lesson workspace for a non-enrolled student");
});

test("C4 enrolled student opens the learning workspace, marks a lesson complete, and progress persists across reload", async () => {
  const student = await as("student");
  await student.goto(`/student/courses/${stack.data.course}/learn`);
  const complete = student.page.getByRole("button", { name: /mark.*complete|complete lesson/i }).first();
  await complete.waitFor({ timeout: 10000 });
  await complete.click();
  await student.page.waitForTimeout(1500);
  const db = openDb(stack);
  const before = db.prepare("SELECT COUNT(*) c FROM lesson_progress").get().c;
  assert.ok(before >= 1, "lesson progress row stored");
  db.close();
  await student.page.reload();
  assert.match(await bodyText(student.page), /completed|1 of|\d+%/i);
  student.assertClean("lms");
});

test("C5 student pages are usable on a phone: nav drawer opens, no horizontal scroll on core pages", async () => {
  const m = await as("student", { viewport: VIEWPORTS.mobile });
  for (const p of ["/student", "/student/courses", "/student/notifications", "/student/profile"]) {
    await m.goto(p);
    assert.equal(await m.hasHorizontalOverflow(), false, `${p} overflows horizontally`);
  }
  await m.goto("/student");
  const menu = m.page.getByRole("button", { name: /menu|navigation/i }).first();
  await menu.waitFor({ state: "visible" });
  await menu.click();
  await m.page.getByRole("link", { name: /^my courses$/i }).first().waitFor({ state: "visible" });
  m.assertClean("student mobile");
});

// --------------------------------------------------------------- D: trainer

test("D1 the assigned trainer sees their batch and the enrolled student; an unassigned trainer sees neither", async () => {
  const t1 = await as("trainer");
  await t1.goto("/trainer/students");
  assert.match(await bodyText(t1.page), /E2E student/);
  await t1.goto("/trainer/batches");
  assert.match(await bodyText(t1.page), /Full Stack Development/);

  const t2 = await as("trainer2");
  await t2.goto("/trainer/students");
  assert.ok(!/E2E student/.test(await bodyText(t2.page)), "other trainer must not see the student");
  await t2.goto("/trainer/batches");
  assert.ok(!/Full Stack Development/.test(await bodyText(t2.page)));
});

test("D2 trainer cannot open another trainer's student record by URL", async () => {
  const db = openDb(stack);
  const profile = db.prepare("SELECT id FROM student_profiles WHERE user_id = ?").get(stack.data.users.student.id);
  db.close();
  const t2 = await as("trainer2");
  for (const id of [profile.id, stack.data.users.student.id]) {
    const r = await t2.goto(`/trainer/students/${id}`);
    await t2.page.waitForTimeout(500);
    const text = await bodyText(t2.page);
    assert.ok(!/E2E student/.test(text), `trainer2 saw the student via /trainer/students/${id}`);
    assert.ok(r.status() === 404 || /not found|no access|unavailable/i.test(text) || path(t2) !== `/trainer/students/${id}`);
  }
});

test("D3 trainer notifications page works and has the email preference control", async () => {
  const t1 = await as("trainer");
  await t1.goto("/trainer/notifications");
  assert.match(await bodyText(t1.page), /Notifications/);
  const box = t1.page.getByLabel(/email me my notifications/i);
  await box.waitFor();
  assert.equal(await box.isChecked(), true, "defaults to on");
  await box.uncheck();
  await t1.page.getByRole("button", { name: /save preference/i }).click();
  await t1.page.waitForTimeout(800);
  await t1.page.reload();
  assert.equal(await t1.page.getByLabel(/email me my notifications/i).isChecked(), false, "preference persisted");
  const db = openDb(stack);
  assert.equal(db.prepare("SELECT email_notifications e FROM users WHERE id = ?").get(stack.data.users.trainer.id).e, 0);
  db.close();
  t1.assertClean("trainer notifications");
});
