import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdminContext } from "@/lib/admin/context";
import { getCertificateDetail } from "@/lib/certificates/service";
import { AdminShell } from "@/components/admin/AdminShell";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { RevokeCertificateForm } from "@/components/admin/CertificateForms";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { ISSUANCE_BASIS_LABELS } from "@/constants/certificates";
import { formatDbDate } from "@/lib/utils";

export const metadata = {
  title: "Certificate Detail",
  robots: { index: false, follow: false },
};

export default async function AdminCertificateDetailPage({ params }) {
  const { user } = await requireAdminContext();
  const { "certificate-id": certificateId } = await params;
  const detail = await getCertificateDetail(certificateId);
  if (!detail) notFound();
  const { certificate: c, verifyUrl, history } = detail;
  const active = c.status === "ACTIVE";

  return (
    <AdminShell user={user} title="Certificates">
      <div className="flex flex-col gap-6">
        <AdminPageHeader title={`${c.studentName} — ${c.courseTitle}`} backHref="/admin/certificates" backLabel="Back to Certificates">
          <Badge variant={active ? "success" : "danger"}>{active ? "Active" : "Revoked"}</Badge>
        </AdminPageHeader>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <Card>
            <h2 className="text-sm font-semibold text-dark">Certificate</h2>
            <dl className="mt-4 flex flex-col gap-2.5 text-sm">
              <Row label="Number">{c.certificateNumber}</Row>
              <Row label="Student">
                <Link href={`/admin/students/${c.studentUserId}`} className="text-primary hover:text-primary-hover">
                  {c.studentName}
                </Link>
              </Row>
              <Row label="Course">{c.courseTitle}</Row>
              <Row label="Issued">{formatDbDate(c.issuedAt)}</Row>
              <Row label="Issued by">{c.issuedByName || "—"}</Row>
              <Row label="Basis">{ISSUANCE_BASIS_LABELS[c.issuanceBasis] || "Recorded before issuance tracking"}</Row>
              {c.approvalNote && <Row label="Approval reason">{c.approvalNote}</Row>}
              {c.enrollmentId && (
                <Row label="Enrollment">
                  <Link href={`/admin/enrollments/${c.enrollmentId}`} className="text-primary hover:text-primary-hover">
                    View enrollment
                  </Link>
                </Row>
              )}
              {!active && (
                <>
                  <Row label="Revoked">{formatDbDate(c.revokedAt)}</Row>
                  <Row label="Revocation reason">{c.revokedReason || "—"}</Row>
                </>
              )}
            </dl>
          </Card>

          <div className="flex flex-col gap-6">
            <Card>
              <h2 className="text-sm font-semibold text-dark">Download &amp; verification</h2>
              {active ? (
                <div className="mt-3 flex flex-col gap-3">
                  <div>
                    <Button href={`/admin/certificates/${c.id}/download`} as="a" variant="outline" size="sm">
                      Download PDF
                    </Button>
                  </div>
                  {verifyUrl && <p className="break-all text-xs text-muted">Public verification: {verifyUrl}</p>}
                </div>
              ) : (
                <p className="mt-3 text-sm text-muted">Revoked certificates can&apos;t be downloaded. Verification shows it as revoked.</p>
              )}
            </Card>

            {active && (
              <Card>
                <h2 className="text-sm font-semibold text-dark">Revoke</h2>
                <div className="mt-4">
                  <RevokeCertificateForm certificateId={c.id} />
                </div>
              </Card>
            )}
          </div>
        </div>

        <Card>
          <h2 className="text-sm font-semibold text-dark">History</h2>
          {history.length === 0 ? (
            <p className="mt-3 text-sm text-muted">No recorded events.</p>
          ) : (
            <ul className="mt-3 divide-y divide-border text-sm">
              {history.map((h, i) => (
                <li key={i} className="flex flex-wrap justify-between gap-2 py-2">
                  <span className="text-text">{h.action.replaceAll("_", " ").toLowerCase()}</span>
                  <span className="text-xs text-muted">
                    {h.actorName || "System"} · {formatDbDate(h.at)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>
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
