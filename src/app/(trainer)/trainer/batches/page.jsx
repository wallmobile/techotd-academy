import Link from "next/link";
import { getMyAssignedBatches } from "@/lib/trainer/batches";
import { getCurrentUser } from "@/lib/auth/currentUser";
import { TrainerShell } from "@/components/trainer/TrainerShell";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";

export const metadata = {
  title: "My Batches",
  robots: { index: false, follow: false },
};

const STATUS_VARIANT = { Open: "primary", Upcoming: "warning", Closed: "neutral" };

export default async function TrainerBatchesPage() {
  // getMyAssignedBatches() derives the trainer from the session itself —
  // there is no id anywhere in this route to spoof another trainer's
  // batch assignment. Editing course/batch master data is deliberately
  // not offered here — the trainer is consuming/managing their assigned
  // teaching data only, per the spec.
  const [batches, user] = await Promise.all([getMyAssignedBatches(), getCurrentUser()]);

  return (
    <TrainerShell user={user} title="My Batches">
      <div className="flex flex-col gap-6">
        <div>
          <h2 className="text-xl font-semibold tracking-tight text-dark">My Batches</h2>
          <p className="mt-1 text-sm text-muted">The batches currently assigned to you.</p>
        </div>

        {batches.length === 0 ? (
          <EmptyState
            title="No batches assigned yet"
            description="Once you're assigned to a batch, it will appear here with your students and schedule."
          />
        ) : (
          <ul className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {batches.map(({ batch, course, studentCount }) => (
              <li key={batch.id}>
                <Card className="flex h-full flex-col">
                  <div className="flex items-start justify-between gap-3">
                    <p className="text-sm font-semibold text-dark">{course.title}</p>
                    <Badge variant={STATUS_VARIANT[batch.status] || "neutral"}>{batch.status}</Badge>
                  </div>

                  <dl className="mt-4 flex flex-col gap-1.5 text-xs">
                    <div className="flex justify-between gap-3">
                      <dt className="text-muted">Mode</dt>
                      <dd className="font-medium text-text">{batch.mode}</dd>
                    </div>
                    <div className="flex justify-between gap-3">
                      <dt className="text-muted">Schedule</dt>
                      <dd className="font-medium text-text">{batch.schedule}</dd>
                    </div>
                    <div className="flex justify-between gap-3">
                      <dt className="text-muted">Starts</dt>
                      <dd className="font-medium text-text">{batch.startDate}</dd>
                    </div>
                    {batch.location && (
                      <div className="flex justify-between gap-3">
                        <dt className="text-muted">Location</dt>
                        <dd className="font-medium text-text">{batch.location}</dd>
                      </div>
                    )}
                    <div className="flex justify-between gap-3">
                      <dt className="text-muted">Students</dt>
                      <dd className="font-medium text-text">{studentCount}</dd>
                    </div>
                  </dl>

                  <Link
                    href={`/trainer/students?batch=${encodeURIComponent(batch.id)}`}
                    className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:text-primary-hover"
                  >
                    View Students
                    <span aria-hidden="true">→</span>
                  </Link>
                </Card>
              </li>
            ))}
          </ul>
        )}
      </div>
    </TrainerShell>
  );
}
