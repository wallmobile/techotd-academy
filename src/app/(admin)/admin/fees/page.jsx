import Link from "next/link";
import { requireFinanceContext } from "@/lib/fees/context";
import { getFeesPage, getFeeSummary } from "@/lib/fees/service";
import { parseFeeParams } from "@/lib/fees/params";
import { AdminShell } from "@/components/admin/AdminShell";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { AdminStatsGrid } from "@/components/admin/AdminStatsGrid";
import { AdminPagination } from "@/components/admin/AdminListControls";
import { AdminDataList, FeeStatusBadge } from "@/components/admin/AdminDataList";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { FEE_STATUS_LABELS } from "@/constants/fees";
import { courses } from "@/data/courses";
import { formatMinor } from "@/lib/money";

export const metadata = {
  title: "Fees",
  robots: { index: false, follow: false },
};

const SORTS = { newest: "Newest first", oldest: "Oldest first", name: "Student name (A–Z)", outstanding: "Highest balance" };

export default async function AdminFeesPage({ searchParams }) {
  const { user } = await requireFinanceContext();
  const params = parseFeeParams(await searchParams);
  const [result, summary] = await Promise.all([getFeesPage(params), getFeeSummary()]);
  const hasFilters = params.q || params.status || params.course || params.sort !== "newest";

  const columns = [
    {
      key: "student",
      label: "Student",
      primary: true,
      render: (f) => (
        <Link href={`/admin/fees/${f.id}`} className="font-semibold text-dark hover:text-primary">
          {f.studentName}
        </Link>
      ),
    },
    { key: "course", label: "Course", render: (f) => f.courseTitle },
    { key: "batch", label: "Batch", render: (f) => f.batchLabel },
    { key: "net", label: "Net fee", render: (f) => formatMinor(f.netMinor, f.currency) },
    { key: "paid", label: "Paid", render: (f) => formatMinor(f.paidMinor, f.currency) },
    { key: "due", label: "Outstanding", render: (f) => formatMinor(f.outstandingMinor, f.currency) },
    { key: "status", label: "Status", render: (f) => <FeeStatusBadge status={f.status} /> },
    { key: "date", label: "Due date", render: (f) => f.dueDate || "—" },
  ];

  return (
    <AdminShell user={user} title="Fees">
      <div className="flex flex-col gap-6">
        <AdminPageHeader title="Fees" description="Fees assigned to enrollments and the payments recorded against them.">
          <Button href="/admin/fees/new">+ Assign Fee</Button>
        </AdminPageHeader>

        <AdminStatsGrid
          stats={[
            { label: "Fee plans", value: summary.plans },
            { label: "Net fees", value: formatMinor(summary.netMinor) },
            { label: "Collected", value: formatMinor(summary.paidMinor) },
            { label: "Outstanding", value: formatMinor(summary.outstandingMinor) },
          ]}
        />

        <form method="get" action="/admin/fees" role="search" className="flex flex-col gap-3">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="sm:col-span-2 lg:col-span-1">
              <Input label="Search" id="q" name="q" type="search" defaultValue={params.q} placeholder="Student name or email" maxLength={100} />
            </div>
            <Select label="Status" id="status" name="status" defaultValue={params.status}>
              <option value="">All statuses</option>
              {Object.entries(FEE_STATUS_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </Select>
            <Select label="Course" id="course" name="course" defaultValue={params.course}>
              <option value="">All courses</option>
              {courses.map((c) => (
                <option key={c.slug} value={c.slug}>
                  {c.title}
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
              <Link href="/admin/fees" className="text-sm font-medium text-primary hover:text-primary-hover">
                Reset
              </Link>
            )}
          </div>
        </form>

        {result.rows.length === 0 ? (
          <EmptyState
            title="No fees found."
            description={hasFilters ? "No fees match these filters." : "Assign a fee to an enrollment to start tracking payments."}
            actionLabel={hasFilters ? undefined : "Assign Fee"}
            actionHref={hasFilters ? undefined : "/admin/fees/new"}
          />
        ) : (
          <>
            <AdminDataList columns={columns} rows={result.rows} caption="Fees" />
            <AdminPagination basePath="/admin/fees" params={params} {...result} />
          </>
        )}
      </div>
    </AdminShell>
  );
}
