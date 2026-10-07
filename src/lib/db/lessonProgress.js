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
export function listLessonProgressForStudentCourse(studentId, courseSlug) {
  return db
    .prepare("SELECT * FROM lesson_progress WHERE student_id = ? AND course_slug = ?")
    .all(studentId, courseSlug)
    .map(rowToProgress);
}

// Used only to find the single most-recently-accessed lesson across every
// course, for the dashboard's "Continue Learning" — see
// src/lib/student/progress.js#getLastAccessedAcrossCourses. Still scoped
// to one student; never queries other students' rows.
export function listAllLessonProgressForStudent(studentId) {
  return db
    .prepare("SELECT * FROM lesson_progress WHERE student_id = ? ORDER BY last_accessed_at DESC")
    .all(studentId)
    .map(rowToProgress);
}

// Records that a student viewed a lesson, without marking it complete.
// Creates the row (completed = 0) on first view, or just bumps
// last_accessed_at on a later view — this is what lets the dashboard know
// which lesson to resume, and is the only thing that runs when a lesson
// becomes active in the learning workspace (not on every render/keystroke,
// only on an actual lesson change — see LearnWorkspace.jsx).
//
// (moduleIndex, lessonIndex) must already be validated against the real
// course curriculum by the caller (progressActions.js) — this module never
// re-derives or re-checks that itself.
export function recordLessonAccess(studentId, courseSlug, moduleIndex, lessonIndex) {
  const id = crypto.randomUUID();
  db.prepare(
    `INSERT INTO lesson_progress (id, student_id, course_slug, module_index, lesson_index, completed, last_accessed_at)
     VALUES (?, ?, ?, ?, ?, 0, datetime('now'))
     ON CONFLICT (student_id, course_slug, module_index, lesson_index)
     DO UPDATE SET last_accessed_at = datetime('now'), updated_at = datetime('now')`
  ).run(id, studentId, courseSlug, moduleIndex, lessonIndex);

  return rowToProgress(
    db
      .prepare(
        "SELECT * FROM lesson_progress WHERE student_id = ? AND course_slug = ? AND module_index = ? AND lesson_index = ?"
      )
      .get(studentId, courseSlug, moduleIndex, lessonIndex)
  );
}

// Marks a lesson complete. Idempotent by construction: the UNIQUE
// constraint means a second (or hundredth) call for the same lesson
// updates the same row rather than inserting a new one, and
// COALESCE(completed_at, ...) means completed_at is only ever set the
// first time — repeating the click doesn't reset "when this was finished".
export function markLessonComplete(studentId, courseSlug, moduleIndex, lessonIndex) {
  const id = crypto.randomUUID();
  db.prepare(
    `INSERT INTO lesson_progress (id, student_id, course_slug, module_index, lesson_index, completed, completed_at, last_accessed_at)
     VALUES (?, ?, ?, ?, ?, 1, datetime('now'), datetime('now'))
     ON CONFLICT (student_id, course_slug, module_index, lesson_index)
     DO UPDATE SET
       completed = 1,
       completed_at = COALESCE(lesson_progress.completed_at, excluded.completed_at),
       last_accessed_at = datetime('now'),
       updated_at = datetime('now')`
  ).run(id, studentId, courseSlug, moduleIndex, lessonIndex);

  return rowToProgress(
    db
      .prepare(
        "SELECT * FROM lesson_progress WHERE student_id = ? AND course_slug = ? AND module_index = ? AND lesson_index = ?"
      )
      .get(studentId, courseSlug, moduleIndex, lessonIndex)
  );
}
