import crypto from "node:crypto";
import { db } from "@/lib/db/client";

export const COURSE_ENROLLMENT_STATUSES = ["ACTIVE", "COMPLETED", "CANCELLED"];

function rowToEnrollment(row) {
  if (!row) return null;
  return {
    id: row.id,
    studentId: row.student_id,
    courseSlug: row.course_slug,
    status: row.status,
    enrolledAt: row.enrolled_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// `studentId` must always come from the authenticated session (via
// getOrCreateStudentProfile(getCurrentUser().id)) — never from a value the
// client supplied. See src/lib/student/dashboard.js, the only caller.
export async function listCourseEnrollmentsForStudent(studentId) {
  return (await db.all("SELECT * FROM course_enrollments WHERE student_id = ? ORDER BY enrolled_at DESC", [studentId])).map(rowToEnrollment);
}

// Foundation for a future "Enroll" action — not wired to any UI yet in
// Phase 8.1. Safe to call repeatedly: the UNIQUE(student_id, course_slug)
// constraint makes this a no-op if the enrollment already exists.
export async function createCourseEnrollment(studentId, courseSlug) {
  const id = crypto.randomUUID();
  await db.run(
    `INSERT INTO course_enrollments (id, student_id, course_slug, status)
     VALUES (?, ?, ?, 'ACTIVE')
     ON CONFLICT (student_id, course_slug) DO NOTHING`,
    [id, studentId, courseSlug]
  );

  return rowToEnrollment(await db.get("SELECT * FROM course_enrollments WHERE student_id = ? AND course_slug = ?", [studentId, courseSlug]));
}
