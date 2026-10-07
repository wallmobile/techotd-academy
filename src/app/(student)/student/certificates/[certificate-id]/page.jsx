import { notFound } from "next/navigation";
import Link from "next/link";
import { getCertificateDetailForStudent } from "@/lib/student/certificates";
import { getCurrentUser } from "@/lib/auth/currentUser";
import { StudentShell } from "@/components/student/StudentShell";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";

export const metadata = {
  robots: { index: false, follow: false },
};

const STATUS_VARIANT = { ACTIVE: "success", REVOKED: "danger" };

function formatIssuedDate(issuedAt) {
  const date = new Date(issuedAt.replace(" ", "T") + "Z");
  if (Number.isNaN(date.getTime())) return issuedAt;
  return date.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" });
}

export default async function StudentCertificateDetailPage({ params }) {
  const { "certificate-id": certificateId } = await params;

  // getCertificateDetailForStudent() returns null both when the id
  // doesn't exist AND when it belongs to a different student — this page
  // responds identically (notFound) either way, so a certificate id can
  // never be used to probe whether it belongs to someone else.
  const detail = await getCertificateDetailForStudent(certificateId);
  if (!detail) notFound();

  const { certificate, course, studentName } = detail;
  const user = await getCurrentUser();

  return (
    <StudentShell user={user} title="Certificate">
      <div className="flex flex-col gap-6">
        <div>
          <Link
            href="/student/certificates"
            className="text-xs font-medium text-primary hover:text-primary-hover"
          >
            ← Back to Certificates
          </Link>
        </div>

        <Card className="flex flex-col gap-5">
          <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border pb-5">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-muted">Certificate of Completion</p>
              <h2 className="mt-1 text-xl font-semibold tracking-tight text-dark">{course.title}</h2>
            </div>
            <Badge variant={STATUS_VARIANT[certificate.status] || "neutral"}>{certificate.status}</Badge>
          </div>

          <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <dt className="text-xs text-muted">Student Name</dt>
              <dd className="mt-1 text-sm font-medium text-text">{studentName}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted">Course</dt>
              <dd className="mt-1 text-sm font-medium text-text">{course.title}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted">Certificate Number</dt>
              <dd className="mt-1 text-sm font-medium text-text">{certificate.certificateNumber}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted">Issued Date</dt>
              <dd className="mt-1 text-sm font-medium text-text">{formatIssuedDate(certificate.issuedAt)}</dd>
            </div>
          </dl>

          {course.certification && (
            <p className="rounded-sm border border-border bg-surface px-4 py-3 text-xs text-muted">
              {course.certification}
            </p>
          )}
        </Card>

        <Card className="flex flex-col items-start gap-2">
          <h3 className="text-sm font-semibold text-dark">Download</h3>
          <p className="text-sm text-muted">
            PDF download isn&apos;t available yet — the certificate information above is accurate and
            complete. A downloadable PDF will be added in a future update.
          </p>
          <Button
            variant="outline"
            size="sm"
            disabled
            title="Coming soon"
            aria-label="Download certificate as PDF (coming soon)"
          >
            Download PDF (Coming Soon)
          </Button>
        </Card>
      </div>
    </StudentShell>
  );
}
