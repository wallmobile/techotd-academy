import Link from "next/link";
import { getMyAssignments, getMyCourseProjects } from "@/lib/student/assignments";
import { getCurrentUser } from "@/lib/auth/currentUser";
import { StudentShell } from "@/components/student/StudentShell";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";

export const metadata = {
  title: "Assignments",
  robots: { index: false, follow: false },
};

const ASSIGNMENT_STATUS_VARIANT = { PUBLISHED: "primary", CLOSED: "neutral" };
// SUBMITTED is deliberately NOT "success" — it means "waiting for the
// trainer to evaluate it," not "done." Reserving green for REVIEWED keeps
// "submitted" and "evaluated" visually distinct, matching the actual
// Not Started / Submitted / Evaluated / Closed lifecycle.
const SUBMISSION_STATUS_VARIANT = { SUBMITTED: "primary", REVIEWED: "success", RETURNED: "warning" };

function formatDueDate(dueAt) {
  if (!dueAt) return "No due date";
  const date = new Date(`${dueAt}T00:00:00`);
  if (Number.isNaN(date.getTime())) return dueAt;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export default async function StudentAssignmentsPage() {
  // Both server functions derive the student from the session themselves
  // — nothing here accepts an id to spoof another student's assignments.
  const [assignments, projects, user] = await Promise.all([
    getMyAssignments(),
    getMyCourseProjects(),
    getCurrentUser(),
  ]);

  return (
    <StudentShell user={user} title="Assignments">
      <div className="flex flex-col gap-8">
        <p className="text-sm text-muted">Assignments published for the courses you&apos;re enrolled in.</p>

        <section aria-labelledby="assignments-heading" className="flex flex-col gap-3">
          <h2 id="assignments-heading" className="text-sm font-semibold text-dark">
            Assignments
          </h2>

          {assignments.length === 0 ? (
            <EmptyState
              title="No assignments yet"
              description="Your trainer hasn't published any assignments for your courses yet."
            />
          ) : (
            <ul className="flex flex-col gap-3">
              {assignments.map((assignment) => (
                <li key={assignment.id}>
                  <Card hoverable className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0">
                      <Link
                        href={`/student/assignments/${assignment.id}`}
                        className="text-sm font-semibold text-dark hover:text-primary"
                      >
                        {assignment.title}
                      </Link>
                      <p className="mt-0.5 text-xs text-muted">{assignment.course?.title}</p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 text-xs">
                      <span className="text-muted">Due: {formatDueDate(assignment.dueAt)}</span>
                      <Badge variant={ASSIGNMENT_STATUS_VARIANT[assignment.status] || "neutral"}>
                        {assignment.status}
                      </Badge>
                      <Badge
                        variant={
                          assignment.submission
                            ? SUBMISSION_STATUS_VARIANT[assignment.submission.status] || "neutral"
                            : "neutral"
                        }
                      >
                        {assignment.submission ? assignment.submission.status : "NOT SUBMITTED"}
                      </Badge>
                    </div>
                  </Card>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section aria-labelledby="projects-heading" className="flex flex-col gap-3">
          <div>
            <h2 id="projects-heading" className="text-sm font-semibold text-dark">
              Course Projects
            </h2>
            <p className="mt-1 text-xs text-muted">
              Capstone projects from your enrolled courses. Formal project submission isn&apos;t available yet.
            </p>
          </div>

          {projects.length === 0 ? (
            <EmptyState
              title="No course projects yet"
              description="Capstone projects will appear here once your enrolled courses include one."
            />
          ) : (
            <ul className="grid grid-cols-1 gap-3 md:grid-cols-2">
              {projects.map(({ course, lesson }) => (
                <li key={`${course.slug}-${lesson.id}`}>
                  <Card className="flex h-full flex-col gap-1.5">
                    <p className="text-sm font-semibold text-dark">{lesson.title}</p>
                    <p className="text-xs text-muted">
                      {course.title} • {lesson.moduleTitle}
                    </p>
                    <Link
                      href={`/student/courses/${course.slug}`}
                      className="mt-2 inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:text-primary-hover"
                    >
                      View Course
                      <span aria-hidden="true">→</span>
                    </Link>
                  </Card>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </StudentShell>
  );
}
