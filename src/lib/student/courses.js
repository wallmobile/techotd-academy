import { getCurrentUser } from "@/lib/auth/currentUser";
import { getOrCreateStudentProfile } from "@/lib/db/studentProfiles";
import { listCourseEnrollmentsForStudent } from "@/lib/db/courseEnrollments";
import { listBatchEnrollmentsForStudent } from "@/lib/db/batchEnrollments";
import { getBatch, getCourse } from "@/lib/catalog";
import { computeCourseProgress } from "@/lib/student/progress";

// Same pattern as src/lib/student/dashboard.js: the UI calls these
// functions, never src/lib/db/* directly, and the student identity always
// comes from getCurrentUser() — never from a slug, query param, or any
// value a caller could supply. There is no "studentId" parameter anywhere
// in this file for that reason; a course *slug* is public catalog data
// and safe to accept as a parameter, but whose enrollment is looked up is
// never a parameter.

// "My Courses" list — every non-cancelled enrollment for the signed-in
// student, enriched with its catalog course. Progress (Phase 8.4) is
// calculated from real lesson_progress rows, never estimated or stored as
// a separate column.
export async function getMyCourseEnrollments() {
  const user = await getCurrentUser();
  if (!user || user.role !== "STUDENT") return [];

  const profile = getOrCreateStudentProfile(user.id);

  return listCourseEnrollmentsForStudent(profile.id)
    .filter((enrollment) => enrollment.status !== "CANCELLED")
    .map((enrollment) => {
      const course = getCourse(enrollment.courseSlug);
      if (!course) return { ...enrollment, course: null, progress: 0 };
      return { ...enrollment, course, progress: computeCourseProgress(profile.id, course).percent };
    })
    .filter((enrollment) => Boolean(enrollment.course));
}

// Course enrollment detail for /student/courses/[course-slug]. `slug` is
// public catalog data (safe as a parameter); the enrollment/batch lookups
// underneath it are still always scoped to the current session's student.
//
// Returns:
//   - null                          -> slug isn't a real course (caller should notFound())
//   - { course, enrollment: null, … } -> real course, but this student has no enrollment in it
//   - { course, enrollment, … }       -> real course, this student's own enrollment record
//
// `progressDetail` (Phase 8.4) is only populated when there's a real
// enrollment to compute progress for; it carries the recalculated
// percent/completed-count/isComplete/curriculum the learning workspace
// needs, so the /learn route doesn't have to re-derive enrollment state a
// second time.
export async function getStudentCourseDetail(slug) {
  const course = getCourse(slug);
  if (!course) return null;

  const user = await getCurrentUser();
  if (!user || user.role !== "STUDENT") {
    return { course, enrollment: null, batchEnrollment: null, progress: 0, progressDetail: null };
  }

  const profile = getOrCreateStudentProfile(user.id);

  const enrollment =
    listCourseEnrollmentsForStudent(profile.id).find(
      (e) => e.courseSlug === course.slug && e.status !== "CANCELLED"
    ) || null;

  const batchEnrollment =
    listBatchEnrollmentsForStudent(profile.id)
      .filter((e) => e.status !== "CANCELLED")
      .map((e) => ({ ...e, batch: getBatch(e.batchId) }))
      .find((e) => e.batch && e.batch.courseSlug === course.slug) || null;

  const progressDetail = enrollment ? computeCourseProgress(profile.id, course) : null;

  return {
    course,
    enrollment,
    batchEnrollment,
    progress: progressDetail?.percent ?? 0,
    progressDetail,
  };
}
