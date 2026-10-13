import { notFound } from "next/navigation";
import { getJobForStudent } from "@/lib/student/jobs";
import { getCurrentUser } from "@/lib/auth/currentUser";
import { StudentShell } from "@/components/student/StudentShell";
import { ApplyForm, WithdrawForm } from "@/components/student/JobForms";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { EMPLOYMENT_TYPE_LABELS, WORK_MODE_LABELS, APPLICATION_STATUS_LABELS } from "@/constants/placement";

export const metadata = {
  title: "Job",
  robots: { index: false, follow: false },
};

export default async function StudentJobDetailPage({ params }) {
  const { "job-id": jobId } = await params;
  // Null for unknown ids, drafts and closed jobs the student never applied to.
  const [detail, user] = await Promise.all([getJobForStudent(jobId), getCurrentUser()]);
  if (!detail) notFound();
  const { job, open, application, canApply, canWithdraw, eligible } = detail;

  return (
    <StudentShell user={user} title="Job">
      <div className="flex flex-col gap-6">
        <div>
          <Button href="/student/jobs" variant="outline" size="sm">
            ← Back to Jobs
          </Button>
        </div>

        <Card>
          <h2 className="text-xl font-semibold tracking-tight text-dark">{job.title}</h2>
          <p className="mt-1 text-sm text-muted">
            {job.companyName}
            {job.location ? ` · ${job.location}` : ""}
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Badge variant="neutral">{EMPLOYMENT_TYPE_LABELS[job.employmentType]}</Badge>
            <Badge variant="neutral">{WORK_MODE_LABELS[job.workMode]}</Badge>
            {job.experience && <Badge variant="neutral">{job.experience}</Badge>}
            {job.applyDeadline && <Badge variant="warning">Apply by {job.applyDeadline}</Badge>}
          </div>
          {job.skills && <p className="mt-3 text-sm text-text">Skills: {job.skills}</p>}
          <p className="mt-4 whitespace-pre-wrap break-words text-sm text-text">{job.description}</p>
        </Card>

        <Card>
          <h3 className="text-sm font-semibold text-dark">Your application</h3>
          {application ? (
            <div className="mt-3 flex flex-col gap-3 text-sm">
              <p className="text-text">
                Status: <span className="font-medium">{APPLICATION_STATUS_LABELS[application.status]}</span>
              </p>
              {application.placementConfirmed && <Badge variant="success">Placement confirmed</Badge>}
              {canWithdraw && <WithdrawForm applicationId={application.id} />}
            </div>
          ) : !open ? (
            <p className="mt-3 text-sm text-muted">This job is no longer accepting applications.</p>
          ) : canApply ? (
            <div className="mt-3">
              <ApplyForm jobId={job.id} />
            </div>
          ) : (
            <p className="mt-3 text-sm text-muted">
              {eligible ? "You can't apply to this job." : "Job applications are open to students with an active or completed enrollment."}
            </p>
          )}
        </Card>
      </div>
    </StudentShell>
  );
}
