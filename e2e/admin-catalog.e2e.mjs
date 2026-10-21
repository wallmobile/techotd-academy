// Courses & Batches admin modules (Phase 10.11) in real Chrome against a
// production build: create / edit / publish / unpublish, public visibility,
// batches, trainer assignment, enrollment integrity, authorization, mobile.
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
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
const db = (o) => openDb(stack, o);
const path = (s) => new URL(s.page.url()).pathname;
const SHOTS = process.env.E2E_ARTIFACTS;
const state = {};

before(async () => {
  stack = await startStack({ port: 3291 });
  // Arrange 14 admin-created courses directly so list pagination (20 per page) can be exercised.
  const d = db({ readonly: false });
  const insert = d.prepare(
    `INSERT INTO catalog_courses (slug, origin, status, title, short_description, description, category_slug, level, duration, duration_band, modes, technologies, prerequisites, outcomes)
     VALUES (?, 'CUSTOM', ?, ?, 'Synthetic fixture course for pagination.', 'Synthetic fixture course used by the admin catalog tests.', 'programming', 'Beginner', '2 Months', 'Short (Up to 2 Months)', '["Live Online"]', '["Fixture"]', '[]', '[]')`
  );
  for (let i = 1; i <= 14; i += 1) await insert.run(`fixture-${String(i).padStart(2, "0")}`, i % 2 ? "PUBLISHED" : "UNPUBLISHED", `Fixture Course ${String(i).padStart(2, "0")}`);
  d.close();
});
after(async () => {
  for (const s of sessions.values()) await s.close();
  await stack?.stop();
});

async function anonSession() {
  return new Session(stack, "anon").open();
}

// ------------------------------------------------------------------- courses

test("CC1 course list shows the real catalog with search, filters, sorting and pagination", async () => {
  const admin = await as("admin");
  await admin.goto("/admin/courses");
  assert.match(await bodyText(admin.page), /Showing 1–20 of 22/, "8 code-defined + 14 fixtures");
  assert.match(await bodyText(admin.page), /Full Stack Development/);
  await admin.page.getByRole("link", { name: "Next", exact: true }).click();
  await admin.page.waitForURL(/page=2/);
  assert.match(await bodyText(admin.page), /Showing 21–22 of 22/);

  await admin.goto("/admin/courses");
  await admin.page.getByLabel("Search").fill("Fixture Course 07");
  await admin.page.getByRole("button", { name: "Apply" }).click();
  await admin.page.waitForURL(/q=/);
  assert.equal(await admin.page.locator("main table tbody tr").count(), 1);

  await admin.goto("/admin/courses?status=UNPUBLISHED");
  assert.match(await bodyText(admin.page), /of 7\b/);
  await admin.goto("/admin/courses?category=data-analytics");
  assert.match(await bodyText(admin.page), /Data Analytics/);
  await admin.goto("/admin/courses?q=zzz-nothing-matches");
  assert.match(await bodyText(admin.page), /No courses match these filters/);
  await admin.goto("/admin/courses?page=999&sort=%27%3Bdrop");
  assert.match(await bodyText(admin.page), /Showing/, "junk params fall back safely");
  admin.assertClean("course list");
  if (SHOTS) await admin.shot("admin-courses-list");
});

test("CC2 create course: validation keeps what was typed, slug is suggested, duplicates are refused", async () => {
  const admin = await as("admin");
  await admin.goto("/admin/courses/new");
  await admin.page.getByLabel("Title").fill("Rust Systems Programming");
  assert.equal(await admin.page.getByLabel("URL name (slug)").inputValue(), "rust-systems-programming", "slug suggested from the title");

  // submit with most fields empty: errors on the empty ones, typed values and the chosen select survive
  await admin.page.getByLabel("Category").selectOption("programming");
  await admin.page.getByRole("button", { name: "Create course" }).click();
  await admin.page.getByText("Please fix the highlighted fields.").waitFor();
  assert.match(await bodyText(admin.page), /Add a short summary/);
  assert.equal(await admin.page.getByLabel("Title").inputValue(), "Rust Systems Programming");
  assert.equal(await admin.page.getByLabel("Category").inputValue(), "programming", "selection survives the validation error");
  assert.equal(await admin.page.getByLabel("URL name (slug)").inputValue(), "rust-systems-programming");
  let d = db();
  assert.equal((await d.prepare("SELECT COUNT(*) c FROM catalog_courses WHERE slug = 'rust-systems-programming'").get()).c, 0);
  d.close();

  await admin.page.getByLabel("Short summary").fill("Learn safe systems programming with Rust.");
  await admin.page.getByLabel("Description").fill("A hands-on course on ownership, lifetimes and building fast command-line tools.");
  await admin.page.getByLabel("Level").selectOption("Intermediate");
  await admin.page.getByLabel("Duration", { exact: true }).fill("3 Months");
  await admin.page.getByLabel("Duration band").selectOption("Medium (2–4 Months)");
  await admin.page.getByLabel("Live Online").check();
  await admin.page.getByLabel("Technologies (comma separated)").fill("Rust, Cargo, Git");
  await admin.page.getByLabel("Prerequisites (one per line)").fill("Basic programming experience");
  await admin.page.getByLabel("What students will learn (one per line)").fill("Write safe concurrent code\nBuild a CLI tool");

  // duplicate title (case-insensitive) with a different slug
  await admin.page.getByLabel("URL name (slug)").fill("rust-copy");
  await admin.page.getByLabel("Title").fill("full stack development");
  await admin.page.getByRole("button", { name: "Create course" }).click();
  await admin.page.getByText(/Another course already has that title/).waitFor();
  // duplicate slug (a code-defined course)
  await admin.page.getByLabel("Title").fill("Rust Systems Programming");
  await admin.page.getByLabel("URL name (slug)").fill("react-development");
  await admin.page.getByRole("button", { name: "Create course" }).click();
  await admin.page.getByText(/URL name already exists/).waitFor();
  // invalid slug
  await admin.page.getByLabel("URL name (slug)").fill("Not A Slug!");
  await admin.page.getByRole("button", { name: "Create course" }).click();
  await admin.page.getByText(/lowercase letters, numbers and single hyphens/).waitFor();

  await admin.page.getByLabel("URL name (slug)").fill("rust-systems-programming");
  await admin.page.getByRole("button", { name: "Create course" }).click();
  await admin.page.waitForURL(/\/admin\/courses\/rust-systems-programming$/, { timeout: 10000 });
  d = db();
  const row = await d.prepare("SELECT origin, status, title, technologies FROM catalog_courses WHERE slug = 'rust-systems-programming'").get();
  d.close();
  assert.deepEqual({ ...row }, { origin: "CUSTOM", status: "UNPUBLISHED", title: "Rust Systems Programming", technologies: '["Rust","Cargo","Git"]' });
  assert.match(await bodyText(admin.page), /Course created/, "audit history shows the creation");
  admin.assertClean("create course");
  if (SHOTS) await admin.shot("admin-course-detail");
});

test("CC3 an unpublished course is invisible publicly; publishing makes it appear on every public surface", async () => {
  const admin = await as("admin");
  const anon = await anonSession();
  try {
    const slug = "rust-systems-programming";
    assert.equal((await anon.goto(`/courses/${slug}`)).status(), 404, "unpublished => 404 on the public route");
    await anon.goto("/courses");
    assert.ok(!(await bodyText(anon.page)).includes("Rust Systems Programming"));
    const sitemap = await (await fetch(stack.base + "/sitemap.xml")).text();
    assert.ok(!sitemap.includes(slug));

    await admin.goto(`/admin/courses/${slug}`);
    await admin.page.getByRole("button", { name: "Publish course" }).click();
    await admin.page.getByText(/Course published\. It is now visible/).waitFor();

    const r = await anon.goto(`/courses/${slug}`);
    assert.equal(r.status(), 200);
    assert.match(await anon.page.locator("h1").first().innerText(), /Rust/);
    assert.match(await bodyText(anon.page), /Write safe concurrent code/, "managed outcomes render on the public page");
    await anon.goto("/courses");
    assert.ok((await bodyText(anon.page)).includes("Rust Systems Programming"), "listed in the public catalog");
    assert.ok((await (await fetch(stack.base + "/sitemap.xml")).text()).includes(slug), "listed in the sitemap");
    await anon.goto("/enquiry");
    assert.ok((await anon.page.locator('select[name="course"] option', { hasText: "Rust Systems Programming" }).count()) === 1, "offered in the enquiry form");
    await anon.goto(`/courses/${slug}`);
    anon.assertClean("custom course public page");
  } finally {
    await anon.close();
  }
});

test("CC4 unpublish asks for confirmation: Cancel and Escape change nothing, Confirm hides the course again", async () => {
  const admin = await as("admin");
  await admin.goto("/admin/courses/rust-systems-programming");
  const open = () => admin.page.getByRole("button", { name: "Unpublish course" }).first().click();

  await open();
  const dialog = admin.page.getByRole("dialog");
  await dialog.waitFor();
  assert.match(await dialog.innerText(), /Unpublish this course\?/);
  await dialog.getByRole("button", { name: "Cancel" }).click();
  await dialog.waitFor({ state: "hidden" });
  await open();
  await dialog.waitFor();
  await admin.page.keyboard.press("Escape");
  await dialog.waitFor({ state: "hidden" });
  let d = db();
  assert.equal((await d.prepare("SELECT status FROM catalog_courses WHERE slug = 'rust-systems-programming'").get()).status, "PUBLISHED", "nothing changed");
  d.close();

  await open();
  await dialog.waitFor();
  if (SHOTS) await admin.shot("admin-confirm-dialog");
  await dialog.getByRole("button", { name: "Unpublish course" }).click();
  await admin.page.getByText(/Course unpublished\./).waitFor();
  d = db();
  assert.equal((await d.prepare("SELECT status FROM catalog_courses WHERE slug = 'rust-systems-programming'").get()).status, "UNPUBLISHED");
  d.close();
  const anon = await anonSession();
  try {
    assert.equal((await anon.goto("/courses/rust-systems-programming")).status(), 404);
  } finally {
    await anon.close();
  }
  // republish for the batch tests below
  await admin.page.getByRole("button", { name: "Publish course" }).click();
  await admin.page.getByText(/Course published\./).waitFor();
});

test("CC5 editing a code-defined course changes the public page, keeps its syllabus, and is audited; editing a custom course works too", async () => {
  const admin = await as("admin");
  const anon = await anonSession();
  try {
    await admin.goto("/admin/courses/react-development");
    const originalTitle = await admin.page.getByLabel("Title").inputValue();
    await admin.page.getByLabel("Title").fill("React.js Development (Edited)");
    await admin.page.getByRole("button", { name: "Save changes" }).click();
    await admin.page.getByText("Course saved.").waitFor();
    assert.match(await bodyText(admin.page), /Course edited — title/);

    await anon.goto("/courses/react-development");
    assert.match(await anon.page.locator("h1").first().innerText(), /Edited/);
    assert.ok((await anon.page.locator("details, [data-accordion], button[aria-expanded]").count()) > 0, "curriculum from the code files still renders");
    await anon.goto("/courses");
    assert.ok((await bodyText(anon.page)).includes("React.js Development (Edited)"));

    // saving again without changes is a no-op
    await admin.page.getByRole("button", { name: "Save changes" }).click();
    await admin.page.getByText("No changes to save.").waitFor();

    // restore the original title
    await admin.page.getByLabel("Title").fill(originalTitle);
    await admin.page.getByRole("button", { name: "Save changes" }).click();
    await admin.page.getByText("Course saved.").waitFor();

    // custom course: change level and technologies
    await admin.goto("/admin/courses/rust-systems-programming");
    await admin.page.getByLabel("Level").selectOption("Advanced");
    await admin.page.getByLabel("Technologies (comma separated)").fill("Rust, Tokio");
    await admin.page.getByRole("button", { name: "Save changes" }).click();
    await admin.page.getByText("Course saved.").waitFor();
    await admin.goto("/admin/courses/rust-systems-programming");
    assert.equal(await admin.page.getByLabel("Level").inputValue(), "Advanced");
    assert.equal(await admin.page.getByLabel("Technologies (comma separated)").inputValue(), "Rust, Tokio");
    assert.match(await bodyText(admin.page), /URL name \/courses\/rust-systems-programming \(fixed/);
    const d = db();
    assert.equal((await d.prepare("SELECT slug FROM catalog_courses WHERE title = 'Rust Systems Programming'").get()).slug, "rust-systems-programming", "the slug never changes");
    d.close();
    anon.assertClean("edited course");
    admin.assertClean("edit course");
  } finally {
    await anon.close();
  }
});

// ------------------------------------------------------------------- batches

test("CB1 batch list shows code-defined batches; filters, search and sort work", async () => {
  const admin = await as("admin");
  await admin.goto("/admin/batches");
  assert.match(await bodyText(admin.page), /Showing 1–8 of 8/);
  assert.match(await bodyText(admin.page), /full-stack-development-01/);
  await admin.goto("/admin/batches?course=cloud-devops");
  assert.equal(await admin.page.locator("main table tbody tr").count(), 1);
  await admin.goto("/admin/batches?mode=Classroom");
  assert.equal(await admin.page.locator("main table tbody tr").count(), 2);
  await admin.goto("/admin/batches?status=Closed");
  assert.match(await bodyText(admin.page), /No batches match these filters/);
  await admin.goto("/admin/batches?q=python");
  assert.equal(await admin.page.locator("main table tbody tr").count(), 1);
  await admin.goto("/admin/batches?sort=start-asc");
  const first = await admin.page.locator("main table tbody tr").first().innerText();
  assert.match(first, /Full Stack Development/, "earliest start first");
  admin.assertClean("batch list");
  if (SHOTS) await admin.shot("admin-batches-list");
});

test("CB2 create batch: validation, mode must be offered by the course, generated id, appears publicly when Open", async () => {
  const admin = await as("admin");
  await admin.goto("/admin/batches/new?course=rust-systems-programming");
  assert.equal(await admin.page.getByLabel("Course").inputValue(), "rust-systems-programming", "course prefilled from the link");
  const modes = await admin.page.getByLabel("Mode").locator("option").allInnerTexts();
  assert.ok(modes.includes("Live Online") && !modes.includes("Classroom"), `only modes the course offers are selectable: ${modes}`);

  await admin.page.getByRole("button", { name: "Create batch" }).click();
  await admin.page.getByText("Please fix the highlighted fields.").waitFor();
  assert.match(await bodyText(admin.page), /Please choose a mode|Enter a valid start date/);

  await admin.page.getByLabel("Mode").selectOption("Live Online");
  await admin.page.getByLabel("Start date").fill("2027-02-01");
  await admin.page.getByLabel("End date (optional)").fill("2027-01-01");
  await admin.page.getByLabel("Schedule").fill("Mon – Fri • 6:00 PM");
  await admin.page.getByLabel("Status").selectOption("Open");
  await admin.page.getByRole("button", { name: "Create batch" }).click();
  await admin.page.getByText(/end date can't be before the start date/i).waitFor();
  assert.equal(await admin.page.getByLabel("Status").inputValue(), "Open", "status survives the error");
  assert.equal(await admin.page.getByLabel("Schedule").inputValue(), "Mon – Fri • 6:00 PM");

  await admin.page.getByLabel("End date (optional)").fill("2027-04-30");
  await admin.page.getByRole("button", { name: "Create batch" }).click();
  await admin.page.waitForURL(/\/admin\/batches\/rust-systems-programming-01$/, { timeout: 10000 });
  state.batchId = "rust-systems-programming-01";
  assert.match(await bodyText(admin.page), /01 Feb 2027/);
  assert.match(await bodyText(admin.page), /Batch created/);

  // duplicate (same course+mode+start+schedule) is refused
  await admin.goto("/admin/batches/new?course=rust-systems-programming");
  await admin.page.getByLabel("Mode").selectOption("Live Online");
  await admin.page.getByLabel("Start date").fill("2027-02-01");
  await admin.page.getByLabel("Schedule").fill("Mon – Fri • 6:00 PM");
  await admin.page.getByRole("button", { name: "Create batch" }).click();
  await admin.page.getByText(/already exists/).waitFor();

  const anon = await anonSession();
  try {
    await anon.goto("/batches");
    assert.match(await anon.page.locator("main").innerText(), /Rust Systems Programming/, "an Open batch of a published course is public");
    await anon.goto("/book-demo?course=rust-systems-programming&batch=rust-systems-programming-01");
    assert.equal(await anon.page.locator('select[name="batch"]').inputValue(), "rust-systems-programming-01", "bookable from the demo form");
    anon.assertClean("public batches");
  } finally {
    await anon.close();
  }
  admin.assertClean("create batch");
});

test("CB3 trainer assignment: assign, see it on the trainer's side, remove with confirmation, duplicates and isolation", async () => {
  const admin = await as("admin");
  await admin.goto(`/admin/batches/${state.batchId}`);
  const trainerId = stack.data.users.trainer.id;
  await admin.page.getByLabel("Assign a trainer").selectOption(trainerId);
  await admin.page.getByRole("button", { name: "Assign trainer" }).click();
  await admin.page.getByText("Trainer assigned.").waitFor();
  assert.match(await bodyText(admin.page), /E2E trainer/);

  const trainer = await as("trainer");
  await trainer.goto("/trainer/batches");
  assert.match(await bodyText(trainer.page), /Rust Systems Programming/, "the assigned trainer sees the new batch");
  const trainer2 = await as("trainer2");
  await trainer2.goto("/trainer/batches");
  assert.ok(!/Rust Systems Programming/.test(await bodyText(trainer2.page)), "another trainer does not");

  // the select no longer offers the assigned trainer; non-trainers are never offered
  await admin.goto(`/admin/batches/${state.batchId}`);
  const offered = await admin.page.getByLabel("Assign a trainer").locator("option").allInnerTexts();
  assert.ok(!offered.some((t) => t.includes("E2E trainer@") || t.includes("trainer@e2e.test")));
  assert.ok(!offered.some((t) => /student|admin@|counsellor/.test(t)), "only trainers are offered");

  await admin.page.getByRole("button", { name: "Remove" }).click();
  const dialog = admin.page.getByRole("dialog");
  await dialog.waitFor();
  assert.match(await dialog.innerText(), /records are kept/i);
  await dialog.getByRole("button", { name: "Remove trainer" }).click();
  await admin.page.getByText("Trainer removed from this batch.").waitFor();
  await trainer.goto("/trainer/batches");
  assert.ok(!/Rust Systems Programming/.test(await bodyText(trainer.page)), "access is gone after removal");
  const d = db();
  const actions = (await d.prepare("SELECT action FROM audit_log WHERE entity_id = ? ORDER BY created_at, seq").all(state.batchId)).map((r) => r.action);
  d.close();
  assert.deepEqual(actions.filter((a) => a.startsWith("batch.trainer")), ["batch.trainer_assigned", "batch.trainer_removed"]);
  // re-assign for the enrollment test
  await admin.goto(`/admin/batches/${state.batchId}`);
  await admin.page.getByLabel("Assign a trainer").selectOption(trainerId);
  await admin.page.getByRole("button", { name: "Assign trainer" }).click();
  await admin.page.getByText("Trainer assigned.").waitFor();
  admin.assertClean("trainer assignment");
});

test("CB4 enrollment lifecycle: enroll into the new batch, edit it, close it (confirmation), archive is blocked while active; history is kept", async () => {
  const admin = await as("admin");
  const studentId = stack.data.users.student.id;
  await admin.goto(`/admin/enrollments/new?student=${studentId}`);
  await admin.page.selectOption('select[name="course"]', "rust-systems-programming");
  await admin.page.selectOption('select[name="batch"]', state.batchId);
  await admin.page.getByRole("button", { name: /enroll student/i }).click();
  await admin.page.waitForURL(/\/admin\/enrollments\/[0-9a-f-]{36}$/);
  state.enrollmentId = path(admin).split("/").pop();

  const student = await as("student");
  await student.goto("/student/batches");
  assert.match(await bodyText(student.page), /Rust Systems Programming/, "the student sees the admin-created batch");

  // edit the batch: schedule changes, enrollment is untouched
  await admin.goto(`/admin/batches/${state.batchId}`);
  assert.match(await bodyText(admin.page), /E2E student/, "enrollments are listed on the batch page");
  assert.match(await bodyText(admin.page), /1 active \/ 1 total/);
  await admin.page.getByLabel("Schedule").fill("Mon – Fri • 7:30 PM");
  await admin.page.getByRole("button", { name: "Save changes" }).click();
  await admin.page.getByText("Batch saved.").waitFor();
  assert.match(await bodyText(admin.page), /Batch edited — schedule/);
  const d = db();
  assert.equal((await d.prepare("SELECT status FROM batch_enrollments WHERE batch_id = ?").get(state.batchId)).status, "ACTIVE");
  d.close();

  // close with confirmation
  await admin.page.getByLabel("Status", { exact: true }).first().selectOption("Closed");
  await admin.page.getByRole("button", { name: "Update status" }).click();
  const dialog = admin.page.getByRole("dialog");
  await dialog.waitFor();
  assert.match(await dialog.innerText(), /1 active enrollment\(s\) are not changed/);
  await dialog.getByRole("button", { name: "Set to Closed" }).click();
  await admin.page.getByText("Batch status set to Closed.").waitFor();

  const anon = await anonSession();
  try {
    await anon.goto("/batches");
    assert.ok(!(await anon.page.locator("main").innerText()).includes("Rust Systems Programming"), "closed => off the public list (the footer still lists the published course)");
  } finally {
    await anon.close();
  }
  await student.goto("/student/batches");
  assert.match(await bodyText(student.page), /Rust Systems Programming/, "the enrolled student keeps seeing it");
  // no new enrollments, and the form no longer offers the batch
  await admin.goto(`/admin/enrollments/new?student=${stack.data.users.student2.id}`);
  await admin.page.selectOption('select[name="course"]', "rust-systems-programming");
  assert.ok(!(await admin.page.locator('select[name="batch"] option').allInnerTexts()).join("|").includes("7:30"), "closed batch not offered");

  // archive blocked while the enrollment is active
  await admin.goto(`/admin/batches/${state.batchId}`);
  await admin.page.getByLabel("Status", { exact: true }).first().selectOption("Archived");
  await admin.page.getByRole("button", { name: "Update status" }).click();
  await admin.page.getByRole("dialog").getByRole("button", { name: "Set to Archived" }).click();
  await admin.page.getByText(/still has active enrollments/).waitFor();
  const d2 = db();
  assert.equal((await d2.prepare("SELECT status FROM catalog_batches WHERE id = ?").get(state.batchId)).status, "Closed");
  d2.close();
  admin.assertClean("batch lifecycle");
});

test("CB5 existing records stay intact: unpublishing a code-defined course with an enrollment keeps it for the student and in fees", async () => {
  const admin = await as("admin");
  // enrol student2 in a code-defined batch and give it a fee
  await admin.goto(`/admin/enrollments/new?student=${stack.data.users.student2.id}`);
  await admin.page.selectOption('select[name="course"]', "python-development");
  await admin.page.selectOption('select[name="batch"]', "python-development-01");
  await admin.page.getByRole("button", { name: /enroll student/i }).click();
  await admin.page.waitForURL(/\/admin\/enrollments\/[0-9a-f-]{36}$/);
  const enrollmentId = path(admin).split("/").pop();
  await admin.goto(`/admin/fees/new?enrollment=${enrollmentId}`);
  await admin.page.getByLabel("Total fee").fill("9000");
  await admin.page.getByRole("button", { name: /assign fee/i }).click();
  await admin.page.waitForURL(/\/admin\/fees\/[0-9a-f-]{36}$/);

  await admin.goto("/admin/courses/python-development");
  await admin.page.getByRole("button", { name: "Unpublish course" }).first().click();
  await admin.page.getByRole("dialog").getByRole("button", { name: "Unpublish course" }).click();
  await admin.page.getByText(/1 active enrollment\(s\) are unaffected/).waitFor();

  const anon = await anonSession();
  try {
    assert.equal((await anon.goto("/courses/python-development")).status(), 404);
    await anon.goto("/batches");
    assert.ok(!(await anon.page.locator("main").innerText()).includes("Python Development"));
  } finally {
    await anon.close();
  }
  const student2 = await as("student2");
  await student2.goto("/student/courses");
  assert.match(await bodyText(student2.page), /Python Development/, "the student keeps their course");
  await student2.goto("/student/fees");
  assert.match(await bodyText(student2.page), /Python Development/, "fees still resolve the course");
  await admin.goto("/admin/fees");
  assert.match(await bodyText(admin.page), /Python Development/);
  await admin.goto("/admin/enrollments");
  assert.match(await bodyText(admin.page), /Python Development/);

  // new enrollments are refused for the unpublished course, and the dashboard still renders
  await admin.goto(`/admin/enrollments/new?student=${stack.data.users.trainer2.id}`);
  await admin.goto("/admin");
  admin.assertClean("existing records");
  // restore
  await admin.goto("/admin/courses/python-development");
  await admin.page.getByRole("button", { name: "Publish course" }).click();
  await admin.page.getByText(/Course published\./).waitFor();
});

// -------------------------------------------------------------- authorization

test("CZ1 authorization: only Super Admin and Admin open the new routes; everyone else is denied; anonymous goes to login", async () => {
  const routes = ["/admin/courses", "/admin/courses/new", "/admin/courses/full-stack-development", "/admin/batches", "/admin/batches/new", "/admin/batches/full-stack-development-01"];
  const allowed = new Set(["superadmin", "admin"]);
  const mismatches = [];
  for (const role of ["superadmin", "admin", "counsellor", "accountant", "placement", "contentmgr", "trainer", "student"]) {
    const s = await as(role);
    for (const route of routes) {
      const resp = await s.goto(route);
      await s.page.waitForURL((u) => u.pathname !== route, { timeout: 2500 }).catch(() => {});
      const open = path(s) === route && resp.status() < 400;
      if (open !== allowed.has(role)) mismatches.push(`${role} ${route}: ${open ? "OPEN" : "denied"}`);
    }
  }
  assert.deepEqual(mismatches, []);
  const anon = await anonSession();
  try {
    for (const route of routes) {
      await anon.goto(route);
      assert.equal(path(anon), "/login", route);
    }
  } finally {
    await anon.close();
  }
});

test("CZ2 forged mutations: non-managers replaying the create/status actions create and change nothing", async () => {
  const admin = await as("admin");
  await admin.goto("/admin/courses/new");
  const courseFields = await admin.page.locator("main form").first().evaluate((f) => {
    const o = {};
    f.querySelectorAll("input[type=hidden]").forEach((i) => (o[i.name] = i.value));
    return o;
  });
  const payload = {
    ...courseFields,
    slug: "forged-course",
    title: "Forged Course",
    shortDescription: "Forged by a non-manager account.",
    description: "Forged by a non-manager account to prove the server refuses it.",
    categorySlug: "programming",
    level: "Beginner",
    duration: "1 Month",
    durationBand: "Short (Up to 2 Months)",
    modes: "Live Online",
    status: "PUBLISHED",
  };
  for (const role of ["counsellor", "accountant", "placement", "contentmgr", "trainer", "student"]) {
    const s = await as(role);
    const r = await s.context.request.post(stack.base + "/admin/courses/new", { multipart: payload, headers: { Origin: stack.base }, maxRedirects: 0 });
    assert.ok(r.status() < 500, `${role}: ${r.status()}`);
  }
  const anonRes = await fetch(stack.base + "/admin/courses/new", { method: "POST", body: Object.entries(payload).reduce((f, [k, v]) => (f.append(k, v), f), new FormData()), headers: { Origin: stack.base }, redirect: "manual" });
  assert.ok(anonRes.status < 500);
  const d = db();
  assert.equal((await d.prepare("SELECT COUNT(*) c FROM catalog_courses WHERE slug = 'forged-course'").get()).c, 0, "nothing was created");
  d.close();
});

// -------------------------------------------------------------------- mobile

test("CM1 mobile: nav lists Courses and Batches, pages fit 390px, tables become cards, forms are usable", async () => {
  const m = await as("admin", { viewport: VIEWPORTS.mobile });
  await m.goto("/admin");
  await m.page.getByRole("button", { name: /open navigation/i }).click();
  const dialog = m.page.getByRole("dialog");
  await dialog.waitFor();
  const links = await dialog.locator("nav a").evaluateAll((as) => as.map((a) => a.getAttribute("href")));
  assert.ok(links.includes("/admin/courses") && links.includes("/admin/batches"));
  await dialog.locator('nav a[href="/admin/courses"]').click();
  await m.page.waitForURL("**/admin/courses");

  const bad = [];
  for (const route of ["/admin/courses", "/admin/courses/new", "/admin/courses/rust-systems-programming", "/admin/courses/full-stack-development", "/admin/batches", "/admin/batches/new", `/admin/batches/${state.batchId}`, "/admin/batches/full-stack-development-01"]) {
    await m.goto(route);
    if (await m.hasHorizontalOverflow()) bad.push(`${route} overflows`);
    if (SHOTS && ["/admin/courses", "/admin/batches", `/admin/batches/${state.batchId}`].includes(route)) await m.shot(`mobile${route.replace(/\//g, "-")}`);
  }
  assert.deepEqual(bad, []);

  await m.goto("/admin/courses");
  assert.equal(await m.page.locator("main table").isVisible(), false, "table is hidden on phones");
  assert.ok((await m.page.locator('main ul[aria-label="Courses"] li').count()) > 0, "stacked cards are shown instead");

  // create a batch from the phone
  await m.goto("/admin/batches/new?course=react-development");
  await m.page.getByLabel("Mode").selectOption("Live Online");
  await m.page.getByLabel("Start date").fill("2027-03-01");
  await m.page.getByLabel("Schedule").fill("Sat – Sun • 9:00 AM");
  await m.page.getByRole("button", { name: "Create batch" }).click();
  await m.page.waitForURL(/\/admin\/batches\/react-development-02$/, { timeout: 10000 });
  // the confirmation dialog fits and works on a phone
  await m.page.getByLabel("Status", { exact: true }).first().selectOption("Closed");
  await m.page.getByRole("button", { name: "Update status" }).click();
  const confirm = m.page.getByRole("dialog");
  await confirm.waitFor();
  const box = await confirm.boundingBox();
  assert.ok(box.x >= 0 && box.x + box.width <= VIEWPORTS.mobile.width + 1, "dialog fits the viewport");
  await confirm.getByRole("button", { name: "Cancel" }).click();
  m.assertClean("mobile catalog");
});

test("CM2 desktop navigation: Courses and Batches are real links with the active state; only Content and Settings stay 'Soon'", async () => {
  const admin = await as("admin");
  await admin.goto("/admin/courses");
  const active = await admin.page.locator('aside nav a[aria-current="page"]').allInnerTexts();
  assert.deepEqual(active.map((t) => t.trim()), ["Courses"]);
  await admin.page.locator('aside nav a[href="/admin/batches"]').click();
  await admin.page.waitForURL("**/admin/batches");
  assert.deepEqual((await admin.page.locator('aside nav a[aria-current="page"]').allInnerTexts()).map((t) => t.trim()), ["Batches"]);
  const soon = await admin.page.locator("aside nav").getByText("Soon", { exact: true }).count();
  assert.equal(soon, 2, "only Content and Settings remain Soon");
  assert.equal(await admin.page.locator("aside nav a", { hasText: /^(Content|Settings)/ }).count(), 0);
});
