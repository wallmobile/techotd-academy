import { notFound } from "next/navigation";
import Link from "next/link";
import { getSubmissionsForAssignment } from "@/lib/trainer/submissions";
import { getMyBatchOptions } from "@/lib/trainer/classSessions";
import { getCurrentUser } from "@/lib/auth/currentUser";
import { TrainerShell } from "@/components/trainer/TrainerShell";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { AssignmentForm } from "@/components/trainer/assignments/AssignmentForm";
import { EvaluationForm } from "@/components/trainer/assignments/EvaluationForm";

export const metadata = {
  title: "Manage Assignment",
  robots: { index: false, follow: false },
};

const SUBMISSION_STATUS_VARIANT = { SUBMITTED: "warning", REVIEWED: "success", RETURNED: "danger" };

function formatSubmittedAt(submittedAt) {
  const date = new Date(submittedAt.replace(" ", "T") + "Z");
  if (Number.isNaN(date.getTime())) return submittedAt;
  return date.toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" });
}

export default async function TrainerAssignmentDetailPage({ params }) {
  const { "assignment-id": assignmentId } = await params;

  // getSubmissionsForAssignment() returns null both when this assignment
  // doesn't exist AND when it exists but isn't one of this trainer's own
  // (spec Step 11) — notFound() either way.
  const [detail, batches, user] = await Promise.all([
    getSubmissionsForAssignment(assignmentId),
    getMyBatchOptions(),
    getCurrentUser(),
  ]);
  if (!detail) notFound();

  const { assignment, course, batch, submissions } = detail;

  return (
    <TrainerShell user={user} title="Manage Assignment">
      <div className="flex flex-col gap-6">
        <div>
          <Link href="/trainer/assignments" className="text-xs font-medium text-primary hover:text-primary-hover">
            ← Back to Assignments
          </Link>
          <h2 className="mt-1 text-xl font-semibold tracking-tight text-dark">{assignment.title}</h2>
          <p className="mt-1 text-sm text-muted">
            {course.title}
            {batch ? ` — ${batch.mode}` : " — All batches"}
          </p>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <Card>
            <h3 className="text-sm font-semibold text-dark">Assignment Details</h3>
            <div className="mt-4">
              <AssignmentForm mode="edit" batches={batches} assignment={assignment} course={course} assignmentId={assignmentId} />
            </div>
          </Card>

          <div className="flex flex-col gap-4">
            <h3 className="text-sm font-semibold text-dark">
              Submissions {submissions.length > 0 && `(${submissions.length})`}
            </h3>

            {submissions.length === 0 ? (
              <EmptyState
                title="No submissions yet"
                description="Submissions from students will appear here once they submit this assignment."
              />
            ) : (
              <ul className="flex flex-col gap-4">
                {submissions.map((submission) => (
                  <li key={submission.id}>
                    <Card>
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-dark">{submission.studentName}</p>
                          <p className="text-xs text-muted">{submission.studentEmail}</p>
                          <p className="mt-1 text-xs text-muted">
                            Submitted {formatSubmittedAt(submission.submittedAt)}
                            {submission.score !== null && submission.score !== undefined && ` • Score: ${submission.score}/100`}
                          </p>
                        </div>
                        <Badge variant={SUBMISSION_STATUS_VARIANT[submission.status] || "neutral"}>
                          {submission.status}
                        </Badge>
                      </div>

                      <p className="mt-3 whitespace-pre-wrap rounded-sm border border-border bg-surface px-3 py-2 text-sm text-text">
                        {submission.submissionText || "(No text submitted.)"}
                      </p>

                      <EvaluationForm submission={submission} />
                    </Card>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </TrainerShell>
  );
}
