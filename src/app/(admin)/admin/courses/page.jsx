import Link from "next/link";
import { requireAdminContext } from "@/lib/admin/context";
import { getCoursesPage, getCourseFormOptions } from "@/lib/admin/courses";
import { parseCourseParams, COURSE_SORTS } from "@/lib/admin/catalogParams";
import { AdminShell } from "@/components/admin/AdminShell";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { AdminPagination } from "@/components/admin/AdminListControls";
import { AdminDataList } from "@/components/admin/AdminDataList";
import { CourseStatusBadge, enrollmentLabel } from "@/components/admin/CatalogParts";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { COURSE_STATUSES, COURSE_STATUS_LABELS } from "@/constants/catalog";

export const metadata = {
  title: "Courses",
  robots: { index: false, follow: false },
};

export default async function AdminCoursesPage({ searchParams }) {
  const { user } = await requireAdminContext();
  const params = parseCourseParams(await searchParams);
  const result = await getCoursesPage(params);
  const options = getCourseFormOptions();
  const hasFilters = params.q || params.category || params.level || params.status || params.sort !== "az";

  const columns = [
    {
      key: "title",
      label: "Course",
      primary: true,
      render: (c) => (
        <div className="flex flex-col gap-0.5">
          <Link href={`/admin/courses/${c.slug}`} className="font-semibold text-dark hover:text-primary">
            {c.title}
          </Link>
          <span className="text-xs text-muted">/courses/{c.slug}</span>
        </div>
      ),
    },
    { key: "category", label: "Category", render: (c) => c.category },
    { key: "level", label: "Level", render: (c) => c.level },
    {
      key: "status",
      label: "Status",
      render: (c) => (
        <span className="flex flex-wrap items-center gap-1.5">
          <CourseStatusBadge status={c.status} />
          {c.isCustom && <Badge variant="secondary">Created here</Badge>}
        </span>
      ),
    },
    { key: "batches", label: "Batches", render: (c) => c.batchCount },
    { key: "enrollments", label: "Enrollments", render: (c) => enrollmentLabel(c) },
    {
      key: "actions",
      label: "Actions",
      render: (c) => (
        <Link href={`/admin/courses/${c.slug}`} className="text-sm font-medium text-primary hover:text-primary-hover">
          View
        </Link>
      ),
    },
  ];

  return (
    <AdminShell user={user} title="Courses">
      <div className="flex flex-col gap-6">
        <AdminPageHeader title="Courses" description="The course catalog shown on the public site. Courses are unpublished, never deleted.">
          <Button href="/admin/courses/new">+ New Course</Button>
        </AdminPageHeader>

        <form method="get" action="/admin/courses" role="search" className="flex flex-col gap-3">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="sm:col-span-2 lg:col-span-4">
              <Input label="Search" id="q" name="q" type="search" defaultValue={params.q} placeholder="Title, category or technology" maxLength={100} />
            </div>
            <Select label="Category" id="category" name="category" defaultValue={params.category}>
              <option value="">All categories</option>
              {options.categories.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </Select>
            <Select label="Level" id="level" name="level" defaultValue={params.level}>
              <option value="">All levels</option>
              {options.levels.map((l) => (
                <option key={l} value={l}>
                  {l}
                </option>
              ))}
            </Select>
            <Select label="Status" id="status" name="status" defaultValue={params.status}>
              <option value="">All statuses</option>
              {COURSE_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {COURSE_STATUS_LABELS[s]}
                </option>
              ))}
            </Select>
            <Select label="Sort" id="sort" name="sort" defaultValue={params.sort}>
              {Object.entries(COURSE_SORTS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </Select>
          </div>
          <div className="flex items-center gap-3">
            <Button type="submit">Apply</Button>
            {hasFilters && (
              <Link href="/admin/courses" className="text-sm font-medium text-primary hover:text-primary-hover">
                Reset
              </Link>
            )}
          </div>
        </form>

        {result.rows.length === 0 ? (
          <EmptyState
            title="No courses found."
            description={hasFilters ? "No courses match these filters." : "Create a course to see it here."}
            actionLabel={hasFilters ? undefined : "New Course"}
            actionHref={hasFilters ? undefined : "/admin/courses/new"}
          />
        ) : (
          <>
            <AdminDataList columns={columns} rows={result.rows} caption="Courses" />
            <AdminPagination basePath="/admin/courses" params={params} {...result} />
          </>
        )}
      </div>
    </AdminShell>
  );
}
