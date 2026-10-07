import Link from "next/link";
import { getMyCertificates } from "@/lib/student/certificates";
import { getCurrentUser } from "@/lib/auth/currentUser";
import { StudentShell } from "@/components/student/StudentShell";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";

export const metadata = {
  title: "Certificates",
  robots: { index: false, follow: false },
};

const STATUS_VARIANT = { ACTIVE: "success", REVOKED: "danger" };

function formatIssuedDate(issuedAt) {
  const date = new Date(issuedAt.replace(" ", "T") + "Z");
  if (Number.isNaN(date.getTime())) return issuedAt;
  return date.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
}

export default async function StudentCertificatesPage() {
  // getMyCertificates() derives the student from the session itself —
  // there is no id anywhere in this route to spoof another student's
  // certificates.
  const [certificates, user] = await Promise.all([getMyCertificates(), getCurrentUser()]);

  return (
    <StudentShell user={user} title="Certificates">
      <div className="flex flex-col gap-6">
        <p className="text-sm text-muted">Certificates issued to you across your courses.</p>

        {certificates.length === 0 ? (
          <EmptyState
            title="No certificates yet"
            description="Certificates are issued once you complete a course. Keep learning to earn your first one."
          />
        ) : (
          <ul className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {certificates.map((certificate) => (
              <li key={certificate.id}>
                <Card hoverable className="flex h-full flex-col gap-3">
                  <div className="flex items-start justify-between gap-3">
                    <p className="text-sm font-semibold text-dark">{certificate.course.title}</p>
                    <Badge variant={STATUS_VARIANT[certificate.status] || "neutral"}>{certificate.status}</Badge>
                  </div>
                  <dl className="flex flex-col gap-1.5 text-xs">
                    <div className="flex justify-between gap-3">
                      <dt className="text-muted">Certificate No.</dt>
                      <dd className="font-medium text-text">{certificate.certificateNumber}</dd>
                    </div>
                    <div className="flex justify-between gap-3">
                      <dt className="text-muted">Issued</dt>
                      <dd className="font-medium text-text">{formatIssuedDate(certificate.issuedAt)}</dd>
                    </div>
                  </dl>
                  <Link
                    href={`/student/certificates/${certificate.id}`}
                    className="mt-1 inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:text-primary-hover"
                  >
                    View Certificate
                    <span aria-hidden="true">→</span>
                  </Link>
                </Card>
              </li>
            ))}
          </ul>
        )}
      </div>
    </StudentShell>
  );
}
