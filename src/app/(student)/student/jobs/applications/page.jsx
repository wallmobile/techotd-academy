import Link from "next/link";
import { getMyApplications } from "@/lib/student/jobs";
import { getCurrentUser } from "@/lib/auth/currentUser";
import { StudentShell } from "@/components/student/StudentShell";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { APPLICATION_STATUS_LABELS } from "@/constants/placement";
import { formatDbDate } from "@/lib/utils";

export const metadata = {
  title: "My Applications",
  robots: { index: false, follow: false },
};

export default async function StudentApplicationsPage() {
  // Derived from the session; staff notes are never selected for this view.
  const [applications, user] = await Promise.all([getMyApplications(), getCurrentUser()]);

  return (
    <StudentShell user={user} title="My Applications">
      <div className="flex flex-col gap-6">
        <Link href="/student/jobs" className="text-sm font-medium text-primary hover:text-primary-hover">
          ← Browse jobs
        </Link>
        {applications.length === 0 ? (
          <EmptyState title="No applications yet" description="Jobs you apply to will appear here with their current status." />
        ) : (
          <ul className="flex flex-col gap-4">
            {applications.map((a) => (
              <li key={a.id}>
                <Card>
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <Link href={`/student/jobs/${a.jobId}`} className="text-sm font-semibold text-dark hover:text-primary">
                        {a.jobTitle}
                      </Link>
                      <p className="text-xs text-muted">
                        {a.companyName} · applied {formatDbDate(a.appliedAt)}
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <Badge variant="primary">{APPLICATION_STATUS_LABELS[a.status]}</Badge>
                      {a.placementConfirmed && <Badge variant="success">Placement confirmed</Badge>}
                    </div>
                  </div>
                </Card>
              </li>
            ))}
          </ul>
        )}
      </div>
    </StudentShell>
  );
}
