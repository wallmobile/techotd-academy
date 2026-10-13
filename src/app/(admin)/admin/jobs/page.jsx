import Link from "next/link";
import { requirePlacementContext } from "@/lib/placement/context";
import { getJobsPage, getPlacementSummary } from "@/lib/placement/service";
import { parseJobParams } from "@/lib/placement/params";
import { AdminShell } from "@/components/admin/AdminShell";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { AdminStatsGrid } from "@/components/admin/AdminStatsGrid";
import { AdminPagination } from "@/components/admin/AdminListControls";
import { AdminDataList } from "@/components/admin/AdminDataList";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { JOB_STATUSES, JOB_STATUS_LABELS, EMPLOYMENT_TYPE_LABELS, WORK_MODE_LABELS } from "@/constants/placement";
import { formatDbDate } from "@/lib/utils";

export const metadata = {
  title: "Jobs",
  robots: { index: false, follow: false },
};

const STATUS_VARIANT = { DRAFT: "neutral", PUBLISHED: "success", CLOSED: "warning" };
const SORTS = { newest: "Newest first", oldest: "Oldest first", title: "Title (A–Z)" };

export default async function AdminJobsPage({ searchParams }) {
  const { user } = await requirePlacementContext();
  const params = parseJobParams(await searchParams);
  const [result, summary] = await Promise.all([getJobsPage(params), getPlacementSummary()]);
  const hasFilters = params.q || params.status || params.sort !== "newest";

  const columns = [
    {
      key: "title",
      label: "Job",
      primary: true,
      render: (j) => (
        <Link href={`/admin/jobs/${j.id}`} className="font-semibold text-dark hover:text-primary">
          {j.title}
        </Link>
      ),
    },
    { key: "company", label: "Company", render: (j) => j.companyName },
    { key: "type", label: "Type", render: (j) => `${EMPLOYMENT_TYPE_LABELS[j.employmentType]} · ${WORK_MODE_LABELS[j.workMode]}` },
    { key: "deadline", label: "Deadline", render: (j) => j.applyDeadline || "—" },
    { key: "apps", label: "Applications", render: (j) => j.applicationCount },
    { key: "status", label: "Status", render: (j) => <Badge variant={STATUS_VARIANT[j.status]}>{JOB_STATUS_LABELS[j.status]}</Badge> },
    { key: "created", label: "Created", render: (j) => formatDbDate(j.createdAt) },
  ];

  return (
    <AdminShell user={user} title="Jobs">
      <div className="flex flex-col gap-6">
        <AdminPageHeader title="Jobs & Placement" description="Job openings and the applications students submit for them.">
          <Button href="/admin/jobs/new">+ New Job</Button>
        </AdminPageHeader>

        <AdminStatsGrid
          stats={[
            { label: "Published jobs", value: summary.jobsPublished },
            { label: "Open now", value: summary.jobsOpen, hint: "Published, deadline not passed" },
            { label: "Applications", value: summary.applicationsTotal },
            { label: "Under review", value: summary.underReview },
            { label: "Shortlisted", value: summary.shortlisted },
            { label: "Verified placements", value: summary.verifiedPlacements, hint: "Confirmed by staff" },
          ]}
        />

        <form method="get" action="/admin/jobs" role="search" className="flex flex-col gap-3">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <Input label="Search" id="q" name="q" type="search" defaultValue={params.q} placeholder="Job title or company" maxLength={100} />
            <Select label="Status" id="status" name="status" defaultValue={params.status}>
              <option value="">All statuses</option>
              {JOB_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {JOB_STATUS_LABELS[s]}
                </option>
              ))}
            </Select>
            <Select label="Sort" id="sort" name="sort" defaultValue={params.sort}>
              {Object.entries(SORTS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </Select>
          </div>
          <div className="flex items-center gap-3">
            <Button type="submit">Apply</Button>
            {hasFilters && (
              <Link href="/admin/jobs" className="text-sm font-medium text-primary hover:text-primary-hover">
                Reset
              </Link>
            )}
          </div>
        </form>

        {result.rows.length === 0 ? (
          <EmptyState
            title="No jobs found."
            description={hasFilters ? "No jobs match these filters." : "No jobs have been posted yet. Add a real opening to get started."}
            actionLabel={hasFilters ? undefined : "New Job"}
            actionHref={hasFilters ? undefined : "/admin/jobs/new"}
          />
        ) : (
          <>
            <AdminDataList columns={columns} rows={result.rows} caption="Jobs" />
            <AdminPagination basePath="/admin/jobs" params={params} {...result} />
          </>
        )}
      </div>
    </AdminShell>
  );
}
