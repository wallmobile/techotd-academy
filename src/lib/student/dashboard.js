import { getCurrentUser } from "@/lib/auth/currentUser";
import { getOrCreateStudentProfile } from "@/lib/db/studentProfiles";
import { listCourseEnrollmentsForStudent } from "@/lib/db/courseEnrollments";
import { listBatchEnrollmentsForStudent } from "@/lib/db/batchEnrollments";
import { getBatch, getCourse } from "@/lib/catalog";
import { computeCourseProgress, getMostRecentlyAccessedProgress } from "@/lib/student/progress";
import { listSessionsForBatchIds } from "@/lib/db/classSessions";

// The one server function the Student LMS UI calls for dashboard data.
// UI components never touch src/lib/db/* directly (see the architecture
// note in Phase 8.1's spec, section 16) — they call this, and this is the
// only place that decides *whose* data to load.
//
// Security: the student identity always comes from getCurrentUser(),
// which reads the server-side session cookie. Nothing here accepts a
// studentId/userId from a caller — there is no parameter to spoof.
export async function getStudentDashboardData() {
  const user = await getCurrentUser();
  if (!user || user.role !== "STUDENT") return null;

  const profile = getOrCreateStudentProfile(user.id);

  const courseEnrollments = listCourseEnrollmentsForStudent(profile.id)
    .map((enrollment) => ({ ...enrollment, course: getCourse(enrollment.courseSlug) }))
    // An enrollment whose course slug no longer exists in the catalog is
    // dropped rather than shown with missing/undefined course details.
    .filter((enrollment) => Boolean(enrollment.course));

  const batchEnrollments = listBatchEnrollmentsForStudent(profile.id)
    .map((enrollment) => ({ ...enrollment, batch: getBatch(enrollment.batchId) }))
    .filter((enrollment) => Boolean(enrollment.batch))
    .map((enrollment) => ({
      ...enrollment,
      course: getCourse(enrollment.batch.courseSlug),
    }));

  // Real per-lesson progress (Phase 8.4), calculated from lesson_progress
  // rows — never stored or guessed. One computeCourseProgress call per
  // active enrollment (bounded by how many courses a student is actually
  // in, not the whole database).
  const activeCourseEnrollments = courseEnrollments
    .filter((e) => e.status === "ACTIVE")
    .map((e) => ({ ...e, progress: computeCourseProgress(profile.id, e.course).percent }));
  const completedCourseEnrollments = courseEnrollments.filter((e) => e.status === "COMPLETED");
  const activeBatchEnrollment = batchEnrollments.find((e) => e.status === "ACTIVE") || null;

  // "Continue Learning" prefers the course/lesson the student most
  // recently actually opened. If they've never opened a lesson anywhere
  // (no lesson_progress rows at all), there's nothing to resume, and this
  // falls back to their first active enrollment instead — same as the
  // pre-8.4 behavior — rather than fabricating a resume point.
  const mostRecent = getMostRecentlyAccessedProgress(profile.id);
  let continueLearningEnrollment = null;
  if (mostRecent) {
    const match = activeCourseEnrollments.find((e) => e.courseSlug === mostRecent.courseSlug);
    if (match) {
      continueLearningEnrollment = {
        ...match,
        resumeLessonId: `m${mostRecent.moduleIndex}-i${mostRecent.lessonIndex}`,
      };
    }
  }
  if (!continueLearningEnrollment) {
    continueLearningEnrollment = activeCourseEnrollments[0] || null;
  }

  const overallProgress =
    activeCourseEnrollments.length > 0
      ? Math.round(
          activeCourseEnrollments.reduce((sum, e) => sum + e.progress, 0) / activeCourseEnrollments.length
        )
      : 0;

  // Optional "Upcoming Class" (Phase 8.5): the single next real class
  // session across every batch this student is (non-cancelled) enrolled
  // in — scoped to their own batch ids only, never fabricated when no
  // session has been published yet.
  const nonCancelledBatchIds = batchEnrollments
    .filter((e) => e.status !== "CANCELLED")
    .map((e) => e.batchId);
  const now = new Date();
  const nextSession = listSessionsForBatchIds(nonCancelledBatchIds)
    .filter((s) => s.status !== "CANCELLED" && new Date(`${s.sessionDate}T${s.startTime}:00`) >= now)
    .sort(
      (a, b) =>
        new Date(`${a.sessionDate}T${a.startTime}:00`) - new Date(`${b.sessionDate}T${b.startTime}:00`)
    )
    .map((s) => ({ ...s, batch: getBatch(s.batchId), course: getCourse(getBatch(s.batchId).courseSlug) }))[0] || null;

  return {
    user,
    profile,
    activeCourseEnrollments,
    completedCourseEnrollments,
    activeBatchEnrollment,
    continueLearningEnrollment,
    nextSession,
    stats: {
      activeCourses: activeCourseEnrollments.length,
      completedCourses: completedCourseEnrollments.length,
      currentBatchLabel: activeBatchEnrollment ? activeBatchEnrollment.course.title : "None",
      overallProgress,
    },
  };
}
