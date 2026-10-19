import Link from "next/link";
import { requireAdminContext } from "@/lib/admin/context";
import { getCertificatesPage, getCertificateSummary } from "@/lib/certificates/service";
import { parseCertificateParams } from "@/lib/certificates/params";
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
import { listCourses } from "@/lib/catalog";
import { formatDbDate } from "@/lib/utils";

export const metadata = {
  title: "Certificates",
  robots: { index: false, follow: false },
};

const SORTS = { newest: "Newest first", oldest: "Oldest first", name: "Student name (A–Z)" };

export default async function AdminCertificatesPage({ searchParams }) {
  const { user } = await requireAdminContext();
  const params = parseCertificateParams(await searchParams);
  const [result, summary] = await Promise.all([getCertificatesPage(params), getCertificateSummary()]);
  const hasFilters = params.q || params.status || params.course || params.sort !== "newest";

  const columns = [
    {
      key: "student",
      label: "Student",
      primary: true,
      render: (c) => (
        <Link href={`/admin/certificates/${c.id}`} className="font-semibold text-dark hover:text-primary">
          {c.studentName}
        </Link>
      ),
    },
    { key: "course", label: "Course", render: (c) => c.courseTitle },
    { key: "number", label: "Certificate no.", render: (c) => c.certificateNumber },
    { key: "issued", label: "Issued", render: (c) => formatDbDate(c.issuedAt) },
    {
      key: "basis",
      label: "Basis",
      render: (c) => (c.issuanceBasis === "MANUAL_APPROVAL" ? "Manual approval" : c.issuanceBasis === "AUTO_COMPLETE" ? "Completion" : "—"),
    },
    {
      key: "status",
      label: "Status",
      render: (c) => <Badge variant={c.status === "ACTIVE" ? "success" : "danger"}>{c.status === "ACTIVE" ? "Active" : "Revoked"}</Badge>,
    },
  ];

  return (
    <AdminShell user={user} title="Certificates">
      <div className="flex flex-col gap-6">
        <AdminPageHeader title="Certificates" description="Certificates issued to students for completed courses.">
          <Button href="/admin/certificates/new">+ Issue Certificate</Button>
        </AdminPageHeader>

        <AdminStatsGrid stats={[{ label: "Active", value: summary.ACTIVE }, { label: "Revoked", value: summary.REVOKED }]} />

        <form method="get" action="/admin/certificates" role="search" className="flex flex-col gap-3">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Input label="Search" id="q" name="q" type="search" defaultValue={params.q} placeholder="Name, email or certificate no." maxLength={100} />
            <Select label="Status" id="status" name="status" defaultValue={params.status}>
              <option value="">All</option>
              <option value="ACTIVE">Active</option>
              <option value="REVOKED">Revoked</option>
            </Select>
            <Select label="Course" id="course" name="course" defaultValue={params.course}>
              <option value="">All courses</option>
              {listCourses().map((c) => (
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
              <Link href="/admin/certificates" className="text-sm font-medium text-primary hover:text-primary-hover">
                Reset
              </Link>
            )}
          </div>
        </form>

        {result.rows.length === 0 ? (
          <EmptyState
            title="No certificates found."
            description={hasFilters ? "No certificates match these filters." : "No certificates have been issued yet."}
            actionLabel={hasFilters ? undefined : "Issue Certificate"}
            actionHref={hasFilters ? undefined : "/admin/certificates/new"}
          />
        ) : (
          <>
            <AdminDataList columns={columns} rows={result.rows} caption="Certificates" />
            <AdminPagination basePath="/admin/certificates" params={params} {...result} />
          </>
        )}
      </div>
    </AdminShell>
  );
}
