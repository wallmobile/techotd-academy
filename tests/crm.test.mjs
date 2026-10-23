import { test } from "node:test";
import assert from "node:assert/strict";
import { tdb } from "./tdb.mjs";
import crypto from "node:crypto";
import { db } from "@/lib/db/client";
import { submitLead } from "@/lib/crm/submit";
import { buildLeadAlertEmail, canSendLeadAlert, sendLeadAlert } from "@/lib/crm/leadAlert";
import { submitEnquiry } from "@/lib/enquiry";
import { getCrmContext, requireCrmContext } from "@/lib/crm/context";
import {
  getLeadsPage,
  getLeadDetail,
  getLeadSummary,
  getLeadFilterOptions,
  updateLeadStatus,
  markLeadContacted,
  assignLead,
  addNote,
} from "@/lib/crm/leads";
import { updateLeadStatusAction, markLeadContactedAction, assignLeadAction, addLeadNoteAction } from "@/lib/crm/actions";
import { parseLeadParams } from "@/lib/crm/listParams";
import { createLead } from "@/lib/db/leads";
import { createSession } from "@/lib/db/sessions";
import { batches } from "@/data/batches";
import { courses } from "@/data/courses";
import { makeUser, signIn, signOut } from "./helpers.mjs";

function form(values) {
  const fd = new FormData();
  for (const [k, v] of Object.entries(values)) fd.set(k, v);
  return fd;
}

async function redirectTarget(fn) {
  try {
    await fn();
  } catch (error) {
    if (error.location) return error.location;
    throw error;
  }
  return null;
}

const leadCount = async () => (await tdb.prepare("SELECT COUNT(*) AS c FROM leads").get()).c;
const rowOf = async (id) => await tdb.prepare("SELECT * FROM leads WHERE id = ?").get(id);
const BATCH = batches[0];
const COURSE = BATCH.courseSlug;

function payload(overrides = {}) {
  const tag = crypto.randomUUID().slice(0, 8);
  return {
    name: `Asha ${tag}`,
    phone: "98765 43210",
    email: `asha-${tag}@Example.test`,
    interestedCourse: COURSE,
    preferredMode: "online",
    message: `Hello ${tag}`,
    source: "course-detail",
    consent: true,
    ...overrides,
  };
}

async function leadByEmail(email) {
  return await tdb.prepare("SELECT * FROM leads WHERE email = ?").get(email.toLowerCase());
}

async function seedLead(overrides = {}) {
  const tag = crypto.randomUUID().slice(0, 8);
  return await createLead({
    name: `Seed ${tag}`,
    phone: "9876543210",
    email: `seed-${tag}@example.test`,
    source: "ENQUIRY",
    origin: "direct",
    consent: true,
    ...overrides,
  });
}

// ------------------------------------------------------------ public submission
test("Book Demo submission persists a NEW, unassigned lead from the server-validated payload", async () => {
  const p = payload({ preferredBatch: BATCH.id, preferredMode: "corporate", organization: "Acme Ltd", city: "Pune", experienceLevel: "Beginner" });
  const res = await submitLead(p, "book-demo");
  assert.equal(res.ok, true);
  assert.ok(!JSON.stringify(res).match(/[0-9a-f]{8}-[0-9a-f]{4}/), "no internal id is returned to the visitor");

  const lead = await leadByEmail(p.email);
  assert.equal(lead.source, "BOOK_DEMO");
  assert.equal(lead.status, "NEW");
  assert.equal(lead.assigned_to, null);
  assert.equal(lead.course_slug, COURSE);
  assert.equal(lead.batch_id, BATCH.id);
  assert.equal(lead.mode, "corporate");
  assert.equal(lead.organization, "Acme Ltd");
  assert.equal(lead.origin, "course-detail");
  assert.equal(lead.consent, 1);
  assert.match(lead.id, /^[0-9a-f-]{36}$/, "opaque UUID id");
});

test("Enquiry and quick (homepage) submissions persist with the right source", async () => {
  const e = payload({ organization: "Ignored Org" });
  assert.equal((await submitLead(e, "enquiry")).ok, true);
  const lead = await leadByEmail(e.email);
  assert.equal(lead.source, "ENQUIRY");
  assert.equal(lead.organization, null, "organization is only kept for corporate enquiries");

  const q = payload({ source: "homepage", consent: false, preferredMode: undefined, message: undefined });
  assert.equal((await submitLead(q, "quick")).ok, true);
  const quick = await leadByEmail(q.email);
  assert.equal(quick.source, "ENQUIRY");
  assert.equal(quick.origin, "homepage");
  assert.equal(quick.consent, 1, "the hero form's static consent line");

  // the public boundary used by the forms reaches the same code
  const viaBoundary = payload();
  assert.equal((await submitEnquiry(viaBoundary, "enquiry")).ok, true);
  assert.ok(await leadByEmail(viaBoundary.email));
});

test("client-supplied status / assignment / unknown fields can't influence the stored lead", async () => {
  const admin = await makeUser("ADMIN", "victim");
  const p = payload({ status: "CONVERTED", assignedTo: admin.id, assigned_to: admin.id, source: "NOT-A-SOURCE", id: "chosen-id" });
  assert.equal((await submitLead(p, "enquiry")).ok, true);
  const lead = await leadByEmail(p.email);
  assert.equal(lead.status, "NEW");
  assert.equal(lead.assigned_to, null);
  assert.equal(lead.origin, "direct");
  assert.notEqual(lead.id, "chosen-id");
});

test("invalid input is rejected server-side and writes nothing", async () => {
  const before = await leadCount();
  const bad = [
    [payload({ name: "" }), "enquiry"],
    [payload({ email: "not-an-email" }), "enquiry"],
    [payload({ phone: "123" }), "enquiry"],
    [payload({ consent: false }), "enquiry"],
    [payload({ consent: "true" }), "book-demo"],
    [payload({ message: "x".repeat(601) }), "enquiry"],
    [payload({ preferredMode: "corporate", organization: "" }), "book-demo"],
    [payload({ name: { $ne: 1 } }), "enquiry"],
    [payload(), "no-such-variant"],
    [null, "enquiry"],
    ["string", "enquiry"],
  ];
  for (const [p, variant] of bad) {
    const res = await submitLead(p, variant);
    assert.equal(res.ok, false, JSON.stringify(p));
  }
  assert.equal(await leadCount(), before);
});

test("unknown course, mode, batch or experience level is rejected safely (no dangling references)", async () => {
  const before = await leadCount();
  const otherCourse = courses.find((c) => c.slug !== COURSE);
  const cases = [
    payload({ interestedCourse: "no-such-course" }),
    payload({ preferredMode: "teleport" }),
    payload({ preferredBatch: "no-such-batch" }),
    payload({ interestedCourse: otherCourse.slug, preferredBatch: BATCH.id }),
    payload({ experienceLevel: "Wizard" }),
  ];
  for (const p of cases) {
    const res = await submitLead(p, "book-demo");
    assert.equal(res.ok, false);
    assert.ok(!/course|slug|batch/i.test(res.error) || /check the details/i.test(res.error), "generic message");
  }
  assert.equal(await leadCount(), before);
});

test("an accidental double-submit collapses to one lead; a genuine repeat enquiry is kept", async () => {
  const p = payload();
  assert.equal((await submitLead(p, "enquiry")).ok, true);
  assert.equal((await submitLead(p, "enquiry")).ok, true, "the repeat still reports success");
  assert.equal((await tdb.prepare("SELECT COUNT(*) AS c FROM leads WHERE email = ?").get(p.email.toLowerCase())).c, 1);

  // same person, different request -> separate lead (no UNIQUE(email/phone))
  assert.equal((await submitLead({ ...p, message: "A different question" }, "enquiry")).ok, true);
  assert.equal((await tdb.prepare("SELECT COUNT(*) AS c FROM leads WHERE email = ?").get(p.email.toLowerCase())).c, 2);

  // same request after the dedupe window -> a new lead
  await tdb.prepare("UPDATE leads SET created_at = app_now('-10 minutes') WHERE email = ?").run(p.email.toLowerCase());
  assert.equal((await submitLead(p, "enquiry")).ok, true);
  assert.equal((await tdb.prepare("SELECT COUNT(*) AS c FROM leads WHERE email = ?").get(p.email.toLowerCase())).c, 3);
});

// ------------------------------------------------------------ new-lead alert email
test("onCreated fires once per new lead (not for a collapsed duplicate) and can't fail the submission", async () => {
  const seen = [];
  const p = payload();
  assert.equal((await submitLead(p, "book-demo", { onCreated: (lead) => seen.push(lead) })).ok, true);
  assert.equal((await submitLead(p, "book-demo", { onCreated: (lead) => seen.push(lead) })).ok, true);
  assert.equal(seen.length, 1);
  assert.equal(seen[0].email, p.email.toLowerCase());
  assert.equal(seen[0].source, "BOOK_DEMO");

  const throwing = () => {
    throw new Error("boom");
  };
  assert.equal((await submitLead(payload(), "enquiry", { onCreated: throwing })).ok, true);
});

test("the lead alert goes to LEAD_ALERT_EMAIL with Reply-To set to the visitor and escaped content", async () => {
  const env = {
    EMAIL_PROVIDER: "resend",
    RESEND_API_KEY: "re_test_key_do_not_log",
    EMAIL_FROM: "Academy <no-reply@example.test>",
    LEAD_ALERT_EMAIL: "alerts@example.test",
    NEXT_PUBLIC_SITE_URL: "https://academy.example.test",
  };
  const saved = Object.fromEntries(Object.keys(env).map((k) => [k, process.env[k]]));
  Object.assign(process.env, env);
  const calls = [];
  const fetchImpl = async (url, init) => {
    calls.push({ url, body: JSON.parse(init.body) });
    return new Response(JSON.stringify({ id: "msg_1" }), { status: 200 });
  };
  try {
    assert.equal(canSendLeadAlert(), true);
    const lead = await seedLead({ name: "Ravi <b>", message: "Call me <script>x</script>", courseSlug: COURSE });
    assert.deepEqual(await sendLeadAlert(lead, { fetchImpl }), { ok: true });
    assert.equal(calls.length, 1);
    const sent = calls[0].body;
    assert.deepEqual(sent.to, ["alerts@example.test"]);
    assert.equal(sent.reply_to, lead.email);
    assert.match(sent.subject, /^New Enquiry: Ravi <b>$/);
    assert.ok(sent.html.includes("Ravi &lt;b&gt;") && !sent.html.includes("<script>"), "visitor text is escaped");
    assert.ok(sent.text.includes(lead.phone) && sent.text.includes(`https://academy.example.test/admin/leads/${lead.id}`));

    process.env.LEAD_ALERT_EMAIL = "not an email";
    assert.equal(canSendLeadAlert(), false);
    assert.deepEqual(await sendLeadAlert(lead, { fetchImpl }), { ok: false, code: "recipient_not_configured" });
    assert.equal(calls.length, 1, "nothing sent without a valid recipient");
  } finally {
    for (const [k, v] of Object.entries(saved)) {
      if (v === undefined) delete process.env[k];
      else process.env[k] = v;
    }
  }
});

test("buildLeadAlertEmail labels Book Demo requests and omits empty fields", () => {
  const { subject, text } = buildLeadAlertEmail({ name: "Meera", phone: "9876543210", email: "m@example.test", source: "BOOK_DEMO", origin: "homepage" });
  assert.equal(subject, "New Book Demo request: Meera");
  assert.ok(text.includes("Form: Book Demo request (from homepage)"));
  assert.ok(!/Course:|Message:|Batch:/.test(text));
});

test("when the database write fails the visitor gets a safe error, never success", async () => {
  const p = payload();
  const logged = [];
  const original = console.error;
  console.error = (...args) => logged.push(args.join(" "));
  await db.exec("ALTER TABLE leads RENAME TO leads_unavailable");
  let res;
  try {
    res = await submitLead(p, "enquiry");
  } finally {
    await db.exec("ALTER TABLE leads_unavailable RENAME TO leads");
    console.error = original;
  }
  assert.equal(res.ok, false);
  assert.equal(res.error, "We couldn't submit your request right now. Please try again.");
  const visible = JSON.stringify(res);
  assert.ok(!/sqlite|no such table|relation|does not exist|SELECT|INSERT|\.db/i.test(visible));
  const log = logged.join("\n");
  assert.ok(!log.includes(p.email) && !log.includes(p.phone) && !/INSERT|SELECT/.test(log), "no personal data or SQL in logs");
  assert.equal(await leadByEmail(p.email), undefined);
});

// ------------------------------------------------------------------ authorization
test("CRM context: only SUPER_ADMIN, ADMIN and COUNSELLOR", async () => {
  await signOut();
  assert.equal(await getCrmContext(), null);
  for (const role of ["STUDENT", "TRAINER", "ACCOUNTANT", "CONTENT_MANAGER", "PLACEMENT_MANAGER"]) {
    await signIn(await makeUser(role, role.toLowerCase()));
    assert.equal(await getCrmContext(), null, `${role} must be denied`);
  }
  await signIn(await makeUser("COUNSELLOR", "cns"));
  const c = await getCrmContext();
  assert.equal(c.isManager, false);
  assert.ok(c.scopeUserId);
  await signIn(await makeUser("ADMIN", "adm"));
  assert.equal((await getCrmContext()).isManager, true);
  await signIn(await makeUser("SUPER_ADMIN", "sa"));
  assert.equal((await getCrmContext()).scopeUserId, null);
});

test("page guard for /admin/leads and /admin/leads/[id]: anonymous, student, trainer, other staff", async () => {
  await signOut();
  assert.equal(await redirectTarget(requireCrmContext), "/login");
  await signIn(await makeUser("STUDENT", "stu"));
  assert.equal(await redirectTarget(requireCrmContext), "/student");
  await signIn(await makeUser("TRAINER", "trn"));
  assert.equal(await redirectTarget(requireCrmContext), "/trainer");
  await signIn(await makeUser("ACCOUNTANT", "acc"));
  assert.equal(await redirectTarget(requireCrmContext), "/admin");
  for (const role of ["COUNSELLOR", "ADMIN", "SUPER_ADMIN"]) {
    await signIn(await makeUser(role, role.toLowerCase()));
    assert.equal(await redirectTarget(requireCrmContext), null, role);
  }
});

test("unauthorized roles read nothing and their direct Server Action calls write nothing", async () => {
  const lead = await seedLead();
  const target = await makeUser("COUNSELLOR", "target");
  const snapshot = JSON.stringify(await rowOf(lead.id));
  const notesBefore = (await tdb.prepare("SELECT COUNT(*) AS c FROM lead_notes").get()).c;

  await signOut();
  for (const role of [null, "STUDENT", "TRAINER", "ACCOUNTANT", "CONTENT_MANAGER", "PLACEMENT_MANAGER"]) {
    if (role) await signIn(await makeUser(role, "intruder"));
    assert.equal((await getLeadsPage(parseLeadParams({}))).total, 0);
    assert.equal(await getLeadDetail(lead.id), null);
    assert.equal(await getLeadSummary(), null);
    assert.equal(await getLeadFilterOptions(), null);

    for (const result of [
      await updateLeadStatusAction(null, form({ leadId: lead.id, status: "CONVERTED" })),
      await markLeadContactedAction(null, form({ leadId: lead.id })),
      await assignLeadAction(null, form({ leadId: lead.id, assignedTo: target.id })),
      await addLeadNoteAction(null, form({ leadId: lead.id, note: "sneaky" })),
    ]) {
      assert.equal(result.status, "error");
    }
  }
  assert.equal(JSON.stringify(await rowOf(lead.id)), snapshot, "lead untouched");
  assert.equal((await tdb.prepare("SELECT COUNT(*) AS c FROM lead_notes").get()).c, notesBefore, "no notes written");
});

// ------------------------------------------------------------ counsellor scope
test("counsellor sees assigned + unassigned leads only, and may change only their own", async () => {
  const c1 = await makeUser("COUNSELLOR", "c1");
  const c2 = await makeUser("COUNSELLOR", "c2");
  const admin = await makeUser("ADMIN", "mgr");
  const tag = `scope${crypto.randomUUID().slice(0, 6)}`;
  const mine = await seedLead({ name: `${tag} mine` });
  const theirs = await seedLead({ name: `${tag} theirs` });
  const queue = await seedLead({ name: `${tag} queue` });

  await signIn(admin);
  assert.equal((await assignLead(mine.id, c1.id)).ok, true);
  assert.equal((await assignLead(theirs.id, c2.id)).ok, true);
  assert.equal((await addNote(theirs.id, "private note about c2's lead")).ok, true);

  await signIn(c1);
  const page = await getLeadsPage(parseLeadParams({ q: tag }));
  assert.deepEqual(page.rows.map((r) => r.id).sort(), [mine.id, queue.id].sort());
  const summary = await getLeadSummary();
  assert.ok(summary.total >= 2);

  // another counsellor's lead: invisible, even by id and by filtering on their id
  assert.equal(await getLeadDetail(theirs.id), null);
  const probe = await getLeadsPage(parseLeadParams({ q: tag, assigned: c2.id }));
  assert.ok(!probe.rows.some((r) => r.id === theirs.id));
  assert.deepEqual((await updateLeadStatus(theirs.id, "LOST")).ok, false);
  assert.equal((await addNote(theirs.id, "x")).ok, false);
  assert.equal((await markLeadContacted(theirs.id)).ok, false);
  assert.equal((await assignLead(theirs.id, c1.id)).ok, false, "can't steal another counsellor's lead");
  assert.equal((await rowOf(theirs.id)).status, "NEW");
  assert.equal((await rowOf(theirs.id)).assigned_to, c2.id);

  // own lead: full working set
  assert.equal((await updateLeadStatus(mine.id, "QUALIFIED")).ok, true);
  assert.equal((await rowOf(mine.id)).status, "QUALIFIED");
  assert.equal((await addNote(mine.id, "called, interested")).ok, true);
  const detail = await getLeadDetail(mine.id);
  assert.equal(detail.permissions.canModify, true);
  assert.equal(detail.permissions.canAssign, false);
  assert.equal(detail.assignees.length, 0, "no list of staff for counsellors");
  assert.equal(detail.notes[0].authorName.startsWith("c1"), true);

  // unassigned: viewable, read-only until claimed
  const queued = await getLeadDetail(queue.id);
  assert.equal(queued.permissions.canModify, false);
  assert.equal(queued.permissions.canClaim, true);
  assert.equal((await updateLeadStatus(queue.id, "CONTACTED")).ok, false);
  assert.equal((await addNote(queue.id, "x")).ok, false);
  assert.equal((await assignLead(queue.id, c2.id)).ok, false, "can only claim for themselves");
  assert.equal((await assignLead(queue.id, c1.id)).ok, true);
  assert.equal((await rowOf(queue.id)).assigned_to, c1.id);
  assert.equal((await updateLeadStatus(queue.id, "CONTACTED")).ok, true);
  assert.equal((await assignLead(queue.id, "")).ok, false, "can't release/unassign either");
});

// ------------------------------------------------------------ admin management
test("admin and super admin see and manage every lead", async () => {
  const c = await makeUser("COUNSELLOR", "owner");
  const tag = `mgr${crypto.randomUUID().slice(0, 6)}`;
  const a = await seedLead({ name: `${tag} a` });
  const b = await seedLead({ name: `${tag} b` });
  for (const role of ["ADMIN", "SUPER_ADMIN"]) {
    await signIn(await makeUser(role, role.toLowerCase()));
    assert.equal((await getLeadsPage(parseLeadParams({ q: tag }))).total, 2);
    assert.equal((await assignLead(a.id, c.id)).ok, true);
    assert.equal((await updateLeadStatus(a.id, "FOLLOW_UP")).ok, true);
    assert.equal((await addNote(b.id, `note by ${role}`)).ok, true);
    assert.equal((await assignLead(a.id, "")).ok, true, "unassign");
    assert.equal((await rowOf(a.id)).assigned_to, null);
  }
});

test("assignment is limited to active ADMIN / SUPER_ADMIN / COUNSELLOR users", async () => {
  await signIn(await makeUser("ADMIN", "assigner"));
  const lead = await seedLead();
  for (const role of ["STUDENT", "TRAINER", "ACCOUNTANT", "CONTENT_MANAGER", "PLACEMENT_MANAGER"]) {
    const u = await makeUser(role, "nope");
    assert.equal((await assignLead(lead.id, u.id)).ok, false, role);
  }
  assert.equal((await assignLead(lead.id, "no-such-user")).ok, false);
  const inactive = await makeUser("COUNSELLOR", "inactive");
  await tdb.prepare("UPDATE users SET status = 'INACTIVE' WHERE id = ?").run(inactive.id);
  assert.equal((await assignLead(lead.id, inactive.id)).ok, false);
  assert.equal((await assignLead("no-such-lead", inactive.id)).ok, false);
  assert.equal((await rowOf(lead.id)).assigned_to, null);
  for (const role of ["COUNSELLOR", "ADMIN", "SUPER_ADMIN"]) {
    const u = await makeUser(role, "ok");
    assert.equal((await assignLead(lead.id, u.id)).ok, true, role);
    assert.equal((await rowOf(lead.id)).assigned_to, u.id);
  }
});

test("status: only the fixed list is accepted; last_contacted_at changes only via 'mark contacted'", async () => {
  await signIn(await makeUser("ADMIN", "status"));
  const lead = await seedLead();
  assert.equal((await rowOf(lead.id)).status, "NEW");
  for (const bad of ["", "DONE", "new", "NEW; DROP TABLE leads", undefined, null]) {
    assert.equal((await updateLeadStatus(lead.id, bad)).ok, false, String(bad));
  }
  assert.equal((await updateLeadStatus("missing", "LOST")).ok, false);
  for (const s of ["QUALIFIED", "FOLLOW_UP", "CONVERTED", "LOST", "CONTACTED", "NEW"]) {
    assert.equal((await updateLeadStatus(lead.id, s)).ok, true);
    assert.equal((await rowOf(lead.id)).status, s);
  }
  assert.equal((await rowOf(lead.id)).last_contacted_at, null, "a status change is not a contact event");
  await tdb.prepare("UPDATE leads SET updated_at = '2000-01-01 00:00:00' WHERE id = ?").run(lead.id);
  assert.equal((await markLeadContacted(lead.id)).ok, true);
  const after = await rowOf(lead.id);
  assert.equal(after.status, "CONTACTED");
  assert.ok(after.last_contacted_at);
  assert.notEqual(after.updated_at, "2000-01-01 00:00:00");
});

test("notes: validated, authored, timestamped and only readable inside the CRM", async () => {
  const admin = await makeUser("ADMIN", "noter");
  await signIn(admin);
  const lead = await seedLead();
  assert.equal((await addNote(lead.id, "   ")).ok, false);
  assert.equal((await addNote(lead.id, "x".repeat(2001))).ok, false);
  assert.equal((await addNote("missing", "hi")).ok, false);
  assert.equal((await addNote(lead.id, "  Spoke to parent, wants evening batch  ")).ok, true);
  const detail = await getLeadDetail(lead.id);
  assert.equal(detail.notes.length, 1);
  assert.equal(detail.notes[0].note, "Spoke to parent, wants evening batch");
  assert.equal(detail.notes[0].authorId, admin.id);
  assert.ok(detail.notes[0].createdAt);

  for (const role of ["STUDENT", "TRAINER"]) {
    await signIn(await makeUser(role, "reader"));
    assert.equal(await getLeadDetail(lead.id), null);
  }
});

// ----------------------------------------------------- search / filters / paging
test("lead list: search, filters, sort and pagination", async () => {
  await signIn(await makeUser("ADMIN", "lister"));
  const tag = `lq${crypto.randomUUID().slice(0, 6)}`;
  const counsellor = await makeUser("COUNSELLOR", "lc");
  for (let i = 0; i < 23; i += 1) {
    const l = await seedLead({
      name: `${tag}-${String(i).padStart(2, "0")}`,
      phone: `90000${String(i).padStart(5, "0")}`,
      source: i % 2 === 0 ? "BOOK_DEMO" : "ENQUIRY",
      courseSlug: i % 3 === 0 ? COURSE : null,
      mode: i % 3 === 0 ? "online" : null,
    });
    await tdb.prepare("UPDATE leads SET created_at = ?, status = ?, assigned_to = ? WHERE id = ?").run(
      `2020-01-01 00:00:${String(i).padStart(2, "0")}`,
      i < 5 ? "CONTACTED" : "NEW",
      i === 0 ? counsellor.id : null,
      l.id
    );
  }

  const all = await getLeadsPage(parseLeadParams({ q: tag }));
  assert.equal(all.total, 23);
  assert.equal(all.rows.length, 20);
  assert.equal(all.totalPages, 2);
  const p2 = await getLeadsPage(parseLeadParams({ q: tag, page: "2" }));
  assert.equal(p2.rows.length, 3);
  assert.equal(new Set([...all.rows, ...p2.rows].map((r) => r.id)).size, 23);
  assert.equal((await getLeadsPage(parseLeadParams({ q: tag, page: "999" }))).page, 2);

  assert.equal((await getLeadsPage(parseLeadParams({ q: tag, status: "CONTACTED" }))).total, 5);
  assert.equal((await getLeadsPage(parseLeadParams({ q: tag, source: "BOOK_DEMO" }))).total, 12);
  assert.equal((await getLeadsPage(parseLeadParams({ q: tag, course: COURSE }))).total, 8);
  assert.equal((await getLeadsPage(parseLeadParams({ q: tag, mode: "online" }))).total, 8);
  assert.equal((await getLeadsPage(parseLeadParams({ q: tag, assigned: counsellor.id }))).total, 1);
  assert.equal((await getLeadsPage(parseLeadParams({ q: tag, assigned: "unassigned" }))).total, 22);
  assert.equal((await getLeadsPage(parseLeadParams({ q: tag, status: "CONTACTED", source: "BOOK_DEMO" }))).total, 3);

  const newest = await getLeadsPage(parseLeadParams({ q: tag, sort: "newest" }));
  const oldest = await getLeadsPage(parseLeadParams({ q: tag, sort: "oldest" }));
  assert.ok(newest.rows[0].createdAt > oldest.rows[0].createdAt);
  const names = (await getLeadsPage(parseLeadParams({ q: tag, sort: "name" }))).rows.map((r) => r.name.toLowerCase());
  assert.deepEqual(names, [...names].sort());

  // phone and email search
  assert.equal((await getLeadsPage(parseLeadParams({ q: "9000000003" }))).total, 1);
  const options = await getLeadFilterOptions();
  assert.ok(options.courses.some((c) => c.value === COURSE));
  assert.ok(options.modes.some((m) => m.value === "online"));
  assert.ok(options.assignees.some((u) => u.id === counsellor.id));
});

test("summary counts equal the database; params are sanitized; SQL-injection input is inert", async () => {
  await signIn(await makeUser("ADMIN", "sum"));
  await seedLead();
  const summary = await getLeadSummary();
  const real = Object.fromEntries((await tdb.prepare("SELECT status, COUNT(*) AS c FROM leads GROUP BY status").all()).map((r) => [r.status, r.c]));
  for (const status of ["NEW", "CONTACTED", "QUALIFIED", "FOLLOW_UP", "CONVERTED", "LOST"]) {
    assert.equal(summary.byStatus[status], real[status] || 0, status);
  }
  assert.equal(summary.total, await leadCount());

  const before = await leadCount();
  for (const evil of ["' OR 1=1 --", "'; DROP TABLE leads; --", "%", "_", "\\", "\" OR \"\"=\""]) {
    const r = await getLeadsPage(parseLeadParams({ q: evil, course: evil, mode: evil, assigned: evil, status: evil, source: evil, sort: evil }));
    assert.ok(r.total <= before, evil);
    if (["%", "_", "\\"].includes(evil)) assert.equal(r.total, 0, `${evil} must be literal`);
  }
  assert.equal(await leadCount(), before);
  assert.deepEqual(parseLeadParams({ status: "HACK", source: "x", sort: "y; DROP", page: "-3", course: "A B!" }), {
    q: "",
    status: "",
    source: "",
    course: "",
    mode: "",
    assigned: "",
    sort: "newest",
    page: 1,
  });
});

test("CRM data never carries credentials or tokens", async () => {
  const admin = await makeUser("ADMIN", "leak");
  const token = (await createSession(admin.id)).token;
  await signIn(admin);
  const lead = await seedLead();
  await assignLead(lead.id, admin.id);
  await addNote(lead.id, "note");
  const dump = JSON.stringify([await getLeadDetail(lead.id), await getLeadsPage(parseLeadParams({})), await getLeadFilterOptions()]);
  for (const secret of ["password_hash", "passwordHash", "$2b$", "$2a$", "token_hash", "tokenHash", token]) {
    assert.ok(!dump.includes(secret), `leaked: ${secret}`);
  }
});
