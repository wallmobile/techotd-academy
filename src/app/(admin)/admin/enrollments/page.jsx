import Link from "next/link";
import { requireAdminContext } from "@/lib/admin/context";
import { getEnrollmentsPage, getBatchFilterOptions, getCourseFilterOptions } from "@/lib/admin/enrollments";
import { parseEnrollmentParams } from "@/lib/admin/enrollmentParams";
import { AdminShell } from "@/components/admin/AdminShell";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { AdminPagination } from "@/components/admin/AdminListControls";
import { AdminDataList, EnrollmentStatusBadge } from "@/components/admin/AdminDataList";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { ENROLLMENT_STATUSES, ENROLLMENT_STATUS_LABELS } from "@/constants/enrollment";
import { formatDbDate } from "@/lib/utils";

export const metadata = {
  title: "Enrollments",
  robots: { index: false, follow: false },
};

const SORTS = { newest: "Newest first", oldest: "Oldest first", name: "Student name (A–Z)" };

export default async function AdminEnrollmentsPage({ searchParams }) {
  const { user } = await requireAdminContext();
  const params = parseEnrollmentParams(await searchParams);
  const result = await getEnrollmentsPage(params);
  const courseOptions = getCourseFilterOptions();
  const batchOptions = getBatchFilterOptions().filter((b) => !params.course || b.courseSlug === params.course);
  const hasFilters = params.q || params.course || params.batch || params.status || params.sort !== "newest";

  const columns = [
    {
      key: "student",
      label: "Student",
      primary: true,
      render: (e) => (
        <Link href={`/admin/enrollments/${e.id}`} className="font-semibold text-dark hover:text-primary">
          {e.studentName}
        </Link>
      ),
    },
    { key: "email", label: "Email", render: (e) => e.studentEmail },
    { key: "course", label: "Course", render: (e) => e.courseTitle },
    { key: "batch", label: "Batch", render: (e) => e.batchLabel },
    { key: "status", label: "Status", render: (e) => <EnrollmentStatusBadge status={e.status} /> },
    { key: "date", label: "Enrolled", render: (e) => formatDbDate(e.enrolledAt) },
    {
      key: "actions",
      label: "Actions",
      render: (e) => (
        <Link href={`/admin/enrollments/${e.id}`} className="text-sm font-medium text-primary hover:text-primary-hover">
          View
        </Link>
      ),
    },
  ];

  return (
    <AdminShell user={user} title="Enrollments">
      <div className="flex flex-col gap-6">
        <AdminPageHeader title="Enrollments" description="Students enrolled in a course and batch, including completed and cancelled history.">
          <Button href="/admin/enrollments/new">+ New Enrollment</Button>
        </AdminPageHeader>

        <form method="get" action="/admin/enrollments" role="search" className="flex flex-col gap-3">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="sm:col-span-2 lg:col-span-4">
              <Input label="Search" id="q" name="q" type="search" defaultValue={params.q} placeholder="Student name, email or phone" maxLength={100} />
            </div>
            <Select label="Course" id="course" name="course" defaultValue={params.course}>
              <option value="">All courses</option>
              {courseOptions.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </Select>
            <Select label="Batch" id="batch" name="batch" defaultValue={params.batch}>
              <option value="">All batches</option>
              {batchOptions.map((b) => (
                <option key={b.value} value={b.value}>
                  {b.label}
                </option>
              ))}
            </Select>
            <Select label="Status" id="status" name="status" defaultValue={params.status}>
              <option value="">All statuses</option>
              {ENROLLMENT_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {ENROLLMENT_STATUS_LABELS[s]}
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
              <Link href="/admin/enrollments" className="text-sm font-medium text-primary hover:text-primary-hover">
                Reset
              </Link>
            )}
          </div>
        </form>

        {result.rows.length === 0 ? (
          <EmptyState
            title="No enrollments found."
            description={hasFilters ? "No enrollments match these filters." : "Enroll a student to see them here."}
            actionLabel={hasFilters ? undefined : "New Enrollment"}
            actionHref={hasFilters ? undefined : "/admin/enrollments/new"}
          />
        ) : (
          <>
            <AdminDataList columns={columns} rows={result.rows} caption="Enrollments" />
            <AdminPagination basePath="/admin/enrollments" params={params} {...result} />
          </>
        )}
      </div>
    </AdminShell>
  );
}
