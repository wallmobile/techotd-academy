import { notFound } from "next/navigation";
import { requireAdminContext } from "@/lib/admin/context";
import { getTrainerDetailForAdmin } from "@/lib/admin/trainers";
import { AdminShell } from "@/components/admin/AdminShell";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { AdminStatsGrid } from "@/components/admin/AdminStatsGrid";
import { StatusBadge } from "@/components/admin/AdminDataList";
import { AssignBatchForm } from "@/components/admin/AssignBatchForm";
import { Card } from "@/components/ui/Card";
import { formatDbDate } from "@/lib/utils";

export const metadata = {
  title: "Trainer Detail",
  robots: { index: false, follow: false },
};

export default async function AdminTrainerDetailPage({ params }) {
  const { user } = await requireAdminContext();
  const { "trainer-id": trainerId } = await params;
  const detail = await getTrainerDetailForAdmin(trainerId);
  if (!detail) notFound();

  const { user: trainer, assigned, assignable, summary } = detail;

  return (
    <AdminShell user={user} title="Trainers">
      <div className="flex flex-col gap-6">
        <AdminPageHeader title={trainer.name} backHref="/admin/trainers" backLabel="Back to Trainers" />

        <Card>
          <h2 className="text-sm font-semibold text-dark">Profile</h2>
          <dl className="mt-4 grid grid-cols-1 gap-2.5 text-sm sm:grid-cols-2">
            <Row label="Email">{trainer.email}</Row>
            <Row label="Phone">{trainer.phone || "—"}</Row>
            <Row label="Status">
              <StatusBadge status={trainer.status} />
            </Row>
            <Row label="Joined">{formatDbDate(trainer.createdAt)}</Row>
          </dl>
        </Card>

        <div>
          <h2 className="mb-3 text-sm font-semibold text-dark">Teaching summary</h2>
          <AdminStatsGrid
            stats={[
              { label: "Assigned batches", value: summary.assignedBatches },
              { label: "Students", value: summary.students },
              { label: "Classes", value: summary.classes },
              { label: "Attendance records", value: summary.attendanceRecords },
              { label: "Assignments", value: summary.assignments },
            ]}
          />
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <Card>
            <h2 className="text-sm font-semibold text-dark">Assigned batches</h2>
            {assigned.length === 0 ? (
              <p className="mt-3 text-sm text-muted">No batches assigned yet.</p>
            ) : (
              <ul className="mt-3 divide-y divide-border">
                {assigned.map((a) => (
                  <li key={a.batchId} className="py-2.5 text-sm">
                    <p className="break-words font-medium text-dark">{a.label}</p>
                    <p className="mt-0.5 text-xs text-muted">
                      {a.studentCount} student{a.studentCount === 1 ? "" : "s"} · assigned {formatDbDate(a.assignedAt)}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card>
            <h2 className="text-sm font-semibold text-dark">Assign a batch</h2>
            <div className="mt-3">
              <AssignBatchForm trainerId={trainer.id} batches={assignable} />
            </div>
          </Card>
        </div>
      </div>
    </AdminShell>
  );
}

function Row({ label, children }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <dt className="text-muted">{label}</dt>
      <dd className="min-w-0 break-words text-right font-medium text-text">{children}</dd>
    </div>
  );
}
