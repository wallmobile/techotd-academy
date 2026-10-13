import Link from "next/link";
import { getOpenJobsPage } from "@/lib/student/jobs";
import { parseBoardParams } from "@/lib/placement/params";
import { getCurrentUser } from "@/lib/auth/currentUser";
import { StudentShell } from "@/components/student/StudentShell";
import { AdminPagination } from "@/components/admin/AdminListControls";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { EMPLOYMENT_TYPES, EMPLOYMENT_TYPE_LABELS, WORK_MODES, WORK_MODE_LABELS } from "@/constants/placement";

export const metadata = {
  title: "Jobs",
  robots: { index: false, follow: false },
};

export default async function StudentJobsPage({ searchParams }) {
  const params = parseBoardParams(await searchParams);
  const [board, user] = await Promise.all([
    getOpenJobsPage(params),
    getCurrentUser(),
  ]);
  const applied = new Set(board.appliedJobIds);
  const hasFilters = params.q || params.employmentType || params.workMode;
  const pagerParams = { q: params.q, type: params.employmentType, mode: params.workMode };

  return (
    <StudentShell user={user} title="Jobs">
      <div className="flex flex-col gap-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-muted">Open positions posted by the placement team.</p>
          <Link href="/student/jobs/applications" className="text-sm font-medium text-primary hover:text-primary-hover">
            My applications →
          </Link>
        </div>

        <form method="get" action="/student/jobs" role="search" className="grid grid-cols-1 gap-3 sm:grid-cols-4 sm:items-end">
          <div className="sm:col-span-2">
            <Input label="Search" id="q" name="q" type="search" defaultValue={params.q} placeholder="Title, company or skill" maxLength={100} />
          </div>
          <Select label="Type" id="type" name="type" defaultValue={params.employmentType}>
            <option value="">Any type</option>
            {EMPLOYMENT_TYPES.map((t) => (
              <option key={t} value={t}>
                {EMPLOYMENT_TYPE_LABELS[t]}
              </option>
            ))}
          </Select>
          <Select label="Work mode" id="mode" name="mode" defaultValue={params.workMode}>
            <option value="">Any mode</option>
            {WORK_MODES.map((m) => (
              <option key={m} value={m}>
                {WORK_MODE_LABELS[m]}
              </option>
            ))}
          </Select>
          <div className="flex items-center gap-3 sm:col-span-4">
            <Button type="submit">Search</Button>
            {hasFilters && (
              <Link href="/student/jobs" className="text-sm font-medium text-primary hover:text-primary-hover">
                Reset
              </Link>
            )}
          </div>
        </form>

        {board.rows.length === 0 ? (
          <EmptyState
            title="No open jobs right now"
            description={hasFilters ? "No jobs match your search." : "There are no open positions at the moment. Check back later."}
          />
        ) : (
          <>
            <ul className="flex flex-col gap-4">
              {board.rows.map((job) => (
                <li key={job.id}>
                  <Card hoverable>
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <Link href={`/student/jobs/${job.id}`} className="text-sm font-semibold text-dark hover:text-primary">
                          {job.title}
                        </Link>
                        <p className="text-xs text-muted">
                          {job.companyName}
                          {job.location ? ` · ${job.location}` : ""}
                        </p>
                      </div>
                      {applied.has(job.id) && <Badge variant="success">Applied</Badge>}
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <Badge variant="neutral">{EMPLOYMENT_TYPE_LABELS[job.employmentType]}</Badge>
                      <Badge variant="neutral">{WORK_MODE_LABELS[job.workMode]}</Badge>
                      {job.applyDeadline && <Badge variant="warning">Apply by {job.applyDeadline}</Badge>}
                    </div>
                  </Card>
                </li>
              ))}
            </ul>
            <AdminPagination basePath="/student/jobs" params={pagerParams} {...board} />
          </>
        )}
      </div>
    </StudentShell>
  );
}
