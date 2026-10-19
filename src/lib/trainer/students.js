// "My Students" for a trainer (Phase 9.1). Derived strictly through
// Trainer -> Assigned Batch -> Enrollment -> Student — never a query
// against every student in the database. Same pattern as the rest of the
// trainer domain layer: identity comes from getCurrentUser() via
// getTrainerContext(), never a studentId a caller could supply.

import { getTrainerContext } from "@/lib/trainer/context";
import { listEnrolledStudentsForBatchIds } from "@/lib/db/batchEnrollments";
import { getBatch, getCourse } from "@/lib/catalog";
import { computeCourseProgress } from "@/lib/student/progress";

function enrichEnrollmentRow(row) {
  const batch = getBatch(row.batchId);
  if (!batch) return null;
  const course = getCourse(batch.courseSlug);
  if (!course) return null;

  const progress = computeCourseProgress(row.studentProfileId, course);

  return {
    studentProfileId: row.studentProfileId,
    userId: row.userId,
    name: row.name,
    email: row.email,
    enrollmentStatus: row.enrollmentStatus,
    enrolledAt: row.enrolledAt,
    batch,
    course,
    progressPercent: progress.percent,
  };
}

// One row per (student, batch) enrollment — a student enrolled in two of
// the trainer's batches appears twice, once per batch, since that's the
// real relationship being shown (spec section 7's table columns are
// per-batch: course, batch, enrollment status).
export async function getMyStudents() {
  const ctx = await getTrainerContext();
  if (!ctx) return [];

  return listEnrolledStudentsForBatchIds(ctx.batchIds).map(enrichEnrollmentRow).filter(Boolean);
}

// Student detail for /trainer/students/[student-id]. `studentProfileId`
// is never trusted on its own — this only returns data once at least one
// of that student's enrollments is confirmed to be in one of THIS
// trainer's assigned batches. Returns null for "doesn't exist" and
// "exists but isn't one of my students" identically, so a trainer can't
// distinguish the two by probing ids (same discipline as every student
// LMS detail route).
export async function getStudentDetailForTrainer(studentProfileId) {
  const ctx = await getTrainerContext();
  if (!ctx) return null;

  const rows = listEnrolledStudentsForBatchIds(ctx.batchIds).filter(
    (row) => row.studentProfileId === studentProfileId
  );
  if (rows.length === 0) return null;

  const enrollments = rows.map(enrichEnrollmentRow).filter(Boolean);
  if (enrollments.length === 0) return null;

  const { name, email, userId } = rows[0];
  return { studentProfileId, userId, name, email, enrollments };
}
