import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdminContext } from "@/lib/admin/context";
import { getEnrollmentDetail } from "@/lib/admin/enrollments";
import { getFeeForEnrollment } from "@/lib/fees/service";
import { formatMinor } from "@/lib/money";
import { AdminShell } from "@/components/admin/AdminShell";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { EnrollmentStatusBadge } from "@/components/admin/AdminDataList";
import { EnrollmentStatusForm } from "@/components/admin/EnrollmentForms";
import { Card } from "@/components/ui/Card";
import { formatDbDate } from "@/lib/utils";

export const metadata = {
  title: "Enrollment Detail",
  robots: { index: false, follow: false },
};

export default async function AdminEnrollmentDetailPage({ params }) {
  const { user } = await requireAdminContext();
  const { "enrollment-id": enrollmentId } = await params;
  const e = await getEnrollmentDetail(enrollmentId);
  if (!e) notFound();
  const fee = await getFeeForEnrollment(e.id);

  return (
    <AdminShell user={user} title="Enrollments">
      <div className="flex flex-col gap-6">
        <AdminPageHeader title={`${e.studentName} — ${e.courseTitle}`} backHref="/admin/enrollments" backLabel="Back to Enrollments" />

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <Card>
            <h2 className="text-sm font-semibold text-dark">Enrollment</h2>
            <dl className="mt-4 flex flex-col gap-2.5 text-sm">
              <Row label="Student">
                <Link href={`/admin/students/${e.studentUserId}`} className="text-primary hover:text-primary-hover">
                  {e.studentName}
                </Link>
              </Row>
              <Row label="Email">{e.studentEmail}</Row>
              <Row label="Phone">{e.studentPhone || "—"}</Row>
              <Row label="Course">{e.courseTitle}</Row>
              <Row label="Batch">{e.batchLabel}</Row>
              <Row label="Schedule">{e.batchSchedule || "—"}</Row>
              <Row label="Status">
                <EnrollmentStatusBadge status={e.status} />
              </Row>
              <Row label="Enrolled">{formatDbDate(e.enrolledAt)}</Row>
              <Row label="Last updated">{formatDbDate(e.updatedAt)}</Row>
            </dl>
          </Card>

          <Card>
            <h2 className="text-sm font-semibold text-dark">Fee</h2>
            {fee ? (
              <div className="mt-3 text-sm">
                <p className="text-text">
                  {formatMinor(fee.paidMinor, fee.currency)} paid of {formatMinor(fee.netMinor, fee.currency)}
                </p>
                <Link href={`/admin/fees/${fee.id}`} className="mt-2 inline-block font-medium text-primary hover:text-primary-hover">
                  Open fee →
                </Link>
              </div>
            ) : (
              <div className="mt-3 text-sm">
                <p className="text-muted">No fee assigned to this enrollment.</p>
                <Link href={`/admin/fees/new?enrollment=${e.id}`} className="mt-2 inline-block font-medium text-primary hover:text-primary-hover">
                  Assign fee →
                </Link>
              </div>
            )}
          </Card>

          <Card>
            <h2 className="text-sm font-semibold text-dark">Change status</h2>
            <div className="mt-4">
              <EnrollmentStatusForm enrollmentId={e.id} status={e.status} />
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
