import { test } from "node:test";
import assert from "node:assert/strict";
import { tdb } from "./tdb.mjs";
import crypto from "node:crypto";
import { db } from "@/lib/db/client";
import {
  createEnrollment,
  setEnrollmentStatus,
  getEnrollmentsPage,
  getEnrollmentDetail,
  getEnrollmentFormData,
  getEnrollmentCounts,
  getStudentEnrollments,
} from "@/lib/admin/enrollments";
import { createEnrollmentAction, setEnrollmentStatusAction } from "@/lib/admin/enrollmentActions";
import { parseEnrollmentParams } from "@/lib/admin/enrollmentParams";
import { getStudentDetailForAdmin } from "@/lib/admin/students";
import { getAdminDashboardData } from "@/lib/admin/dashboard";
import { convertLeadToStudent, getLeadDetail } from "@/lib/crm/leads";
import { convertLeadAction } from "@/lib/crm/actions";
import { createLead, getLeadById, convertLeadTx } from "@/lib/db/leads";
import { getMyBatchEnrollments } from "@/lib/student/batches";
import { getMyCourseEnrollments, getStudentCourseDetail } from "@/lib/student/courses";
import { getMyStudents } from "@/lib/trainer/students";
import { createTrainerBatchAssignment } from "@/lib/db/trainerBatchAssignments";
import { findUserByEmailInternal, findUserByIdInternal } from "@/lib/db/users";
import { verifyPassword } from "@/lib/auth/password";
import { batches } from "@/data/batches";
import { courses } from "@/data/courses";
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

const rowCount = async (table) => (await tdb.prepare(`SELECT COUNT(*) AS c FROM ${table}`).get()).c;
const OTHER_COURSE_BATCH = batches.find((b) => b.courseSlug !== batches[0].courseSlug);

// Fresh batches (unique ids, same course) so tests never share state through a batch.
function twoBatches() {
  return ensureSecondBatch();
}

async function seedLead(overrides = {}) {
  const tag = crypto.randomUUID().slice(0, 8);
  return await createLead({
    name: `Lead ${tag}`,
    phone: "9876543210",
    email: `lead-${tag}@example.test`,
    source: "ENQUIRY",
    origin: "direct",
    consent: true,
    ...overrides,
  });
}

// ------------------------------------------------------------------ creation
test("admin can enroll an active student: batch + course enrollment, ACTIVE, visible to admin", async () => {
  const { batchA } = twoBatches();
  const student = await makeUser("STUDENT", "enr");
  await signIn(await makeUser("ADMIN", "enroller"));

  const res = await createEnrollment({ studentUserId: student.id, courseSlug: batchA.courseSlug, batchId: batchA.id });
  assert.equal(res.ok, true);

  const detail = await getEnrollmentDetail(res.enrollmentId);
  assert.equal(detail.status, "ACTIVE");
  assert.equal(detail.studentUserId, student.id);
  assert.equal(detail.courseSlug, batchA.courseSlug);
  assert.equal(detail.batchId, batchA.id);
  assert.ok(detail.courseTitle && detail.enrolledAt);

  const courseRow = await tdb
    .prepare("SELECT ce.status FROM course_enrollments ce JOIN student_profiles sp ON sp.id = ce.student_id WHERE sp.user_id = ? AND ce.course_slug = ?")
    .get(student.id, batchA.courseSlug);
  assert.equal(courseRow.status, "ACTIVE");
  assert.equal((await getStudentEnrollments(student.id)).length, 1);

  // the shared student detail page sees it too
  const studentView = await getStudentDetailForAdmin(student.id);
  assert.equal(studentView.batches.length, 1);
  assert.equal(studentView.courses.length, 1);
});

test("the enrollment server action works for admins and super admins and redirects to the new enrollment", async () => {
  const { batchA } = twoBatches();
  for (const role of ["ADMIN", "SUPER_ADMIN"]) {
    const student = await makeUser("STUDENT", "viaaction");
    await signIn(await makeUser(role, role.toLowerCase()));
    const location = await redirectTarget(async () =>
      await createEnrollmentAction(null, form({ studentId: student.id, course: batchA.courseSlug, batch: batchA.id }))
    );
    assert.match(location, /^\/admin\/enrollments\/[0-9a-f-]{36}$/);
  }
});

test("non-admins (and anonymous) cannot create or change enrollments, by function or by action", async () => {
  const { batchA } = twoBatches();
  const student = await makeUser("STUDENT", "victim");
  await signIn(await makeUser("ADMIN", "setup"));
  const made = await createEnrollment({ studentUserId: student.id, courseSlug: batchA.courseSlug, batchId: batchA.id });
  const other = await makeUser("STUDENT", "other");

  await signOut();
  const before = [await rowCount("batch_enrollments"), await rowCount("course_enrollments")];
  for (const role of [null, "STUDENT", "TRAINER", "COUNSELLOR", "ACCOUNTANT", "CONTENT_MANAGER", "PLACEMENT_MANAGER"]) {
    if (role) await signIn(await makeUser(role, "intruder"));
    assert.equal((await createEnrollment({ studentUserId: other.id, courseSlug: batchA.courseSlug, batchId: batchA.id })).ok, false);
    assert.equal((await setEnrollmentStatus(made.enrollmentId, "CANCELLED")).ok, false);
    const viaAction = await createEnrollmentAction(null, form({ studentId: other.id, course: batchA.courseSlug, batch: batchA.id }));
    assert.equal(viaAction.status, "error");
    assert.equal((await setEnrollmentStatusAction(null, form({ enrollmentId: made.enrollmentId, status: "CANCELLED" }))).status, "error");
    assert.equal((await getEnrollmentsPage({ q: "", course: "", batch: "", status: "", sort: "newest", page: 1 })).total, 0);
    assert.equal(await getEnrollmentDetail(made.enrollmentId), null);
    assert.equal(await getEnrollmentCounts(), null);
    assert.equal(await getEnrollmentFormData({}), null);
  }
  assert.deepEqual([await rowCount("batch_enrollments"), await rowCount("course_enrollments")], before);
  assert.equal((await tdb.prepare("SELECT status FROM batch_enrollments WHERE id = ?").get(made.enrollmentId)).status, "ACTIVE");
});

test("invalid, inactive and non-student targets are rejected", async () => {
  const { batchA } = twoBatches();
  await signIn(await makeUser("ADMIN", "validator"));
  const before = await rowCount("batch_enrollments");
  const attempt = async (id) => await createEnrollment({ studentUserId: id, courseSlug: batchA.courseSlug, batchId: batchA.id });

  assert.equal((await attempt("no-such-user")).reason, "student_invalid");
  assert.equal((await attempt("")).reason, "student_invalid");
  assert.equal((await attempt(undefined)).reason, "student_invalid");
  assert.equal((await attempt((await makeUser("TRAINER", "t")).id)).reason, "student_invalid");
  assert.equal((await attempt((await makeUser("ADMIN", "a")).id)).reason, "student_invalid");
  assert.equal((await attempt((await makeUser("COUNSELLOR", "c")).id)).reason, "student_invalid");
  for (const status of ["INACTIVE", "SUSPENDED"]) {
    const s = await makeUser("STUDENT", "inactive");
    await tdb.prepare("UPDATE users SET status = ? WHERE id = ?").run(status, s.id);
    assert.equal((await attempt(s.id)).reason, "student_inactive", status);
  }
  assert.equal(await rowCount("batch_enrollments"), before);
});

test("invalid course / batch, course-batch mismatch and closed batches are rejected", async () => {
  const { batchA } = twoBatches();
  const closed = { ...batchA, id: `${batchA.id}-closed`, status: "Closed" };
  batches.push(closed);
  const upcoming = { ...batchA, id: `${batchA.id}-upcoming`, status: "Upcoming" };
  batches.push(upcoming);
  const student = await makeUser("STUDENT", "rules");
  await signIn(await makeUser("ADMIN", "rules-admin"));
  const before = [await rowCount("batch_enrollments"), await rowCount("course_enrollments")];

  const go = async (courseSlug, batchId) => await createEnrollment({ studentUserId: student.id, courseSlug, batchId });
  assert.equal((await go("no-such-course", batchA.id)).reason, "course_invalid");
  assert.equal((await go("", batchA.id)).reason, "course_invalid");
  assert.equal((await go(batchA.courseSlug, "no-such-batch")).reason, "batch_invalid");
  assert.equal((await go(batchA.courseSlug, undefined)).reason, "batch_invalid");
  const otherCourse = courses.find((c) => c.slug !== batchA.courseSlug);
  assert.equal((await go(otherCourse.slug, batchA.id)).reason, "batch_mismatch", "Course A + batch of Course B");
  assert.equal((await go(batchA.courseSlug, OTHER_COURSE_BATCH.id)).reason, "batch_mismatch");
  assert.equal((await go(batchA.courseSlug, closed.id)).reason, "batch_closed");
  assert.deepEqual([await rowCount("batch_enrollments"), await rowCount("course_enrollments")], before, "rejections wrote nothing");

  assert.equal((await go(batchA.courseSlug, upcoming.id)).ok, true, "Upcoming batches accept enrollments");
});

test("duplicates are rejected; cancelled enrollments re-activate the same row; completed ones are not re-created", async () => {
  const { batchA } = twoBatches();
  const student = await makeUser("STUDENT", "dup");
  await signIn(await makeUser("ADMIN", "dup-admin"));
  const go = async () => await createEnrollment({ studentUserId: student.id, courseSlug: batchA.courseSlug, batchId: batchA.id });
  const countFor = async () =>
    (await tdb
      .prepare("SELECT COUNT(*) AS c FROM batch_enrollments be JOIN student_profiles sp ON sp.id = be.student_id WHERE sp.user_id = ? AND be.batch_id = ?")
      .get(student.id, batchA.id)).c;

  const first = await go();
  assert.equal(first.ok, true);
  assert.equal((await go()).reason, "duplicate");
  assert.equal((await go()).reason, "duplicate");
  assert.equal(await countFor(), 1);

  assert.equal((await setEnrollmentStatus(first.enrollmentId, "CANCELLED")).ok, true);
  const again = await go();
  assert.equal(again.ok, true);
  assert.equal(again.enrollmentId, first.enrollmentId, "history row is reused, not duplicated");
  assert.equal(await countFor(), 1);
  assert.equal((await getEnrollmentDetail(first.enrollmentId)).status, "ACTIVE");

  assert.equal((await setEnrollmentStatus(first.enrollmentId, "COMPLETED")).ok, true);
  assert.equal((await go()).reason, "completed");
  assert.equal(await countFor(), 1);
});

test("status changes: validated, never delete, and the course status follows its batches", async () => {
  const { batchA, batchB } = twoBatches();
  const student = await makeUser("STUDENT", "life");
  await signIn(await makeUser("ADMIN", "life-admin"));
  const a = await createEnrollment({ studentUserId: student.id, courseSlug: batchA.courseSlug, batchId: batchA.id });
  const b = await createEnrollment({ studentUserId: student.id, courseSlug: batchB.courseSlug, batchId: batchB.id });
  const courseStatus = async () =>
    (await tdb
      .prepare("SELECT ce.status FROM course_enrollments ce JOIN student_profiles sp ON sp.id = ce.student_id WHERE sp.user_id = ? AND ce.course_slug = ?")
      .get(student.id, batchA.courseSlug)).status;
  const total = await rowCount("batch_enrollments");

  for (const bad of ["", "DONE", "active", "PAUSED", undefined, null, "CANCELLED; DROP TABLE batch_enrollments"]) {
    assert.equal((await setEnrollmentStatus(a.enrollmentId, bad)).reason, "status_invalid", String(bad));
  }
  assert.equal((await setEnrollmentStatus("missing", "CANCELLED")).reason, "not_found");

  assert.equal((await setEnrollmentStatus(a.enrollmentId, "CANCELLED")).ok, true);
  assert.equal(await courseStatus(), "ACTIVE", "another batch of the course is still active");
  assert.equal((await setEnrollmentStatus(b.enrollmentId, "COMPLETED")).ok, true);
  assert.equal(await courseStatus(), "COMPLETED");
  assert.equal((await setEnrollmentStatus(b.enrollmentId, "CANCELLED")).ok, true);
  assert.equal(await courseStatus(), "CANCELLED");
  assert.equal((await setEnrollmentStatus(a.enrollmentId, "ACTIVE")).ok, true);
  assert.equal(await courseStatus(), "ACTIVE");
  assert.equal(await rowCount("batch_enrollments"), total, "nothing was deleted");

  // re-activating into a batch that has since closed is refused
  const closed = batches.find((x) => x.id === batchB.id);
  const originalStatus = closed.status;
  closed.status = "Closed";
  try {
    assert.equal((await setEnrollmentStatus(b.enrollmentId, "ACTIVE")).reason, "batch_closed");
  } finally {
    closed.status = originalStatus;
  }
});

// ------------------------------------------------------------- list / search
test("enrollment list: search, filters, sort and pagination", async () => {
  const { batchA, batchB } = twoBatches();
  await signIn(await makeUser("ADMIN", "lister"));
  const tag = `enq${crypto.randomUUID().slice(0, 6)}`;
  const made = [];
  for (let i = 0; i < 22; i += 1) {
    const s = await makeUser("STUDENT", `${tag}-${String(i).padStart(2, "0")}`);
    await tdb.prepare("UPDATE users SET phone = ? WHERE id = ?").run(`70000${String(i).padStart(5, "0")}`, s.id);
    const batch = i % 2 === 0 ? batchA : batchB;
    const res = await createEnrollment({ studentUserId: s.id, courseSlug: batch.courseSlug, batchId: batch.id });
    await tdb.prepare("UPDATE batch_enrollments SET enrolled_at = ? WHERE id = ?").run(`2020-01-01 00:00:${String(i).padStart(2, "0")}`, res.enrollmentId);
    made.push(res.enrollmentId);
  }
  for (const id of made.slice(0, 4)) await setEnrollmentStatus(id, "CANCELLED");

  const params = (o) => parseEnrollmentParams({ q: tag, ...o });
  const all = await getEnrollmentsPage(params({}));
  assert.equal(all.total, 22);
  assert.equal(all.rows.length, 20);
  assert.equal(all.totalPages, 2);
  assert.equal((await getEnrollmentsPage(params({ page: "2" }))).rows.length, 2);
  assert.equal((await getEnrollmentsPage(params({ page: "999" }))).page, 2);

  assert.equal((await getEnrollmentsPage(params({ status: "CANCELLED" }))).total, 4);
  assert.equal((await getEnrollmentsPage(params({ status: "ACTIVE" }))).total, 18);
  assert.equal((await getEnrollmentsPage(params({ batch: batchB.id }))).total, 11);
  assert.equal((await getEnrollmentsPage(params({ course: batchA.courseSlug }))).total, 22);
  assert.equal((await getEnrollmentsPage(params({ course: "no-such-course" }))).total, 0);
  assert.equal((await getEnrollmentsPage(params({ course: OTHER_COURSE_BATCH.courseSlug, batch: batchA.id }))).total, 0, "batch outside the course");
  assert.equal((await getEnrollmentsPage(parseEnrollmentParams({ q: "7000000003" }))).total, 1, "phone search");
  const row = all.rows[0];
  assert.equal((await getEnrollmentsPage(parseEnrollmentParams({ q: row.studentEmail }))).total, 1, "email search");

  const newest = await getEnrollmentsPage(params({ sort: "newest" }));
  const oldest = await getEnrollmentsPage(params({ sort: "oldest" }));
  assert.ok(newest.rows[0].enrolledAt > oldest.rows[0].enrolledAt);
  const names = (await getEnrollmentsPage(params({ sort: "name" }))).rows.map((r) => r.studentName.toLowerCase());
  assert.deepEqual(names, [...names].sort());

  const before = await rowCount("batch_enrollments");
  for (const evil of ["' OR 1=1 --", "'; DROP TABLE batch_enrollments; --", "%", "_", "\\"]) {
    const r = await getEnrollmentsPage(parseEnrollmentParams({ q: evil, course: evil, batch: evil, status: evil, sort: evil }));
    if (["%", "_", "\\"].includes(evil)) assert.equal(r.total, 0, `${evil} is literal`);
  }
  assert.equal(await rowCount("batch_enrollments"), before);

  const counts = await getEnrollmentCounts();
  assert.equal(counts.ACTIVE + counts.COMPLETED + counts.CANCELLED, await rowCount("batch_enrollments"));
  const dash = await getAdminDashboardData();
  assert.deepEqual(dash.enrollments, counts);
});

test("enrollment form data validates prefill and only offers active students and open batches", async () => {
  const { batchA } = twoBatches();
  const active = await makeUser("STUDENT", "formstu");
  const inactive = await makeUser("STUDENT", "formoff");
  await tdb.prepare("UPDATE users SET status = 'INACTIVE' WHERE id = ?").run(inactive.id);
  const trainer = await makeUser("TRAINER", "formtrn");
  await signIn(await makeUser("ADMIN", "form-admin"));

  const ok = await getEnrollmentFormData({ studentId: active.id, course: batchA.courseSlug, batch: batchA.id });
  assert.equal(ok.student.id, active.id);
  assert.equal(ok.initialBatch, batchA.id);
  assert.ok(ok.batches.every((b) => b.value && b.courseSlug));

  for (const bad of [inactive.id, trainer.id, "nope"]) {
    const d = await getEnrollmentFormData({ studentId: bad, studentQuery: "" });
    assert.equal(d.student, null, bad);
  }
  const mismatch = await getEnrollmentFormData({ studentId: active.id, course: OTHER_COURSE_BATCH.courseSlug, batch: batchA.id });
  assert.equal(mismatch.initialBatch, "", "mismatched batch prefill is dropped");
  assert.equal((await getEnrollmentFormData({ studentId: active.id, course: "bogus", batch: "bogus" })).initialCourse, "");

  const search = await getEnrollmentFormData({ studentQuery: "formstu" });
  assert.ok(search.candidates.some((c) => c.id === active.id));
  assert.ok(!search.candidates.some((c) => c.id === inactive.id || c.id === trainer.id));
});

// ------------------------------------------------------------------- isolation
test("students see only their own enrollments and cannot change anything", async () => {
  const { batchA, batchB } = twoBatches();
  const a = await makeUser("STUDENT", "isoA");
  const b = await makeUser("STUDENT", "isoB");
  await signIn(await makeUser("ADMIN", "iso-admin"));
  const ea = await createEnrollment({ studentUserId: a.id, courseSlug: batchA.courseSlug, batchId: batchA.id });
  const eb = await createEnrollment({ studentUserId: b.id, courseSlug: batchB.courseSlug, batchId: batchB.id });

  await signIn(a);
  assert.deepEqual((await getMyBatchEnrollments()).map((e) => e.batchId), [batchA.id]);
  assert.equal((await getMyCourseEnrollments()).length, 1);
  assert.ok((await getStudentCourseDetail(batchA.courseSlug)).enrollment, "own course is accessible");

  // a student can't act on enrollments — their own or anyone else's
  const before = [await rowCount("batch_enrollments"), await rowCount("course_enrollments")];
  assert.equal((await setEnrollmentStatusAction(null, form({ enrollmentId: ea.enrollmentId, status: "CANCELLED" }))).status, "error");
  assert.equal((await setEnrollmentStatusAction(null, form({ enrollmentId: eb.enrollmentId, status: "CANCELLED" }))).status, "error");
  assert.equal((await createEnrollmentAction(null, form({ studentId: a.id, course: batchA.courseSlug, batch: batchB.id }))).status, "error");
  assert.deepEqual([await rowCount("batch_enrollments"), await rowCount("course_enrollments")], before);
  assert.equal((await getMyBatchEnrollments()).length, 1);

  // student B has no enrollment in a course they weren't given
  await signIn(await makeUser("STUDENT", "isoC"));
  assert.equal((await getMyBatchEnrollments()).length, 0);
  assert.equal((await getStudentCourseDetail(batchA.courseSlug)).enrollment, null, "no enrollment, no access");
});

test("admin enrollment is the source of truth for the student LMS: cancelling removes it, re-enrolling restores it", async () => {
  const { batchA } = twoBatches();
  const student = await makeUser("STUDENT", "lms");
  await signIn(await makeUser("ADMIN", "lms-admin"));
  const e = await createEnrollment({ studentUserId: student.id, courseSlug: batchA.courseSlug, batchId: batchA.id });

  await signIn(student);
  assert.equal((await getMyBatchEnrollments()).length, 1);

  await signIn(await makeUser("ADMIN", "lms-admin2"));
  await setEnrollmentStatus(e.enrollmentId, "CANCELLED");
  await signIn(student);
  assert.equal((await getMyBatchEnrollments()).length, 0);
  assert.equal((await getMyCourseEnrollments()).length, 0);
  assert.equal((await getStudentCourseDetail(batchA.courseSlug)).enrollment, null);

  await signIn(await makeUser("ADMIN", "lms-admin3"));
  await createEnrollment({ studentUserId: student.id, courseSlug: batchA.courseSlug, batchId: batchA.id });
  await signIn(student);
  assert.equal((await getMyBatchEnrollments()).length, 1);
});

test("trainers see only students enrolled in their assigned batches", async () => {
  const { batchA, batchB } = twoBatches();
  const trainer = await makeUser("TRAINER", "trnA");
  await createTrainerBatchAssignment(trainer.id, batchA.id);
  const sA = await makeUser("STUDENT", "inA");
  const sB = await makeUser("STUDENT", "inB");
  await signIn(await makeUser("ADMIN", "trn-admin"));
  const eA = await createEnrollment({ studentUserId: sA.id, courseSlug: batchA.courseSlug, batchId: batchA.id });
  await createEnrollment({ studentUserId: sB.id, courseSlug: batchB.courseSlug, batchId: batchB.id });

  await signIn(trainer);
  assert.deepEqual((await getMyStudents()).map((s) => s.userId), [sA.id]);

  await signIn(await makeUser("ADMIN", "trn-admin2"));
  await setEnrollmentStatus(eA.enrollmentId, "CANCELLED");
  await signIn(trainer);
  assert.equal((await getMyStudents()).length, 0, "a cancelled enrollment leaves the trainer's list");

  // trainers can't enroll anyone
  assert.equal((await createEnrollment({ studentUserId: sB.id, courseSlug: batchA.courseSlug, batchId: batchA.id })).ok, false);
});

// ------------------------------------------------------------ lead conversion
test("converting a lead creates a STUDENT, marks it CONVERTED and links the account once", async () => {
  const admin = await makeUser("ADMIN", "converter");
  await signIn(admin);
  const lead = await seedLead({ phone: "9123456780" });
  const usersBefore = await rowCount("users");

  const res = await convertLeadToStudent(lead.id, "Temp-Pass-123");
  assert.equal(res.ok, true);
  assert.equal(res.created, true);
  assert.equal(await rowCount("users"), usersBefore + 1);

  const user = await findUserByIdInternal(res.userId);
  assert.equal(user.role, "STUDENT");
  assert.equal(user.status, "ACTIVE");
  assert.equal(user.email, lead.email);
  assert.equal(user.phone, "9123456780");
  assert.notEqual(user.passwordHash, "Temp-Pass-123");
  assert.equal(await verifyPassword("Temp-Pass-123", user.passwordHash), true);
  assert.ok(!JSON.stringify(await tdb.prepare("SELECT * FROM users WHERE id = ?").get(user.id)).includes("Temp-Pass-123"));

  const after = await getLeadById(lead.id);
  assert.equal(after.status, "CONVERTED");
  assert.equal(after.convertedUserId, user.id);
  assert.ok(after.convertedAt);

  // idempotent: a second conversion (or a double-click) changes nothing
  const again = await convertLeadToStudent(lead.id, "Another-Pass-123");
  assert.equal(again.ok, false);
  assert.match(again.reason, /already been converted/);
  assert.equal(await rowCount("users"), usersBefore + 1);
  assert.equal(await verifyPassword("Temp-Pass-123", (await findUserByIdInternal(user.id)).passwordHash), true);
});

test("conversion needs a valid password only when a new account is required, and failure leaves the lead untouched", async () => {
  await signIn(await makeUser("ADMIN", "converter2"));
  const lead = await seedLead();
  const usersBefore = await rowCount("users");
  for (const pw of ["", "short", undefined, null]) {
    assert.equal((await convertLeadToStudent(lead.id, pw)).ok, false);
  }
  assert.equal(await rowCount("users"), usersBefore);
  assert.equal((await getLeadById(lead.id)).status, "NEW");
  assert.equal((await getLeadById(lead.id)).convertedUserId, null);
  assert.equal((await convertLeadToStudent("missing", "Temp-Pass-123")).ok, false);

  // atomic: if the account insert fails mid-transaction, nothing — not even the lead status — is written
  await assert.rejects(async () =>
    await convertLeadTx({ leadId: lead.id, existingUserId: null, newStudent: { name: "X Y", email: "atomic@example.test", phone: null, passwordHash: undefined } })
  );
  assert.equal(await rowCount("users"), usersBefore);
  assert.equal((await getLeadById(lead.id)).status, "NEW");
  assert.equal(await findUserByEmailInternal("atomic@example.test"), null);
});

test("an existing active STUDENT with the lead's email is reused, not duplicated", async () => {
  await signIn(await makeUser("SUPER_ADMIN", "converter3"));
  const student = await makeUser("STUDENT", "existing");
  const lead = await seedLead({ email: student.email });
  const usersBefore = await rowCount("users");

  const res = await convertLeadToStudent(lead.id, undefined);
  assert.equal(res.ok, true);
  assert.equal(res.created, false);
  assert.equal(res.userId, student.id);
  assert.equal(await rowCount("users"), usersBefore);
  assert.equal((await getLeadById(lead.id)).convertedUserId, student.id);
  assert.equal((await getLeadById(lead.id)).status, "CONVERTED");
  const unchanged = await findUserByIdInternal(student.id);
  assert.equal(unchanged.role, "STUDENT");
  assert.equal(await verifyPassword("Correct-Horse-9", unchanged.passwordHash), true, "the existing password is untouched");
});

test("an existing non-student or inactive account is never converted, changed or linked", async () => {
  await signIn(await makeUser("ADMIN", "converter4"));
  for (const role of ["TRAINER", "ADMIN", "SUPER_ADMIN", "COUNSELLOR", "ACCOUNTANT"]) {
    const staff = await makeUser(role, "staffmail");
    const lead = await seedLead({ email: staff.email });
    const usersBefore = await rowCount("users");
    const res = await convertLeadToStudent(lead.id, "Temp-Pass-123");
    assert.equal(res.ok, false, role);
    assert.match(res.reason, /not a student account/);
    assert.equal((await findUserByIdInternal(staff.id)).role, role, "role is unchanged");
    assert.equal(await rowCount("users"), usersBefore);
    assert.equal((await getLeadById(lead.id)).status, "NEW");
    assert.equal((await getLeadById(lead.id)).convertedUserId, null);
  }
  const inactive = await makeUser("STUDENT", "off");
  await tdb.prepare("UPDATE users SET status = 'INACTIVE' WHERE id = ?").run(inactive.id);
  const lead = await seedLead({ email: inactive.email });
  assert.equal((await convertLeadToStudent(lead.id, "Temp-Pass-123")).ok, false);
  assert.equal((await getLeadById(lead.id)).status, "NEW");
});

test("only admins / super admins can convert; counsellors, students, trainers and anonymous cannot", async () => {
  const counsellor = await makeUser("COUNSELLOR", "cns");
  const lead = await seedLead();
  await tdb.prepare("UPDATE leads SET assigned_to = ? WHERE id = ?").run(counsellor.id, lead.id);

  await signOut();
  for (const who of [null, "STUDENT", "TRAINER", "ACCOUNTANT", counsellor]) {
    if (who && typeof who === "object") await signIn(who);
    else if (who) await signIn(await makeUser(who, "intruder"));
    assert.equal((await convertLeadToStudent(lead.id, "Temp-Pass-123")).ok, false);
    assert.equal((await convertLeadAction(null, form({ leadId: lead.id, password: "Temp-Pass-123" }))).status, "error");
  }
  assert.equal(await findUserByEmailInternal(lead.email), null, "no account was created for the lead");
  assert.equal((await getLeadById(lead.id)).status, "NEW");
  assert.equal((await getLeadById(lead.id)).convertedUserId, null);

  // the counsellor's own lead page offers no conversion
  await signIn(counsellor);
  const detail = await getLeadDetail(lead.id);
  assert.equal(detail.canConvert, false);
  assert.equal(detail.convertedStudent, null);
});

test("full flow: lead -> convert -> enroll -> student LMS -> trainer -> admin", async () => {
  const { batchA } = twoBatches();
  const trainer = await makeUser("TRAINER", "flowtrn");
  await createTrainerBatchAssignment(trainer.id, batchA.id);
  const admin = await makeUser("ADMIN", "flow-admin");
  const lead = await seedLead({ courseSlug: batchA.courseSlug, batchId: batchA.id, mode: "online" });

  await signIn(admin);
  assert.equal((await getLeadDetail(lead.id)).canConvert, true);
  const converted = await convertLeadToStudent(lead.id, "Temp-Pass-123");
  assert.equal(converted.ok, true);

  const afterConvert = await getLeadDetail(lead.id);
  assert.equal(afterConvert.canConvert, false);
  assert.equal(afterConvert.convertedStudent.id, converted.userId);
  assert.equal(afterConvert.convertedStudent.enrollments.length, 0);

  // the lead's course/batch prefill the enrollment form
  const formData = await getEnrollmentFormData({ studentId: converted.userId, course: lead.courseSlug, batch: lead.batchId });
  assert.equal(formData.student.id, converted.userId);
  assert.equal(formData.initialBatch, batchA.id);

  const enrolled = await createEnrollment({ studentUserId: converted.userId, courseSlug: batchA.courseSlug, batchId: batchA.id });
  assert.equal(enrolled.ok, true);
  assert.equal((await createEnrollment({ studentUserId: converted.userId, courseSlug: batchA.courseSlug, batchId: batchA.id })).reason, "duplicate");

  const afterEnroll = await getLeadDetail(lead.id);
  assert.equal(afterEnroll.convertedStudent.enrollments.length, 1);
  assert.equal(afterEnroll.convertedStudent.enrollments[0].status, "ACTIVE");

  // the new student signs in and sees the course and batch
  const studentUser = { id: converted.userId };
  await signIn(studentUser);
  assert.deepEqual((await getMyBatchEnrollments()).map((e) => e.batchId), [batchA.id]);
  assert.equal((await getMyCourseEnrollments())[0].courseSlug, batchA.courseSlug);

  // the assigned trainer sees them
  await signIn(trainer);
  assert.deepEqual((await getMyStudents()).map((s) => s.userId), [converted.userId]);

  // the admin sees the enrollment in the list and on the student page
  await signIn(admin);
  const list = await getEnrollmentsPage(parseEnrollmentParams({ q: lead.email }));
  assert.equal(list.total, 1);
  assert.equal(list.rows[0].id, enrolled.enrollmentId);
  assert.equal((await getStudentDetailForAdmin(converted.userId)).batches.length, 1);
});
