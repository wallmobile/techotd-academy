// Lesson/course progress computation (Phase 8.4).
//
// Pure computation over persisted src/lib/db/lessonProgress.js rows plus
// the live curriculum derived from src/data/courses.js — this file never
// stores a derived percentage anywhere; every percent/completion figure it
// returns is recalculated from the actual progress rows each time it's
// called (per the spec: "Do not manually store derived percentage unless
// there is a strong reason. Prefer calculating from progress records.").
//
// Callers pass a real `studentId` (a student_profiles.id, already derived
// from the session by the caller — see src/lib/student/courses.js and
// dashboard.js, the same pattern used everywhere else in this app) and a
// real `course` object from src/data/courses.js. Nothing here accepts
// client input directly.

import {
  listLessonProgressForStudentCourse,
  listAllLessonProgressForStudent,
} from "@/lib/db/lessonProgress";
import { getCourseCurriculum } from "@/lib/student/curriculum";

export async function computeCourseProgress(studentId, course) {
  const curriculum = getCourseCurriculum(course);
  const rows = await listLessonProgressForStudentCourse(studentId, course.slug);

  const completedLessonIds = rows
    .filter((row) => row.completed)
    .map((row) => `m${row.moduleIndex}-i${row.lessonIndex}`);

  const totalCount = curriculum.flatLessons.length;
  const completedCount = completedLessonIds.length;
  const percent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;
  const isComplete = totalCount > 0 && completedCount === totalCount;

  return { curriculum, totalCount, completedCount, percent, isComplete, completedLessonIds };
}

// The single most recently accessed lesson_progress row across every
// course this student has ever opened — used only by the dashboard to
// decide what "Continue Learning" should resume (src/lib/student/dashboard.js).
// Returns null when there's no progress anywhere yet, which is exactly
// the signal the dashboard needs to fall back to its existing
// no-progress-yet behavior rather than claiming a resume point that
// doesn't exist.
export async function getMostRecentlyAccessedProgress(studentId) {
  const rows = await listAllLessonProgressForStudent(studentId);
  return rows[0] || null;
}
