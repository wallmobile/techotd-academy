import { getMyBatchEnrollments } from "@/lib/student/batches";
import { getCurrentUser } from "@/lib/auth/currentUser";
import { StudentShell } from "@/components/student/StudentShell";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import Link from "next/link";

export const metadata = {
  title: "My Batches",
  robots: { index: false, follow: false },
};

const STATUS_VARIANT = { ACTIVE: "primary", COMPLETED: "success" };

export default async function StudentBatchesPage() {
  // getMyBatchEnrollments() derives the student from the session itself —
  // there is no id anywhere in this route to spoof another student's
  // batch assignment.
  const [enrollments, user] = await Promise.all([getMyBatchEnrollments(), getCurrentUser()]);

  return (
    <StudentShell user={user} title="My Batches">
      <div className="flex flex-col gap-6">
        <div>
          <h2 className="text-xl font-semibold tracking-tight text-dark">My Batches</h2>
          <p className="mt-1 text-sm text-muted">The batch assignments on your enrolled courses.</p>
        </div>

        {enrollments.length === 0 ? (
          <EmptyState
            title="No batch assigned yet"
            description="Once you're enrolled in a batch, its schedule and details will appear here."
            actionLabel="Request Counselling"
            actionHref="/book-demo"
          />
        ) : (
          <ul className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {enrollments.map((enrollment) => {
              const { batch, course, status } = enrollment;
              return (
                <li key={enrollment.id}>
                  <Card className="flex h-full flex-col">
                    <div className="flex items-start justify-between gap-3">
                      <Link
                        href={`/student/courses/${course.slug}`}
                        className="text-sm font-semibold text-dark hover:text-primary"
                      >
                        {course.title}
                      </Link>
                      <Badge variant={STATUS_VARIANT[status] || "neutral"}>{status}</Badge>
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
                      <div className="flex justify-between gap-3">
                        <dt className="text-muted">Location</dt>
                        <dd className="font-medium text-text">{batch.location}</dd>
                      </div>
                      <div className="flex justify-between gap-3">
                        <dt className="text-muted">Batch Status</dt>
                        <dd className="font-medium text-text">{batch.status}</dd>
                      </div>
                    </dl>

                    <Link
                      href="/student/schedule"
                      className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:text-primary-hover"
                    >
                      View Schedule
                      <span aria-hidden="true">→</span>
                    </Link>
                  </Card>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </StudentShell>
  );
}
