import Link from "next/link";
import { requireAdminContext } from "@/lib/admin/context";
import { getCertificateFormData } from "@/lib/certificates/service";
import { AdminShell } from "@/components/admin/AdminShell";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { IssueAutoForm, IssueManualForm } from "@/components/admin/CertificateForms";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";

export const metadata = {
  title: "Issue Certificate",
  robots: { index: false, follow: false },
};

export default async function AdminIssueCertificatePage({ searchParams }) {
  const { user } = await requireAdminContext();
  const sp = (await searchParams) || {};
  const str = (v) => (typeof v === "string" ? v.slice(0, 100) : "");
  const data = await getCertificateFormData({ enrollmentId: str(sp.enrollment), query: str(sp.sq).trim() });
  const e = data.eligibility;

  return (
    <AdminShell user={user} title="Certificates">
      <div className="flex flex-col gap-6">
        <AdminPageHeader
          title="Issue Certificate"
          description="Issue a certificate for one enrollment. Eligibility is checked against the student's actual records."
          backHref="/admin/certificates"
          backLabel="Back to Certificates"
        />

        <Card className="w-full max-w-2xl">
          {e ? (
            <div className="flex flex-col gap-5">
              <div className="rounded-sm bg-surface px-3 py-2 text-sm">
                <p className="font-medium text-dark">{e.studentName}</p>
                <p className="text-xs text-muted">
                  {e.courseTitle} — {e.batchLabel}
                </p>
              </div>

              <div>
                <h2 className="text-sm font-semibold text-dark">Eligibility</h2>
                <ul className="mt-3 divide-y divide-border">
                  {e.checks.map((c) => (
                    <li key={c.key} className="flex items-center justify-between gap-3 py-2 text-sm">
                      <span className="text-text">
                        {c.label} <span className="text-xs text-muted">({c.detail})</span>
                      </span>
                      <Badge variant={c.passed ? "success" : "danger"}>{c.passed ? "Met" : "Not met"}</Badge>
                    </li>
                  ))}
                </ul>
                <p className="mt-3 text-xs text-muted">
                  For context only (not part of the rule): {e.evidence.attendancePresent} of {e.evidence.attendanceTotal} attendance records marked present;{" "}
                  {e.evidence.submissions} assignment submission{e.evidence.submissions === 1 ? "" : "s"}.
                </p>
              </div>

              {e.existingCertificateId ? (
                <div className="text-sm">
                  <p className="text-text">This student already holds an active certificate for this course.</p>
                  <Link href={`/admin/certificates/${e.existingCertificateId}`} className="mt-2 inline-block font-medium text-primary hover:text-primary-hover">
                    Open certificate →
                  </Link>
                </div>
              ) : e.autoEligible ? (
                <div>
                  <h2 className="text-sm font-semibold text-dark">Issue</h2>
                  <p className="mt-1 text-sm text-muted">All completion requirements are met.</p>
                  <div className="mt-3">
                    <IssueAutoForm enrollmentId={data.enrollmentId} />
                  </div>
                </div>
              ) : (
                <div>
                  <h2 className="text-sm font-semibold text-dark">Not automatically eligible</h2>
                  <p className="mt-1 text-sm text-muted">
                    The requirements above aren&apos;t all met, so automatic issuance is unavailable. If staff have confirmed this student completed the
                    course, you can issue it with an explicit manual approval.
                  </p>
                  <div className="mt-4">
                    <IssueManualForm enrollmentId={data.enrollmentId} />
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              <form method="get" action="/admin/certificates/new" role="search" className="flex flex-col gap-3">
                <Input label="Find an enrollment (student name or email)" id="sq" name="sq" type="search" defaultValue={str(sp.sq)} maxLength={100} />
                <div>
                  <Button type="submit">Search</Button>
                </div>
              </form>
              {data.candidates.length === 0 ? (
                <EmptyState title="No enrollments found." description="Only non-cancelled enrollments without an active certificate are listed." />
              ) : (
                <ul className="divide-y divide-border rounded-sm border border-border">
                  {data.candidates.map((c) => (
                    <li key={c.id} className="flex items-center justify-between gap-3 px-3 py-2.5 text-sm">
                      <span className="min-w-0">
                        <span className="block truncate font-medium text-dark">{c.studentName}</span>
                        <span className="block truncate text-xs text-muted">
                          {c.courseTitle} · {c.status.toLowerCase()}
                        </span>
                      </span>
                      <Link href={`/admin/certificates/new?enrollment=${c.id}`} className="flex-none font-medium text-primary hover:text-primary-hover">
                        Check
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </Card>
      </div>
    </AdminShell>
  );
}
