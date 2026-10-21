import Link from "next/link";
import { requireAdminContext } from "@/lib/admin/context";
import { getBatchesPage, getBatchFormOptions } from "@/lib/admin/batches";
import { parseBatchParams, BATCH_SORTS } from "@/lib/admin/catalogParams";
import { AdminShell } from "@/components/admin/AdminShell";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { AdminPagination } from "@/components/admin/AdminListControls";
import { AdminDataList } from "@/components/admin/AdminDataList";
import { BatchStatusBadge } from "@/components/admin/CatalogParts";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";

export const metadata = {
  title: "Batches",
  robots: { index: false, follow: false },
};

export default async function AdminBatchesPage({ searchParams }) {
  const { user } = await requireAdminContext();
  const params = parseBatchParams(await searchParams);
  const result = await getBatchesPage(params);
  const options = await getBatchFormOptions();
  const hasFilters = params.q || params.course || params.status || params.mode || params.sort !== "start";

  const columns = [
    {
      key: "course",
      label: "Batch",
      primary: true,
      render: (b) => (
        <div className="flex flex-col gap-0.5">
          <Link href={`/admin/batches/${b.id}`} className="font-semibold text-dark hover:text-primary">
            {b.courseTitle}
          </Link>
          <span className="text-xs text-muted">{b.id}</span>
        </div>
      ),
    },
    { key: "mode", label: "Mode", render: (b) => b.mode },
    { key: "dates", label: "Dates", render: (b) => (b.endDate ? `${b.startDate} → ${b.endDate}` : b.startDate) },
    { key: "schedule", label: "Schedule", render: (b) => b.schedule },
    { key: "status", label: "Status", render: (b) => <BatchStatusBadge status={b.status} /> },
    { key: "trainers", label: "Trainers", render: (b) => b.trainerCount },
    { key: "enrollments", label: "Enrollments", render: (b) => `${b.enrollments.ACTIVE ?? 0} active / ${b.enrollments.total} total` },
    {
      key: "actions",
      label: "Actions",
      render: (b) => (
        <Link href={`/admin/batches/${b.id}`} className="text-sm font-medium text-primary hover:text-primary-hover">
          View
        </Link>
      ),
    },
  ];

  return (
    <AdminShell user={user} title="Batches">
      <div className="flex flex-col gap-6">
        <AdminPageHeader title="Batches" description="Scheduled batches for each course, with their trainers and enrollments.">
          <Button href="/admin/batches/new">+ New Batch</Button>
        </AdminPageHeader>

        <form method="get" action="/admin/batches" role="search" className="flex flex-col gap-3">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="sm:col-span-2 lg:col-span-4">
              <Input label="Search" id="q" name="q" type="search" defaultValue={params.q} placeholder="Course, batch id, schedule or location" maxLength={100} />
            </div>
            <Select label="Course" id="course" name="course" defaultValue={params.course}>
              <option value="">All courses</option>
              {options.courses.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </Select>
            <Select label="Status" id="status" name="status" defaultValue={params.status}>
              <option value="">All statuses</option>
              {options.statuses.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </Select>
            <Select label="Mode" id="mode" name="mode" defaultValue={params.mode}>
              <option value="">All modes</option>
              {options.modes.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </Select>
            <Select label="Sort" id="sort" name="sort" defaultValue={params.sort}>
              {Object.entries(BATCH_SORTS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </Select>
          </div>
          <div className="flex items-center gap-3">
            <Button type="submit">Apply</Button>
            {hasFilters && (
              <Link href="/admin/batches" className="text-sm font-medium text-primary hover:text-primary-hover">
                Reset
              </Link>
            )}
          </div>
        </form>

        {result.rows.length === 0 ? (
          <EmptyState
            title="No batches found."
            description={hasFilters ? "No batches match these filters." : "Create a batch to see it here."}
            actionLabel={hasFilters ? undefined : "New Batch"}
            actionHref={hasFilters ? undefined : "/admin/batches/new"}
          />
        ) : (
          <>
            <AdminDataList columns={columns} rows={result.rows} caption="Batches" />
            <AdminPagination basePath="/admin/batches" params={params} {...result} />
          </>
        )}
      </div>
    </AdminShell>
  );
}
