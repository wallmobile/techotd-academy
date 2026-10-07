import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";

export function UpcomingBatchCard({ enrollment }) {
  if (!enrollment) {
    return (
      <Card>
        <h3 className="text-sm font-semibold text-dark">Upcoming Batch</h3>
        <p className="mt-3 text-sm text-muted">No batch assigned yet.</p>
      </Card>
    );
  }

  const { batch, course } = enrollment;

  return (
    <Card>
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-sm font-semibold text-dark">Upcoming Batch</h3>
        <Badge variant="primary">{batch.mode}</Badge>
      </div>
      <p className="mt-3 text-sm font-medium text-dark">{course.title}</p>
      <dl className="mt-3 flex flex-col gap-1.5 text-xs">
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
      </dl>
      <Link
        href="/student/batches"
        className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:text-primary-hover"
      >
        View My Batches
        <span aria-hidden="true">→</span>
      </Link>
    </Card>
  );
}
