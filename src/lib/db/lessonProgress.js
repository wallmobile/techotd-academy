import crypto from "node:crypto";
import { db } from "@/lib/db/client";

function rowToProgress(row) {
  if (!row) return null;
  return {
    id: row.id,
    studentId: row.student_id,
    courseSlug: row.course_slug,
    moduleIndex: row.module_index,
    lessonIndex: row.lesson_index,
    completed: Boolean(row.completed),
    completedAt: row.completed_at,
    lastAccessedAt: row.last_accessed_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// `studentId` must always come from the authenticated session (see
// src/lib/student/progress.js and progressActions.js, the only callers) —
// never from a value a client supplied.
export async function listLessonProgressForStudentCourse(studentId, courseSlug) {
  return (await db.all("SELECT * FROM lesson_progress WHERE student_id = ? AND course_slug = ?", [studentId, courseSlug])).map(rowToProgress);
}

// Used only to find the single most-recently-accessed lesson across every
// course, for the dashboard's "Continue Learning". Still scoped to one
// student; never queries other students' rows.
export async function listAllLessonProgressForStudent(studentId) {
  return (await db.all("SELECT * FROM lesson_progress WHERE student_id = ? ORDER BY last_accessed_at DESC", [studentId])).map(rowToProgress);
}

const ONE = "SELECT * FROM lesson_progress WHERE student_id = ? AND course_slug = ? AND module_index = ? AND lesson_index = ?";

// Records that a student viewed a lesson, without marking it complete.
// Creates the row (completed = 0) on first view, or just bumps
// last_accessed_at on a later view.
//
// (moduleIndex, lessonIndex) must already be validated against the real
// course curriculum by the caller (progressActions.js).
export async function recordLessonAccess(studentId, courseSlug, moduleIndex, lessonIndex) {
  const id = crypto.randomUUID();
  await db.run(
    `INSERT INTO lesson_progress (id, student_id, course_slug, module_index, lesson_index, completed, last_accessed_at)
     VALUES (?, ?, ?, ?, ?, 0, app_now())
     ON CONFLICT (student_id, course_slug, module_index, lesson_index)
     DO UPDATE SET last_accessed_at = app_now(), updated_at = app_now()`,
    [id, studentId, courseSlug, moduleIndex, lessonIndex]
  );
  return rowToProgress(await db.get(ONE, [studentId, courseSlug, moduleIndex, lessonIndex]));
}

// Marks a lesson complete. Idempotent by construction: the UNIQUE
// constraint means a second (or hundredth) call for the same lesson
// updates the same row rather than inserting a new one, and
// COALESCE(completed_at, ...) means completed_at is only ever set the
// first time.
export async function markLessonComplete(studentId, courseSlug, moduleIndex, lessonIndex) {
  const id = crypto.randomUUID();
  await db.run(
    `INSERT INTO lesson_progress (id, student_id, course_slug, module_index, lesson_index, completed, completed_at, last_accessed_at)
     VALUES (?, ?, ?, ?, ?, 1, app_now(), app_now())
     ON CONFLICT (student_id, course_slug, module_index, lesson_index)
     DO UPDATE SET
       completed = 1,
       completed_at = COALESCE(lesson_progress.completed_at, excluded.completed_at),
       last_accessed_at = app_now(),
       updated_at = app_now()`,
    [id, studentId, courseSlug, moduleIndex, lessonIndex]
  );
  return rowToProgress(await db.get(ONE, [studentId, courseSlug, moduleIndex, lessonIndex]));
}
