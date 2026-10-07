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
export function listCourseEnrollmentsForStudent(studentId) {
  return db
    .prepare("SELECT * FROM course_enrollments WHERE student_id = ? ORDER BY enrolled_at DESC")
    .all(studentId)
    .map(rowToEnrollment);
}

// Foundation for a future "Enroll" action — not wired to any UI yet in
// Phase 8.1. Safe to call repeatedly: the UNIQUE(student_id, course_slug)
// constraint makes this a no-op if the enrollment already exists.
export function createCourseEnrollment(studentId, courseSlug) {
  const id = crypto.randomUUID();
  db.prepare(
    `INSERT INTO course_enrollments (id, student_id, course_slug, status)
     VALUES (?, ?, ?, 'ACTIVE')
     ON CONFLICT (student_id, course_slug) DO NOTHING`
  ).run(id, studentId, courseSlug);

  return rowToEnrollment(
    db
      .prepare("SELECT * FROM course_enrollments WHERE student_id = ? AND course_slug = ?")
      .get(studentId, courseSlug)
  );
}
