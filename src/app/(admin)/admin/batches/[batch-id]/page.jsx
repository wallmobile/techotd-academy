import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdminContext } from "@/lib/admin/context";
import { getBatchDetailForAdmin, getBatchFormOptions } from "@/lib/admin/batches";
import { AdminShell } from "@/components/admin/AdminShell";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { BatchForm, BatchStatusForm, TrainerAssignForm, TrainerList } from "@/components/admin/CatalogForms";
import { AuditList, BatchStatusBadge, DetailRow } from "@/components/admin/CatalogParts";
import { EnrollmentStatusBadge } from "@/components/admin/AdminDataList";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { formatDbDate } from "@/lib/utils";

export const metadata = {
  title: "Batch Detail",
  robots: { index: false, follow: false },
};

export default async function AdminBatchDetailPage({ params }) {
  const { user } = await requireAdminContext();
  const { "batch-id": batchId } = await params;
  const detail = await getBatchDetailForAdmin(batchId);
  if (!detail) notFound();
  const { batch, course, trainers, assignableTrainers, enrollments, enrollmentPreview, audit } = detail;
  const options = await getBatchFormOptions();
  const courseTitle = course?.title ?? batch.courseSlug;

  return (
    <AdminShell user={user} title="Batches">
      <div className="flex flex-col gap-6">
        <AdminPageHeader title={`${courseTitle} — ${batch.mode} (${batch.startDate})`} backHref="/admin/batches" backLabel="Back to Batches">
          <BatchStatusBadge status={batch.status} />
        </AdminPageHeader>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <Card>
            <h2 className="text-sm font-semibold text-dark">Batch</h2>
            <dl className="mt-4 flex flex-col gap-2.5 text-sm">
              <DetailRow label="Batch id">{batch.id}</DetailRow>
              <DetailRow label="Course">
                <Link href={`/admin/courses/${batch.courseSlug}`} className="text-primary hover:text-primary-hover">
                  {courseTitle}
                </Link>
                {course?.status === "UNPUBLISHED" && <span className="ml-1 text-xs text-muted">(unpublished)</span>}
              </DetailRow>
              <DetailRow label="Mode">{batch.mode}</DetailRow>
              <DetailRow label="Starts">{batch.startDate}</DetailRow>
              <DetailRow label="Ends">{batch.endDate || "—"}</DetailRow>
              <DetailRow label="Schedule">{batch.schedule}</DetailRow>
              <DetailRow label="Location">{batch.location}</DetailRow>
              <DetailRow label="Enrollments">
                {enrollments.ACTIVE ?? 0} active / {enrollments.total} total
              </DetailRow>
            </dl>
          </Card>

          <Card>
            <h2 className="text-sm font-semibold text-dark">Status</h2>
            <div className="mt-4">
              <BatchStatusForm batchId={batch.id} status={batch.status} statuses={options.statuses} activeEnrollments={enrollments.ACTIVE ?? 0} />
            </div>
          </Card>

          <Card className="lg:col-span-2">
            <h2 className="text-sm font-semibold text-dark">Edit batch</h2>
            <div className="mt-4 max-w-3xl">
              <BatchForm mode="edit" options={options} initial={{ ...batch, courseTitle }} />
            </div>
          </Card>

          <Card>
            <h2 className="text-sm font-semibold text-dark">Trainers</h2>
            <div className="mt-3">
              <TrainerList
                batchId={batch.id}
                trainers={trainers.map((t) => ({
                  id: t.id,
                  name: t.name,
                  detail: `${t.email} · assigned ${formatDbDate(t.assignedAt)}${t.status !== "ACTIVE" ? " · account not active" : ""}`,
                }))}
              >
                <div className="border-t border-border pt-4">
                  <TrainerAssignForm batchId={batch.id} trainers={assignableTrainers} />
                </div>
              </TrainerList>
            </div>
          </Card>

          <Card>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-sm font-semibold text-dark">Enrollments</h2>
              {["Open", "Upcoming"].includes(batch.status) && course?.status === "PUBLISHED" && (
                <Button href={`/admin/enrollments/new?course=${batch.courseSlug}&batch=${batch.id}`} size="sm" variant="outline">
                  + Enroll a student
                </Button>
              )}
            </div>
            {enrollmentPreview.length === 0 ? (
              <p className="mt-3 text-sm text-muted">No students are enrolled in this batch.</p>
            ) : (
              <ul className="mt-3 flex flex-col divide-y divide-border text-sm">
                {enrollmentPreview.map((e) => (
                  <li key={e.id} className="flex items-center justify-between gap-3 py-2.5">
                    <div className="min-w-0">
                      <Link href={`/admin/enrollments/${e.id}`} className="font-medium text-dark hover:text-primary">
                        {e.name}
                      </Link>
                      <p className="truncate text-xs text-muted">{e.email}</p>
                    </div>
                    <EnrollmentStatusBadge status={e.status} />
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card className="lg:col-span-2">
            <h2 className="text-sm font-semibold text-dark">Change history</h2>
            <div className="mt-3">
              <AuditList rows={audit} />
            </div>
          </Card>
        </div>
      </div>
    </AdminShell>
  );
}
