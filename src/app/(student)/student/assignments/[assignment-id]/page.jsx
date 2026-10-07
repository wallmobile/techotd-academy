import { notFound } from "next/navigation";
import Link from "next/link";
import { getAssignmentDetailForStudent } from "@/lib/student/assignments";
import { getCurrentUser } from "@/lib/auth/currentUser";
import { StudentShell } from "@/components/student/StudentShell";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { AssignmentSubmissionForm } from "@/components/student/assignments/AssignmentSubmissionForm";

export const metadata = {
  robots: { index: false, follow: false },
};

const ASSIGNMENT_STATUS_VARIANT = { PUBLISHED: "primary", CLOSED: "neutral" };
// SUBMITTED is deliberately NOT "success" — see the same note on the
// assignments list page. Green is reserved for REVIEWED (actually evaluated).
const SUBMISSION_STATUS_VARIANT = { SUBMITTED: "primary", REVIEWED: "success", RETURNED: "warning" };

function formatDueDate(dueAt) {
  if (!dueAt) return "No due date";
  const date = new Date(`${dueAt}T00:00:00`);
  if (Number.isNaN(date.getTime())) return dueAt;
  return date.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" });
}

function formatSubmittedAt(submittedAt) {
  const date = new Date(submittedAt.replace(" ", "T") + "Z");
  if (Number.isNaN(date.getTime())) return submittedAt;
  return date.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default async function StudentAssignmentDetailPage({ params }) {
  const { "assignment-id": assignmentId } = await params;

  // getAssignmentDetailForStudent() returns null for every reason a
  // student shouldn't see this assignment — doesn't exist, still DRAFT,
  // wrong course, wrong batch — and this page responds identically
  // (notFound) in every case, so an id can't be used to distinguish
  // "doesn't exist" from "isn't yours".
  const detail = await getAssignmentDetailForStudent(assignmentId);
  if (!detail) notFound();

  const { assignment, course, submission } = detail;
  const user = await getCurrentUser();
  const isClosed = assignment.status === "CLOSED";

  return (
    <StudentShell user={user} title="Assignment">
      <div className="flex flex-col gap-6">
        <div>
          <Link
            href="/student/assignments"
            className="text-xs font-medium text-primary hover:text-primary-hover"
          >
            ← Back to Assignments
          </Link>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <h2 className="text-xl font-semibold tracking-tight text-dark">{assignment.title}</h2>
            <Badge variant={ASSIGNMENT_STATUS_VARIANT[assignment.status] || "neutral"}>
              {assignment.status}
            </Badge>
          </div>
          <p className="mt-1 text-sm text-muted">
            {course.title}
            {" • "}Due: {formatDueDate(assignment.dueAt)}
          </p>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="flex flex-col gap-6 lg:col-span-2">
            <Card>
              <h3 className="text-sm font-semibold text-dark">Instructions</h3>
              {assignment.description ? (
                <p className="mt-2 whitespace-pre-wrap text-sm text-muted">{assignment.description}</p>
              ) : (
                <p className="mt-2 text-sm text-muted">No additional instructions were provided.</p>
              )}
            </Card>

            <Card>
              <h3 className="text-sm font-semibold text-dark">Your Submission</h3>
              <p className="mt-1 text-xs text-muted">
                Submit your answer as text below.
              </p>
              <div className="mt-4">
                <AssignmentSubmissionForm
                  assignmentId={assignment.id}
                  existingSubmission={submission}
                  isClosed={isClosed}
                />
              </div>
            </Card>
          </div>

          <div className="flex flex-col gap-6">
            <Card>
              <h3 className="text-sm font-semibold text-dark">Submission Status</h3>
              <div className="mt-3 flex items-center justify-between gap-3">
                <span className="text-xs text-muted">Status</span>
                <Badge variant={submission ? SUBMISSION_STATUS_VARIANT[submission.status] || "neutral" : "neutral"}>
                  {submission ? submission.status : "NOT SUBMITTED"}
                </Badge>
              </div>
              {submission && (
                <p className="mt-3 text-xs text-muted">
                  Last submitted {formatSubmittedAt(submission.submittedAt)}
                </p>
              )}
            </Card>

            {submission?.evaluatedAt && (
              <Card>
                <h3 className="text-sm font-semibold text-dark">Trainer Feedback</h3>
                {submission.score !== null && submission.score !== undefined && (
                  <p className="mt-2 text-sm text-text">
                    Score: <span className="font-semibold text-dark">{submission.score}/100</span>
                  </p>
                )}
                {submission.feedback ? (
                  <p className="mt-2 whitespace-pre-wrap text-sm text-muted">{submission.feedback}</p>
                ) : (
                  <p className="mt-2 text-sm text-muted">No written feedback was left.</p>
                )}
              </Card>
            )}

            <Card>
              <h3 className="text-sm font-semibold text-dark">Course</h3>
              <Link
                href={`/student/courses/${course.slug}`}
                className="mt-2 inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:text-primary-hover"
              >
                {course.title}
                <span aria-hidden="true">→</span>
              </Link>
            </Card>
          </div>
        </div>
      </div>
    </StudentShell>
  );
}
