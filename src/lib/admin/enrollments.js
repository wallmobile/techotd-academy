// Admin enrollment management (Phase 10.3). Every function re-derives the
// caller from the session via getAdminContext() (ADMIN / SUPER_ADMIN only —
// counsellors manage leads, not enrollments) and re-validates student,
// course, batch and their relationship against the database/catalog; ids
// from forms and URLs are only ever targets to validate.

import { getAdminContext } from "@/lib/admin/context";
import {
  listEnrollments,
  getEnrollmentById,
  listEnrollmentsForUser,
  countEnrollmentsByStatus,
  searchActiveStudents,
  getUserForEnrollment,
  createEnrollmentTx,
  setEnrollmentStatusTx,
} from "@/lib/db/enrollments";
import { ENROLLMENT_STATUSES, ENROLLABLE_BATCH_STATUSES, ENROLLMENTS_PAGE_SIZE } from "@/constants/enrollment";
import { listCourses, getCourse, listBatches, getBatch } from "@/lib/catalog";
import { notifyEnrolled, notifyEnrollmentStatus } from "@/lib/notifications/events";

const FORBIDDEN = { ok: false, reason: "forbidden", message: "You don't have permission to do that." };
const EMPTY_PAGE = { rows: [], page: 1, totalPages: 1, pageSize: ENROLLMENTS_PAGE_SIZE, total: 0 };

export const ENROLLMENT_MESSAGES = {
  student_invalid: "Please choose a valid student.",
  student_inactive: "This student's account is not active.",
  course_invalid: "Please choose a valid course.",
  course_unpublished: "This course is not published, so it can't take new enrollments.",
  batch_invalid: "Please choose a valid batch.",
  batch_mismatch: "That batch does not belong to the selected course.",
  batch_closed: "This batch is not open for enrollment.",
  duplicate: "This student is already enrolled in that batch.",
  completed: "This student has already completed that batch.",
  status_invalid: "Please choose a valid status.",
  not_found: "Enrollment not found.",
};

const fail = (reason) => ({ ok: false, reason, message: ENROLLMENT_MESSAGES[reason] });

async function courseBatchIds(courseSlug) {
  return (await listBatches({ courseSlug })).map((b) => b.id);
}

async function describe(enrollment) {
  const batch = await getBatch(enrollment.batchId);
  const course = batch ? await getCourse(batch.courseSlug) : null;
  return {
    ...enrollment,
    courseSlug: batch?.courseSlug ?? null,
    courseTitle: course?.title ?? batch?.courseSlug ?? "Unknown course",
    batchLabel: batch ? `${batch.mode} — ${batch.startDate}` : enrollment.batchId,
    batchSchedule: batch?.schedule ?? null,
    batchStatus: batch?.status ?? null,
  };
}

// {q, course, batch, status, sort, page}; course/batch/status already
// whitelisted by parseEnrollmentParams, and re-checked here against the catalog.
export async function getEnrollmentsPage({ q, course, batch, status, sort, page }) {
  if (!(await getAdminContext())) return EMPTY_PAGE;

  let batchIds = null;
  if (course) batchIds = await courseBatchIds(course);
  if (batch) batchIds = batchIds ? batchIds.filter((id) => id === batch) : [batch];

  const filters = { q, status, sort, batchIds };
  const probe = await listEnrollments({ ...filters, limit: 1, offset: 0 });
  const totalPages = Math.max(1, Math.ceil(probe.total / ENROLLMENTS_PAGE_SIZE));
  const current = Math.min(Math.max(1, page || 1), totalPages);
  const { rows, total } = await listEnrollments({ ...filters, limit: ENROLLMENTS_PAGE_SIZE, offset: (current - 1) * ENROLLMENTS_PAGE_SIZE });
  return { rows: await Promise.all(rows.map(describe)), page: current, totalPages, pageSize: ENROLLMENTS_PAGE_SIZE, total };
}

export async function getEnrollmentDetail(enrollmentId) {
  if (!(await getAdminContext())) return null;
  const enrollment = await getEnrollmentById(enrollmentId);
  return enrollment ? await describe(enrollment) : null;
}

export async function getStudentEnrollments(userId) {
  if (!(await getAdminContext())) return [];
  return await Promise.all((await listEnrollmentsForUser(userId)).map(describe));
}

export async function getEnrollmentCounts() {
  if (!(await getAdminContext())) return null;
  return await countEnrollmentsByStatus();
}

export async function getBatchFilterOptions() {
  return await Promise.all((await listBatches()).map(async (b) => ({
    value: b.id,
    courseSlug: b.courseSlug,
    label: `${(await getCourse(b.courseSlug))?.title ?? b.courseSlug} — ${b.mode} (${b.startDate})`,
  })));
}

export async function getCourseFilterOptions() {
  return (await listCourses()).map((c) => ({ value: c.slug, label: c.title }));
}

// Data for /admin/enrollments/new. `studentId`/`course`/`batch` come from
// query parameters (prefill only) and are validated; invalid ones are
// silently dropped. Students are found by search — never the whole table.
export async function getEnrollmentFormData({ studentId, studentQuery, course, batch }) {
  if (!(await getAdminContext())) return null;

  const student = studentId ? await getUserForEnrollment(studentId) : null;
  const validStudent = student && student.role === "STUDENT" && student.status === "ACTIVE" ? student : null;

  const courseOk = course && await getCourse(course, { publishedOnly: true }) ? course : "";
  const batchRow = batch ? await getBatch(batch) : null;
  const batchOk = batchRow && (!courseOk || batchRow.courseSlug === courseOk) ? batchRow : null;

  return {
    student: validStudent ? { id: validStudent.id, name: validStudent.name, email: validStudent.email } : null,
    candidates: validStudent ? [] : await searchActiveStudents(studentQuery || ""),
    // New enrollments only: published courses, open/upcoming batches.
    courses: (await listCourses({ publishedOnly: true })).map((c) => ({ value: c.slug, label: c.title })),
    batches: (await listBatches({ publicOnly: true }))
      .filter((b) => ENROLLABLE_BATCH_STATUSES.includes(b.status))
      .map((b) => ({
        value: b.id,
        courseSlug: b.courseSlug,
        label: `${b.mode} — ${b.startDate} · ${b.schedule}`,
      })),
    initialCourse: courseOk || (batchOk ? batchOk.courseSlug : ""),
    initialBatch: batchOk ? batchOk.id : "",
  };
}

// Validates student + course + batch (+ relationship, + batch openness) and
// creates the enrollment. Nothing about the relationship is taken from the UI.
export async function createEnrollment({ studentUserId, courseSlug, batchId }) {
  if (!(await getAdminContext())) return FORBIDDEN;

  const student = await getUserForEnrollment(studentUserId);
  if (!student || student.role !== "STUDENT") return fail("student_invalid");
  if (student.status !== "ACTIVE") return fail("student_inactive");

  if (typeof courseSlug !== "string" || !await getCourse(courseSlug)) return fail("course_invalid");
  if (!await getCourse(courseSlug, { publishedOnly: true })) return fail("course_unpublished");
  const batch = typeof batchId === "string" ? await getBatch(batchId) : null;
  if (!batch) return fail("batch_invalid");
  if (batch.courseSlug !== courseSlug) return fail("batch_mismatch");
  if (!ENROLLABLE_BATCH_STATUSES.includes(batch.status)) return fail("batch_closed");

  const result = await createEnrollmentTx({
    studentUserId: student.id,
    courseSlug,
    courseBatchIds: await courseBatchIds(courseSlug),
    batchId: batch.id,
  });
  if (!result.ok) return fail(result.reason);
  // Notify only after the enrollment transaction committed.
  const stamp = result.reactivated ? (await getEnrollmentById(result.enrollmentId))?.updatedAt ?? "" : "";
  await notifyEnrolled({
    userId: student.id,
    enrollmentId: result.enrollmentId,
    courseTitle: (await getCourse(courseSlug))?.title ?? courseSlug,
    stamp,
  });
  return { ok: true, enrollmentId: result.enrollmentId, studentUserId: student.id };
}

// Change status (ACTIVE / COMPLETED / CANCELLED). Never deletes. Moving to
// ACTIVE re-checks that the batch can still take enrollments.
export async function setEnrollmentStatus(enrollmentId, status) {
  if (!(await getAdminContext())) return FORBIDDEN;
  if (!ENROLLMENT_STATUSES.includes(status)) return fail("status_invalid");

  const enrollment = await getEnrollmentById(enrollmentId);
  if (!enrollment) return fail("not_found");
  const batch = await getBatch(enrollment.batchId);
  if (!batch) return fail("batch_invalid");
  if (status === "ACTIVE" && enrollment.status !== "ACTIVE" && !ENROLLABLE_BATCH_STATUSES.includes(batch.status)) {
    return fail("batch_closed");
  }

  await setEnrollmentStatusTx({
    enrollmentId: enrollment.id,
    status,
    courseSlug: batch.courseSlug,
    courseBatchIds: await courseBatchIds(batch.courseSlug),
  });
  // Only an actual change notifies (a repeated identical request is silent).
  if (enrollment.status !== status) {
    await notifyEnrollmentStatus({
      userId: enrollment.studentUserId,
      enrollmentId: enrollment.id,
      status,
      courseTitle: (await getCourse(batch.courseSlug))?.title ?? batch.courseSlug,
      stamp: (await getEnrollmentById(enrollment.id))?.updatedAt ?? "",
    });
  }
  return { ok: true, enrollmentId: enrollment.id, studentUserId: enrollment.studentUserId, status };
}
