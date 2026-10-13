import { notFound } from "next/navigation";
import { requirePlacementContext } from "@/lib/placement/context";
import { getJobDetail } from "@/lib/placement/service";
import { AdminShell } from "@/components/admin/AdminShell";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { JobForm, JobStatusForm, ApplicationReviewForm, ConfirmPlacementForm } from "@/components/admin/JobForms";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { APPLICATION_STATUS_LABELS, JOB_STATUS_LABELS } from "@/constants/placement";
import { formatDbDate } from "@/lib/utils";

export const metadata = {
  title: "Job Detail",
  robots: { index: false, follow: false },
};

const APP_VARIANT = {
  APPLIED: "primary",
  UNDER_REVIEW: "primary",
  SHORTLISTED: "secondary",
  INTERVIEW: "secondary",
  SELECTED: "success",
  REJECTED: "neutral",
  WITHDRAWN: "neutral",
};

export default async function AdminJobDetailPage({ params }) {
  const { user } = await requirePlacementContext();
  const { "job-id": jobId } = await params;
  const detail = await getJobDetail(jobId);
  if (!detail) notFound();
  const { job, applications, history } = detail;

  return (
    <AdminShell user={user} title="Jobs">
      <div className="flex flex-col gap-6">
        <AdminPageHeader title={job.title} description={job.companyName} backHref="/admin/jobs" backLabel="Back to Jobs">
          <Badge variant={job.status === "PUBLISHED" ? "success" : job.status === "CLOSED" ? "warning" : "neutral"}>
            {JOB_STATUS_LABELS[job.status]}
          </Badge>
        </AdminPageHeader>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <h2 className="text-sm font-semibold text-dark">Job details</h2>
            <div className="mt-4">
              <JobForm job={job} />
            </div>
          </Card>
          <div className="flex flex-col gap-6">
            <Card>
              <h2 className="text-sm font-semibold text-dark">Publishing</h2>
              <div className="mt-4">
                <JobStatusForm jobId={job.id} status={job.status} />
              </div>
            </Card>
            <Card>
              <h2 className="text-sm font-semibold text-dark">History</h2>
              {history.length === 0 ? (
                <p className="mt-3 text-sm text-muted">No recorded events.</p>
              ) : (
                <ul className="mt-3 divide-y divide-border text-sm">
                  {history.map((h, i) => (
                    <li key={i} className="py-2">
                      <p className="text-text">{h.action.replaceAll("_", " ").toLowerCase()}</p>
                      <p className="text-xs text-muted">
                        {h.actorName || "System"} · {formatDbDate(h.at)}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </div>
        </div>

        <div>
          <h2 className="text-base font-semibold text-dark">Applications ({applications.length})</h2>
          {applications.length === 0 ? (
            <p className="mt-2 text-sm text-muted">No applications yet.</p>
          ) : (
            <ul className="mt-3 flex flex-col gap-4">
              {applications.map((a) => (
                <li key={a.id}>
                  <Card>
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-dark">{a.name}</p>
                        <p className="break-all text-xs text-muted">
                          {a.email}
                          {a.phone ? ` · ${a.phone}` : ""}
                          {a.city ? ` · ${a.city}` : ""}
                        </p>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <Badge variant={APP_VARIANT[a.status]}>{APPLICATION_STATUS_LABELS[a.status]}</Badge>
                        {a.placementConfirmedAt && <Badge variant="success">Placement confirmed</Badge>}
                      </div>
                    </div>
                    <p className="mt-2 text-xs text-muted">Applied {formatDbDate(a.appliedAt)}</p>
                    {a.bio && <p className="mt-2 break-words text-sm text-text">{a.bio}</p>}
                    {a.coverMessage && (
                      <p className="mt-2 whitespace-pre-wrap break-words rounded-sm bg-surface px-3 py-2 text-sm text-text">{a.coverMessage}</p>
                    )}
                    {a.placementNote && <p className="mt-2 text-xs text-muted">Placement note: {a.placementNote}</p>}

                    {a.status !== "WITHDRAWN" && (
                      <div className="mt-4 grid grid-cols-1 gap-4 border-t border-border pt-4 md:grid-cols-2">
                        <ApplicationReviewForm applicationId={a.id} status={a.status} notes={a.staffNotes} />
                        {a.status === "SELECTED" && !a.placementConfirmedAt && <ConfirmPlacementForm applicationId={a.id} />}
                      </div>
                    )}
                  </Card>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </AdminShell>
  );
}
