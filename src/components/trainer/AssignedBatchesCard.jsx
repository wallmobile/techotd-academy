import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";

const STATUS_VARIANT = { Open: "primary", Upcoming: "warning", Closed: "neutral" };

/**
 * Dashboard "Assigned Batches" section (spec Step 4). Real data only —
 * batch/course come from the file-based catalog, studentCount is a live
 * COUNT(*) over batch_enrollments (src/lib/db/batchEnrollments.js). An
 * empty list renders an honest "No batches assigned yet." rather than a
 * fabricated row.
 */
export function AssignedBatchesCard({ batches }) {
  return (
    <Card className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-sm font-semibold text-dark">Assigned Batches</h3>
        <Link href="/trainer/batches" className="text-xs font-medium text-primary hover:text-primary-hover">
          View all
        </Link>
      </div>

      {batches.length === 0 ? (
        <p className="text-sm text-muted">No batches assigned yet.</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {batches.slice(0, 4).map(({ batch, course, studentCount }) => (
            <li key={batch.id} className="rounded-md border border-border bg-white p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-dark">{course.title}</p>
                  <p className="mt-0.5 text-xs text-muted">
                    {batch.mode} • {batch.schedule}
                  </p>
                </div>
                <Badge variant={STATUS_VARIANT[batch.status] || "neutral"}>{batch.status}</Badge>
              </div>
              <p className="mt-2 text-xs text-muted">
                {studentCount} {studentCount === 1 ? "student" : "students"}
              </p>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
