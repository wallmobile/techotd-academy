import Link from "next/link";
import { getMyManagedAssignments } from "@/lib/trainer/assignments";
import { getCurrentUser } from "@/lib/auth/currentUser";
import { TrainerShell } from "@/components/trainer/TrainerShell";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";

export const metadata = {
  title: "Assignments",
  robots: { index: false, follow: false },
};

const STATUS_VARIANT = { DRAFT: "neutral", PUBLISHED: "primary", CLOSED: "warning" };

function formatDueDate(dueAt) {
  if (!dueAt) return "No due date";
  const date = new Date(`${dueAt}T00:00:00`);
  if (Number.isNaN(date.getTime())) return dueAt;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export default async function TrainerAssignmentsPage() {
  // getMyManagedAssignments() only ever returns assignments for courses
  // this trainer teaches (and, when batch-scoped, only their own batch).
  const [assignments, user] = await Promise.all([getMyManagedAssignments(), getCurrentUser()]);

  return (
    <TrainerShell user={user} title="Assignments">
      <div className="flex flex-col gap-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold tracking-tight text-dark">Assignments</h2>
            <p className="mt-1 text-sm text-muted">Assignments across the courses you teach.</p>
          </div>
          <Button href="/trainer/assignments/new" size="sm">
            New Assignment
          </Button>
        </div>

        {assignments.length === 0 ? (
          <EmptyState
            title="No assignments yet"
            description="Create an assignment for one of your courses to get started."
            actionLabel="New Assignment"
            actionHref="/trainer/assignments/new"
          />
        ) : (
          <ul className="flex flex-col gap-3">
            {assignments.map((assignment) => (
              <li key={assignment.id}>
                <Link href={`/trainer/assignments/${assignment.id}`}>
                  <Card hoverable className="flex flex-wrap items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-dark">{assignment.title}</p>
                      <p className="mt-0.5 text-xs text-muted">
                        {assignment.course.title}
                        {assignment.batch ? ` • ${assignment.batch.mode}` : " • All batches"}
                        {" • Due: "}
                        {formatDueDate(assignment.dueAt)}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      {assignment.pendingReviewCount > 0 && (
                        <Badge variant="danger">{assignment.pendingReviewCount} pending</Badge>
                      )}
                      <Badge variant={STATUS_VARIANT[assignment.status] || "neutral"}>{assignment.status}</Badge>
                    </div>
                  </Card>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </TrainerShell>
  );
}
