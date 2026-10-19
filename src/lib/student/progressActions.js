"use server";

// Server Actions for lesson progress (Phase 8.4). Called directly from
// client components (LearnWorkspace) — Next.js dispatches these through
// the same protected Server Action mechanism as every other mutation in
// this app (see src/lib/auth/actions.js), never a hand-rolled API route.
//
// Every mutation here re-derives "who" from the session and re-validates
// "what" against the real course data before touching the database — it
// never trusts a studentId, moduleIndex, or lessonIndex supplied by the
// caller. A courseSlug/lessonId pair is only ever accepted from the
// client as an *identifier to look up*, not as a fact to record.

import { getCurrentUser } from "@/lib/auth/currentUser";
import { getOrCreateStudentProfile } from "@/lib/db/studentProfiles";
import { listCourseEnrollmentsForStudent } from "@/lib/db/courseEnrollments";
import { getCourse } from "@/lib/catalog";
import { getCourseCurriculum, getLessonById } from "@/lib/student/curriculum";
import { recordLessonAccess, markLessonComplete } from "@/lib/db/lessonProgress";
import { computeCourseProgress } from "@/lib/student/progress";

// Shared authorization for every lesson-progress mutation:
//   1. authenticated STUDENT (getCurrentUser reads the session cookie —
//      nothing here accepts a userId/studentId parameter)
//   2. that student holds an ACTIVE/COMPLETED enrollment in this exact
//      course (never CANCELLED, never another student's enrollment)
//   3. lessonId actually resolves to a real lesson in this course's
//      *current* curriculum — getLessonById only returns a match that
//      really exists, so a stale or fabricated lessonId is rejected here
//      rather than trusted
// Returns null on any failure; every caller below must treat null as "do
// nothing and report failure" rather than proceeding.
async function authorizeLessonMutation(courseSlug, lessonId) {
  const user = await getCurrentUser();
  if (!user || user.role !== "STUDENT") return null;

  const course = getCourse(courseSlug);
  if (!course) return null;

  const profile = getOrCreateStudentProfile(user.id);
  const enrollment = listCourseEnrollmentsForStudent(profile.id).find(
    (e) => e.courseSlug === courseSlug && ["ACTIVE", "COMPLETED"].includes(e.status)
  );
  if (!enrollment) return null;

  const curriculum = getCourseCurriculum(course);
  const lesson = getLessonById(curriculum, lessonId);
  if (!lesson) return null;

  return { profile, course, lesson };
}

// Fired once when a lesson becomes the active one in the learning
// workspace (on an actual navigation — see the [activeLessonId] effect in
// LearnWorkspace.jsx — never on every render or keystroke). Only updates
// last_accessed_at (creating a zero-progress row on first view); never
// marks anything complete. This is what lets the dashboard's "Continue
// Learning" resume at the right lesson after the student comes back later.
export async function recordLessonAccessAction(courseSlug, lessonId) {
  const ctx = await authorizeLessonMutation(courseSlug, lessonId);
  if (!ctx) return { ok: false };

  recordLessonAccess(ctx.profile.id, courseSlug, ctx.lesson.moduleIndex, ctx.lesson.itemIndex);
  return { ok: true };
}

// "Mark as Complete". Idempotent by construction — see the UNIQUE
// constraint on lesson_progress and the ON CONFLICT clause in
// src/lib/db/lessonProgress.js#markLessonComplete: repeating this call for
// the same lesson updates the same row (bumping last_accessed_at) rather
// than creating a duplicate, and never resets completedAt once set.
//
// Returns the freshly recalculated course-level progress so the client
// can update its UI (percent, per-lesson completed state, "all lessons
// complete") from one round trip, without a separate fetch or a full page
// reload.
export async function markLessonCompleteAction(courseSlug, lessonId) {
  const ctx = await authorizeLessonMutation(courseSlug, lessonId);
  if (!ctx) return { ok: false };

  markLessonComplete(ctx.profile.id, courseSlug, ctx.lesson.moduleIndex, ctx.lesson.itemIndex);

  const progress = computeCourseProgress(ctx.profile.id, ctx.course);
  return {
    ok: true,
    percent: progress.percent,
    completedCount: progress.completedCount,
    totalCount: progress.totalCount,
    isComplete: progress.isComplete,
    completedLessonIds: progress.completedLessonIds,
  };
}
