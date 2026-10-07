import { notFound, redirect } from "next/navigation";
import { getStudentCourseDetail } from "@/lib/student/courses";
import { getCourseCurriculum, getLessonById } from "@/lib/student/curriculum";
import { StudentShell } from "@/components/student/StudentShell";
import { LearnWorkspace } from "@/components/student/learn/LearnWorkspace";
import { getCurrentUser } from "@/lib/auth/currentUser";

export const metadata = {
  title: "Learn",
  robots: { index: false, follow: false },
};

export default async function StudentCourseLearnPage({ params, searchParams }) {
  const { "course-slug": slug } = await params;
  const resolvedSearchParams = await searchParams;

  // getStudentCourseDetail() looks up the course by slug (public catalog
  // data) but resolves `enrollment` strictly from the current session —
  // there is no studentId/enrollment id anywhere in this URL to spoof.
  const detail = await getStudentCourseDetail(slug);
  if (!detail) notFound();

  // Security gate: an unenrolled visitor (or an enrollment that's been
  // CANCELLED — getStudentCourseDetail already excludes those) never sees
  // the learning workspace. Sent to the course's own status page, which
  // honestly explains they aren't enrolled, rather than a bare 404/403.
  if (!detail.enrollment || !["ACTIVE", "COMPLETED"].includes(detail.enrollment.status)) {
    redirect(`/student/courses/${detail.course.slug}`);
  }

  const curriculum = getCourseCurriculum(detail.course);

  const requestedLessonId =
    typeof resolvedSearchParams?.lesson === "string" ? resolvedSearchParams.lesson : "";
  const requestedLesson = getLessonById(curriculum, requestedLessonId);
  const initialLessonId = requestedLesson ? requestedLesson.id : curriculum.flatLessons[0]?.id || null;

  const user = await getCurrentUser();

  // detail.progressDetail is populated whenever there's a real enrollment
  // (which is guaranteed at this point — see the redirect above), and
  // carries the real, recalculated-from-lesson_progress state (Phase
  // 8.4). Falling back to zero/empty here only guards the type, not a
  // realistic runtime path.
  const initialProgress = {
    percent: detail.progressDetail?.percent ?? 0,
    completedCount: detail.progressDetail?.completedCount ?? 0,
    totalCount: detail.progressDetail?.totalCount ?? curriculum.flatLessons.length,
    isComplete: detail.progressDetail?.isComplete ?? false,
    completedLessonIds: detail.progressDetail?.completedLessonIds ?? [],
  };

  return (
    <StudentShell user={user} title={detail.course.title}>
      <LearnWorkspace
        courseSlug={detail.course.slug}
        course={detail.course}
        curriculum={curriculum}
        initialLessonId={initialLessonId}
        batchEnrollment={detail.batchEnrollment}
        initialProgress={initialProgress}
      />
    </StudentShell>
  );
}
