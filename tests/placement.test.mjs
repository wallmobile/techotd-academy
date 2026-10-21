import { test } from "node:test";
import assert from "node:assert/strict";
import { tdb } from "./tdb.mjs";
import crypto from "node:crypto";
import { db } from "@/lib/db/client";
import {
  createJob,
  updateJob,
  setJobStatus,
  getJobsPage,
  getJobDetail,
  getPlacementSummary,
  updateApplicationStatus,
  confirmPlacement,
} from "@/lib/placement/service";
import { getPlacementContext, requirePlacementContext } from "@/lib/placement/context";
import { parseJobParams, parseBoardParams } from "@/lib/placement/params";
import {
  createJobAction,
  setJobStatusAction,
  updateJobAction,
  updateApplicationStatusAction,
  confirmPlacementAction,
  applyAction,
  withdrawAction,
} from "@/lib/placement/actions";
import { getOpenJobsPage, getJobForStudent, getMyApplications, applyToJob, withdrawApplication } from "@/lib/student/jobs";
import { createEnrollment } from "@/lib/admin/enrollments";
import { makeUser, signIn, signOut, ensureSecondBatch } from "./helpers.mjs";

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

const count = async (t) => (await tdb.prepare(`SELECT COUNT(*) AS c FROM ${t}`).get()).c;
const future = new Date(Date.now() + 30 * 86_400_000).toISOString().slice(0, 10);
const past = new Date(Date.now() - 5 * 86_400_000).toISOString().slice(0, 10);

const jobInput = (o = {}) => ({
  title: `Frontend Developer ${crypto.randomBytes(3).toString("hex")}`,
  companyName: "Test Co",
  description: "Build interfaces.",
  location: "Pune",
  employmentType: "FULL_TIME",
  workMode: "HYBRID",
  experience: "0-1 years",
  skills: "React, CSS",
  applyDeadline: "",
  ...o,
});

async function publishedJob(overrides = {}, manager) {
  const m = manager || (await makeUser("PLACEMENT_MANAGER", "plc"));
  await signIn(m);
  const created = await createJob(jobInput(overrides));
  assert.equal(created.ok, true, created.message);
  assert.equal((await setJobStatus(created.jobId, "PUBLISHED")).ok, true);
  return { jobId: created.jobId, manager: m };
}

async function enrolledStudent(label = "jobstu") {
  const { batchA } = ensureSecondBatch();
  const user = await makeUser("STUDENT", label);
  await signIn(await makeUser("ADMIN", "plc-enr"));
  const e = await createEnrollment({ studentUserId: user.id, courseSlug: batchA.courseSlug, batchId: batchA.id });
  assert.equal(e.ok, true);
  return user;
}

// ----------------------------------------------------------- job management
test("placement managers, admins and super admins can create and publish jobs; new jobs start as DRAFT", async () => {
  for (const role of ["PLACEMENT_MANAGER", "ADMIN", "SUPER_ADMIN"]) {
    await signIn(await makeUser(role, `pm-${role}`));
    const res = await createJob(jobInput());
    assert.equal(res.ok, true, role);
    const row = await tdb.prepare("SELECT * FROM jobs WHERE id = ?").get(res.jobId);
    assert.equal(row.status, "DRAFT");
    assert.equal(row.published_at, null);
    assert.ok(row.created_by);
    assert.equal((await setJobStatus(res.jobId, "PUBLISHED")).ok, true);
    assert.ok((await tdb.prepare("SELECT published_at FROM jobs WHERE id = ?").get(res.jobId)).published_at);
    assert.equal((await updateJob(res.jobId, jobInput({ title: "Renamed role" }))).ok, true);
    assert.equal((await setJobStatus(res.jobId, "CLOSED")).ok, true);
  }
});

test("page guard: anonymous, student, trainer, counsellor, accountant are redirected from placement routes", async () => {
  await signOut();
  assert.equal(await redirectTarget(requirePlacementContext), "/login");
  await signIn(await makeUser("STUDENT", "s"));
  assert.equal(await redirectTarget(requirePlacementContext), "/student");
  await signIn(await makeUser("TRAINER", "t"));
  assert.equal(await redirectTarget(requirePlacementContext), "/trainer");
  for (const role of ["COUNSELLOR", "ACCOUNTANT", "CONTENT_MANAGER"]) {
    await signIn(await makeUser(role, "x"));
    assert.equal(await redirectTarget(requirePlacementContext), "/admin", role);
  }
  await signIn(await makeUser("PLACEMENT_MANAGER", "ok"));
  assert.equal(await redirectTarget(requirePlacementContext), null);
});

test("unauthorized roles can't create, publish, review or read applicants — by function or direct action", async () => {
  const { jobId } = await publishedJob();
  const student = await enrolledStudent("victim");
  await signIn(student);
  const applied = await applyToJob({ jobId, coverMessage: "hi" });
  assert.equal(applied.ok, true);
  const appId = (await tdb.prepare("SELECT id FROM job_applications WHERE job_id = ?").get(jobId)).id;

  await signOut();
  const before = [await count("jobs"), await count("job_applications"), await count("audit_log")];
  for (const role of [null, "STUDENT", "TRAINER", "COUNSELLOR", "ACCOUNTANT", "CONTENT_MANAGER"]) {
    if (role) await signIn(await makeUser(role, "intruder"));
    assert.equal(await getPlacementContext(), null, String(role));
    assert.equal((await createJob(jobInput())).ok, false);
    assert.equal((await updateJob(jobId, jobInput({ title: "hijack" }))).ok, false);
    assert.equal((await setJobStatus(jobId, "CLOSED")).ok, false);
    assert.equal((await updateApplicationStatus({ applicationId: appId, status: "SELECTED" })).ok, false);
    assert.equal((await confirmPlacement({ applicationId: appId })).ok, false);
    for (const result of [
      await createJobAction(null, form({ ...jobInput() })),
      await updateJobAction(null, form({ jobId, ...jobInput({ title: "hijack" }) })),
      await setJobStatusAction(null, form({ jobId, status: "CLOSED" })),
      await updateApplicationStatusAction(null, form({ applicationId: appId, status: "SELECTED" })),
      await confirmPlacementAction(null, form({ applicationId: appId })),
    ]) {
      assert.equal(result.status, "error");
    }
    assert.equal((await getJobsPage(parseJobParams({}))).total, 0);
    assert.equal(await getJobDetail(jobId), null);
    assert.equal(await getPlacementSummary(), null);
  }
  assert.deepEqual([await count("jobs"), await count("job_applications"), await count("audit_log")], before);
  assert.equal((await tdb.prepare("SELECT status FROM job_applications WHERE id = ?").get(appId)).status, "APPLIED");
  assert.equal((await tdb.prepare("SELECT status FROM jobs WHERE id = ?").get(jobId)).status, "PUBLISHED");
});

test("job validation rejects bad input and writes nothing", async () => {
  await signIn(await makeUser("PLACEMENT_MANAGER", "val"));
  const before = await count("jobs");
  const bad = [
    { title: "" },
    { title: "x".repeat(121) },
    { companyName: " " },
    { description: "" },
    { description: "d".repeat(5001) },
    { employmentType: "SLAVERY" },
    { workMode: "MOON" },
    { applyDeadline: "2030-02-31" },
    { applyDeadline: "soon" },
    { skills: "s".repeat(301) },
    { location: "l".repeat(121) },
  ];
  for (const override of bad) {
    assert.equal((await createJob(jobInput(override))).ok, false, JSON.stringify(override).slice(0, 40));
  }
  assert.equal((await setJobStatus("missing", "PUBLISHED")).reason, "not_found");
  const ok = await createJob(jobInput());
  assert.equal((await setJobStatus(ok.jobId, "ARCHIVED")).reason, "status_invalid");
  assert.equal(await count("jobs"), before + 1);
});

// --------------------------------------------------------------- visibility
test("students see only published, open jobs; drafts, closed and expired jobs are hidden and can't be applied to", async () => {
  const tag = `vis${crypto.randomBytes(3).toString("hex")}`;
  const mgr = await makeUser("PLACEMENT_MANAGER", "vis");
  await signIn(mgr);
  const mk = async (suffix, overrides, status) => {
    const r = await createJob(jobInput({ title: `${tag} ${suffix}`, ...overrides }));
    if (status) await setJobStatus(r.jobId, status);
    return r.jobId;
  };
  const draft = await mk("draft", {}, null);
  const open = await mk("open", { applyDeadline: future }, "PUBLISHED");
  const noDeadline = await mk("nodeadline", {}, "PUBLISHED");
  const closed = await mk("closed", {}, "CLOSED");
  const expired = await mk("expired", { applyDeadline: past }, "PUBLISHED");

  const student = await enrolledStudent("visstu");
  await signIn(student);
  const board = await getOpenJobsPage(parseBoardParams({ q: tag }));
  assert.deepEqual(board.rows.map((j) => j.id).sort(), [open, noDeadline].sort());

  for (const hidden of [draft, closed, expired]) {
    assert.equal(await getJobForStudent(hidden), null, "hidden job has no detail page");
    const res = await applyToJob({ jobId: hidden, coverMessage: "" });
    assert.equal(res.ok, false);
  }
  assert.equal((await applyToJob({ jobId: closed, coverMessage: "" })).reason, "job_closed");
  assert.equal((await applyToJob({ jobId: expired, coverMessage: "" })).reason, "deadline_passed");
  assert.equal((await applyToJob({ jobId: draft, coverMessage: "" })).reason, "job_closed");
  assert.equal((await applyToJob({ jobId: "no-such-job", coverMessage: "" })).reason, "job_not_found");
  assert.equal((await tdb.prepare("SELECT COUNT(*) AS c FROM job_applications WHERE student_user_id = ?").get(student.id)).c, 0);
  assert.ok(await getJobForStudent(open));

  // a student sees no staff-side fields on a job
  const dump = JSON.stringify(await getJobForStudent(open));
  for (const hidden of ["createdBy", "created_by", "status", "staff"]) assert.ok(!dump.includes(`"${hidden}"`), hidden);
});

test("closing a job stops new applications but the existing applicant still sees their status", async () => {
  const { jobId, manager } = await publishedJob();
  const a = await enrolledStudent("early");
  await signIn(a);
  assert.equal((await applyToJob({ jobId, coverMessage: "" })).ok, true);
  const b = await enrolledStudent("late");

  await signIn(manager);
  await setJobStatus(jobId, "CLOSED");

  await signIn(b);
  assert.equal(await getJobForStudent(jobId), null);
  assert.equal((await applyToJob({ jobId, coverMessage: "" })).reason, "job_closed");
  await signIn(a);
  const view = await getJobForStudent(jobId);
  assert.ok(view);
  assert.equal(view.open, false);
  assert.equal(view.canApply, false);
  assert.equal(view.application.status, "APPLIED");
});

// ------------------------------------------------------------- applications
test("an enrolled student can apply; the applicant comes from the session, not the form; duplicates are blocked", async () => {
  const { jobId } = await publishedJob();
  const student = await enrolledStudent("applier");
  const other = await enrolledStudent("other");
  await signIn(student);

  const res = await applyAction(null, form({ jobId, coverMessage: "I'd love to join", studentId: other.id, student_user_id: other.id, status: "SELECTED" }));
  assert.equal(res.status, "success");
  const row = await tdb.prepare("SELECT * FROM job_applications WHERE job_id = ?").get(jobId);
  assert.equal(row.student_user_id, student.id, "applicant is the signed-in student");
  assert.equal(row.status, "APPLIED", "a student can't choose their own status");
  assert.equal(row.cover_message, "I'd love to join");

  assert.equal((await applyToJob({ jobId, coverMessage: "again" })).reason, "already_applied");
  assert.equal((await applyAction(null, form({ jobId }))).status, "error");
  assert.equal((await tdb.prepare("SELECT COUNT(*) AS c FROM job_applications WHERE job_id = ?").get(jobId)).c, 1);
  await assert.rejects(async () =>
    await tdb.prepare("INSERT INTO job_applications (id, job_id, student_user_id) VALUES (?, ?, ?)").run("dup-direct", jobId, student.id)
  );
  assert.equal((await applyToJob({ jobId: jobId, coverMessage: "x".repeat(1001) })).ok, false);
});

test("students who aren't enrolled (or aren't students) can't apply", async () => {
  const { jobId } = await publishedJob();
  const unenrolled = await makeUser("STUDENT", "noenroll");
  await signIn(unenrolled);
  assert.equal((await applyToJob({ jobId, coverMessage: "" })).reason, "not_eligible");
  const view = await getJobForStudent(jobId);
  assert.equal(view.canApply, false);

  for (const role of ["TRAINER", "COUNSELLOR", "PLACEMENT_MANAGER"]) {
    await signIn(await makeUser(role, "nostudent"));
    assert.equal((await applyToJob({ jobId, coverMessage: "" })).ok, false, role);
    assert.deepEqual(await getMyApplications(), []);
    assert.equal(await getJobForStudent(jobId), null);
  }
  await signOut();
  assert.equal((await applyToJob({ jobId, coverMessage: "" })).ok, false);
  assert.equal(await count("job_applications") >= 0, true);
  assert.equal((await tdb.prepare("SELECT COUNT(*) AS c FROM job_applications WHERE job_id = ?").get(jobId)).c, 0);
});

test("a student sees only their own applications and can't change anyone's status", async () => {
  const { jobId } = await publishedJob();
  const a = await enrolledStudent("ownA");
  const b = await enrolledStudent("ownB");
  await signIn(a);
  await applyToJob({ jobId, coverMessage: "from A" });
  await signIn(b);
  await applyToJob({ jobId, coverMessage: "from B" });
  const appB = (await tdb.prepare("SELECT id FROM job_applications WHERE student_user_id = ?").get(b.id)).id;
  const appA = (await tdb.prepare("SELECT id FROM job_applications WHERE student_user_id = ?").get(a.id)).id;

  const mineB = await getMyApplications();
  assert.deepEqual(mineB.map((x) => x.id), [appB]);
  assert.ok(!JSON.stringify(mineB).includes("from A"));

  // B cannot move A's application, confirm anything, or withdraw A's
  assert.equal((await updateApplicationStatusAction(null, form({ applicationId: appA, status: "SELECTED" }))).status, "error");
  assert.equal((await updateApplicationStatusAction(null, form({ applicationId: appB, status: "SELECTED" }))).status, "error");
  assert.equal((await confirmPlacementAction(null, form({ applicationId: appB }))).status, "error");
  assert.equal((await withdrawApplication({ applicationId: appA })).reason, "not_found");
  assert.equal((await withdrawAction(null, form({ applicationId: appA }))).status, "error");
  assert.equal((await tdb.prepare("SELECT status FROM job_applications WHERE id = ?").get(appA)).status, "APPLIED");
  assert.equal((await tdb.prepare("SELECT status FROM job_applications WHERE id = ?").get(appB)).status, "APPLIED");

  // B can withdraw their own, once
  assert.equal((await withdrawApplication({ applicationId: appB })).ok, true);
  assert.equal((await tdb.prepare("SELECT status FROM job_applications WHERE id = ?").get(appB)).status, "WITHDRAWN");
  assert.equal((await withdrawApplication({ applicationId: appB })).reason, "cannot_withdraw");
  assert.equal((await applyToJob({ jobId, coverMessage: "retry" })).reason, "already_applied", "a withdrawn application can't be re-submitted");
});

// ------------------------------------------------------------- review flow
test("staff move applications through valid transitions only; notes stay internal", async () => {
  const { jobId, manager } = await publishedJob();
  const student = await enrolledStudent("review");
  await signIn(student);
  await applyToJob({ jobId, coverMessage: "hello" });
  const appId = (await tdb.prepare("SELECT id FROM job_applications WHERE job_id = ?").get(jobId)).id;

  await signIn(manager);
  const move = async (status, notes) => await updateApplicationStatus({ applicationId: appId, status, notes });
  assert.equal((await move("SELECTED")).reason, "transition_invalid", "can't skip the pipeline");
  assert.equal((await move("INTERVIEW")).reason, "transition_invalid");
  assert.equal((await move("WITHDRAWN")).reason, "status_invalid", "staff can't withdraw for a student");
  assert.equal((await move("BOGUS")).reason, "status_invalid");
  assert.equal((await move("UNDER_REVIEW", "Strong portfolio — INTERNAL")).ok, true);
  assert.equal((await move("SHORTLISTED")).ok, true);
  assert.equal((await move("INTERVIEW")).ok, true);
  assert.equal((await move("SELECTED")).ok, true);
  assert.equal((await move("REJECTED")).ok, true);
  assert.equal((await move("SHORTLISTED")).reason, "transition_invalid", "REJECTED is final");
  assert.equal((await updateApplicationStatus({ applicationId: "missing", status: "REJECTED" })).reason, "not_found");
  assert.equal((await move("REJECTED", "n".repeat(1001))).reason, "notes_long");

  const staffView = await getJobDetail(jobId);
  assert.equal(staffView.applications[0].staffNotes, "Strong portfolio — INTERNAL");
  assert.equal(staffView.applications[0].email, student.email);
  const transitions = await tdb.prepare("SELECT detail FROM audit_log WHERE entity_id = ? AND action = 'APPLICATION_STATUS_CHANGED'").all(appId);
  assert.equal(transitions.length, 5);

  // the student sees the status but never the staff notes
  await signIn(student);
  const mine = await getMyApplications();
  assert.equal(mine[0].status, "REJECTED");
  const dump = JSON.stringify([mine, await getJobForStudent(jobId)]);
  for (const secret of ["INTERNAL", "staffNotes", "staff_notes", "placement_note", "placementNote"]) assert.ok(!dump.includes(secret), secret);
});

test("SELECTED is not a placement: only an explicit confirmation counts, and it is cleared if the selection is withdrawn", async () => {
  const { jobId, manager } = await publishedJob();
  const student = await enrolledStudent("placed");
  await signIn(student);
  await applyToJob({ jobId, coverMessage: "" });
  const appId = (await tdb.prepare("SELECT id FROM job_applications WHERE job_id = ?").get(jobId)).id;

  await signIn(manager);
  const base = (await getPlacementSummary()).verifiedPlacements;
  for (const s of ["UNDER_REVIEW", "SHORTLISTED", "INTERVIEW"]) await updateApplicationStatus({ applicationId: appId, status: s });
  assert.equal((await confirmPlacement({ applicationId: appId })).reason, "not_selected");
  await updateApplicationStatus({ applicationId: appId, status: "SELECTED" });

  let s = await getPlacementSummary();
  assert.equal(s.verifiedPlacements, base, "selected alone is not counted as a placement");
  assert.ok(s.selected >= 1);

  assert.equal((await confirmPlacement({ applicationId: appId, note: "Joined 1 Nov" })).ok, true);
  assert.equal((await confirmPlacement({ applicationId: appId })).reason, "already_confirmed");
  s = await getPlacementSummary();
  assert.equal(s.verifiedPlacements, base + 1);
  const row = await tdb.prepare("SELECT placement_confirmed_by, placement_note FROM job_applications WHERE id = ?").get(appId);
  assert.equal(row.placement_confirmed_by, manager.id);
  assert.equal(row.placement_note, "Joined 1 Nov");

  await signIn(student);
  assert.equal((await getMyApplications())[0].placementConfirmed, true);

  await signIn(manager);
  await updateApplicationStatus({ applicationId: appId, status: "REJECTED" });
  assert.equal((await tdb.prepare("SELECT placement_confirmed_at FROM job_applications WHERE id = ?").get(appId)).placement_confirmed_at, null);
  assert.equal((await getPlacementSummary()).verifiedPlacements, base);
});

test("summary figures equal the database", async () => {
  await signIn(await makeUser("ADMIN", "summary"));
  const s = await getPlacementSummary();
  const q = async (sql) => (await tdb.prepare(sql).get()).c;
  assert.equal(s.jobsTotal, await q("SELECT COUNT(*) c FROM jobs"));
  assert.equal(s.jobsPublished, await q("SELECT COUNT(*) c FROM jobs WHERE status = 'PUBLISHED'"));
  assert.equal(
    s.jobsOpen,
    await q(`SELECT COUNT(*) c FROM jobs WHERE status = 'PUBLISHED' AND (apply_deadline IS NULL OR apply_deadline >= '${new Date().toISOString().slice(0, 10)}')`)
  );
  assert.equal(s.applicationsTotal, await q("SELECT COUNT(*) c FROM job_applications"));
  assert.equal(s.shortlisted, await q("SELECT COUNT(*) c FROM job_applications WHERE status = 'SHORTLISTED'"));
  assert.equal(s.verifiedPlacements, await q("SELECT COUNT(*) c FROM job_applications WHERE placement_confirmed_at IS NOT NULL"));
});

// ------------------------------------------------------------ search / paging
test("staff job list and student board: search, filters, pagination; injection is inert", async () => {
  const tag = `lst${crypto.randomBytes(3).toString("hex")}`;
  const mgr = await makeUser("PLACEMENT_MANAGER", "lister");
  await signIn(mgr);
  for (let i = 0; i < 12; i += 1) {
    const r = await createJob(
      jobInput({
        title: `${tag} role ${String(i).padStart(2, "0")}`,
        employmentType: i % 2 === 0 ? "INTERNSHIP" : "FULL_TIME",
        workMode: i % 3 === 0 ? "REMOTE" : "ONSITE",
      })
    );
    if (i < 11) await setJobStatus(r.jobId, "PUBLISHED");
  }
  const all = await getJobsPage(parseJobParams({ q: tag }));
  assert.equal(all.total, 12);
  assert.equal((await getJobsPage(parseJobParams({ q: tag, status: "DRAFT" }))).total, 1);
  assert.equal((await getJobsPage(parseJobParams({ q: tag, status: "PUBLISHED" }))).total, 11);
  assert.equal((await getJobsPage(parseJobParams({ q: tag, sort: "title" }))).rows[0].title.endsWith("00"), true);

  const student = await enrolledStudent("lister-stu");
  await signIn(student);
  const board = await getOpenJobsPage(parseBoardParams({ q: tag }));
  assert.equal(board.total, 11);
  assert.equal(board.rows.length, 10);
  assert.equal(board.totalPages, 2);
  assert.equal((await getOpenJobsPage(parseBoardParams({ q: tag, page: "2" }))).rows.length, 1);
  assert.equal((await getOpenJobsPage(parseBoardParams({ q: tag, type: "INTERNSHIP" }))).total, 6);
  assert.equal((await getOpenJobsPage(parseBoardParams({ q: tag, type: "INTERNSHIP", mode: "REMOTE" }))).total, 2);
  assert.equal((await getOpenJobsPage(parseBoardParams({ q: tag, type: "BOGUS" }))).total, 11);

  const before = await count("jobs");
  for (const evil of ["' OR 1=1 --", "'; DROP TABLE jobs; --", "%", "_", "\\"]) {
    const r = await getOpenJobsPage(parseBoardParams({ q: evil, type: evil, mode: evil, page: evil }));
    if (["%", "_", "\\"].includes(evil)) assert.ok(r.rows.every((j) => `${j.title} ${j.companyName} ${j.skills}`.includes(evil)), evil);
  }
  assert.equal(await count("jobs"), before);
  assert.deepEqual(parseJobParams({ status: "HACK", sort: "x", page: "-3" }), { q: "", status: "", sort: "newest", page: 1 });
});

test("placement data never carries credentials or tokens", async () => {
  const { jobId, manager } = await publishedJob();
  const s = await enrolledStudent("leakcheck");
  await signIn(s);
  await applyToJob({ jobId, coverMessage: "x" });
  await signIn(manager);
  const dump = JSON.stringify(await getJobDetail(jobId));
  for (const secret of ["password_hash", "passwordHash", "$2b$", "$2a$", "token_hash", "tokenHash"]) assert.ok(!dump.includes(secret), secret);
});
