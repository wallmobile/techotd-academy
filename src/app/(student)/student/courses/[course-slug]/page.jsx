import { displayDuration } from "@/data/courses";
import { notFound } from "next/navigation";
import Link from "next/link";
import { getStudentCourseDetail } from "@/lib/student/courses";
import { getCurrentUser } from "@/lib/auth/currentUser";
import { StudentShell } from "@/components/student/StudentShell";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";

export const metadata = {
  robots: { index: false, follow: false },
};

export default async function StudentCourseDetailPage({ params }) {
  const { "course-slug": slug } = await params;

  // getStudentCourseDetail() looks up the course by slug (public catalog
  // data — safe as a URL param) but derives the enrollment strictly from
  // the current session; there is no way for this page to show one
  // student's enrollment to another, because nothing here ever accepts a
  // studentId or enrollment id from the URL.
  const detail = await getStudentCourseDetail(slug);
  if (!detail) notFound();

  const { course, enrollment, batchEnrollment, progress, progressDetail } = detail;
  const user = await getCurrentUser();

  return (
    <StudentShell user={user} title={course.title}>
      <div className="flex flex-col gap-6">
        <div>
          <Badge variant="neutral">{course.category}</Badge>
          <h2 className="mt-3 text-xl font-semibold tracking-tight text-dark">{course.title}</h2>
          <p className="mt-2 max-w-2xl text-sm text-muted">{course.shortDescription}</p>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="flex flex-col gap-6 lg:col-span-2">
            <Card>
              <h3 className="text-sm font-semibold text-dark">Course Overview</h3>
              <p className="mt-2 text-sm text-muted">{course.description}</p>

              <dl className="mt-5 grid grid-cols-2 gap-4 text-xs sm:grid-cols-3">
                <div>
                  <dt className="text-muted">Level</dt>
                  <dd className="mt-1 font-medium text-text">{course.levelLabel}</dd>
                </div>
                <div>
                  <dt className="text-muted">Duration</dt>
                  <dd className="mt-1 font-medium text-text">{displayDuration(course)}</dd>
                </div>
                <div>
                  <dt className="text-muted">Learning Mode</dt>
                  <dd className="mt-1 font-medium text-text">{course.modes.join(" + ")}</dd>
                </div>
              </dl>

              <div className="mt-5">
                <p className="text-xs font-medium uppercase tracking-wide text-muted">Technologies</p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {course.technologies.map((tech) => (
                    <span key={tech} className="rounded-full bg-surface px-2.5 py-1 text-xs text-text">
                      {tech}
                    </span>
                  ))}
                </div>
              </div>

              <div className="mt-5">
                <Link
                  href={`/courses/${course.slug}`}
                  className="text-sm font-medium text-primary hover:text-primary-hover"
                >
                  View full course page on the public catalog →
                </Link>
              </div>
            </Card>
          </div>

          <div className="flex flex-col gap-6">
            <Card>
              <h3 className="text-sm font-semibold text-dark">Your Enrollment</h3>

              {enrollment ? (
                <>
                  <div className="mt-3 flex items-center justify-between gap-3">
                    <span className="text-xs text-muted">Status</span>
                    <Badge variant={enrollment.status === "COMPLETED" ? "success" : "primary"}>
                      {enrollment.status}
                    </Badge>
                  </div>

                  <div className="mt-4">
                    <div
                      role="progressbar"
                      aria-valuenow={progress}
                      aria-valuemin={0}
                      aria-valuemax={100}
                      aria-label={`${course.title} progress: ${progress}%`}
                      className="h-2 w-full overflow-hidden rounded-full bg-surface"
                    >
                      <div className="h-full rounded-full bg-primary" style={{ width: `${progress}%` }} />
                    </div>
                    <p className="mt-1.5 text-xs text-muted">
                      {progressDetail?.completedCount ?? 0} of {progressDetail?.totalCount ?? 0} lessons
                      complete ({progress}%)
                    </p>
                  </div>

                  {progressDetail?.isComplete && (
                    <p
                      role="status"
                      className="mt-3 rounded-md border border-success/30 bg-success/10 px-3 py-2 text-xs font-medium text-success"
                    >
                      Course learning content completed
                    </p>
                  )}

                  <Button href={`/student/courses/${course.slug}/learn`} className="mt-5 w-full">
                    Start Learning
                  </Button>
                </>
              ) : (
                <>
                  <p className="mt-3 text-sm text-muted">You&apos;re not enrolled in this course yet.</p>
                  <Button
                    href={`/book-demo?course=${course.slug}&source=student`}
                    className="mt-4 w-full"
                  >
                    Request Enrollment
                  </Button>
                </>
              )}
            </Card>

            <Card>
              <h3 className="text-sm font-semibold text-dark">Batch</h3>
              {batchEnrollment ? (
                <dl className="mt-3 flex flex-col gap-1.5 text-xs">
                  <div className="flex justify-between gap-3">
                    <dt className="text-muted">Mode</dt>
                    <dd className="font-medium text-text">{batchEnrollment.batch.mode}</dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt className="text-muted">Schedule</dt>
                    <dd className="font-medium text-text">{batchEnrollment.batch.schedule}</dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt className="text-muted">Starts</dt>
                    <dd className="font-medium text-text">{batchEnrollment.batch.startDate}</dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt className="text-muted">Location</dt>
                    <dd className="font-medium text-text">{batchEnrollment.batch.location}</dd>
                  </div>
                </dl>
              ) : (
                <p className="mt-3 text-sm text-muted">No batch assigned yet.</p>
              )}
            </Card>
          </div>
        </div>
      </div>
    </StudentShell>
  );
}
