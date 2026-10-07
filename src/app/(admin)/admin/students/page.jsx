import Link from "next/link";
import { requireAdminContext } from "@/lib/admin/context";
import { getStudentsPage } from "@/lib/admin/students";
import { parseListParams } from "@/lib/admin/listParams";
import { AdminShell } from "@/components/admin/AdminShell";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { AdminSearchForm, AdminPagination } from "@/components/admin/AdminListControls";
import { AdminDataList, StatusBadge } from "@/components/admin/AdminDataList";
import { EmptyState } from "@/components/ui/EmptyState";
import { formatDbDate } from "@/lib/utils";

export const metadata = {
  title: "Students",
  robots: { index: false, follow: false },
};

export default async function AdminStudentsPage({ searchParams }) {
  const { user } = await requireAdminContext();
  const params = parseListParams(await searchParams);
  const result = await getStudentsPage(params);

  const columns = [
    {
      key: "name",
      label: "Name",
      primary: true,
      render: (s) => (
        <Link href={`/admin/students/${s.id}`} className="font-semibold text-dark hover:text-primary">
          {s.name}
        </Link>
      ),
    },
    { key: "email", label: "Email", render: (s) => s.email },
    { key: "phone", label: "Phone", render: (s) => s.phone || "—" },
    { key: "city", label: "City", render: (s) => s.city || "—" },
    { key: "enrollments", label: "Courses", render: (s) => s.enrollmentCount },
    { key: "status", label: "Status", render: (s) => <StatusBadge status={s.status} /> },
    { key: "created", label: "Joined", render: (s) => formatDbDate(s.createdAt) },
  ];

  return (
    <AdminShell user={user} title="Students">
      <div className="flex flex-col gap-6">
        <AdminPageHeader title="Students" description="Registered students. Enrollment creation isn't available yet." />
        <AdminSearchForm basePath="/admin/students" params={params} searchLabel="Name, email or phone" />
        {result.rows.length === 0 ? (
          <EmptyState
            title="No students found"
            description={params.q ? "No students match this search." : "No students have registered yet."}
          />
        ) : (
          <>
            <AdminDataList columns={columns} rows={result.rows} caption="Students" />
            <AdminPagination basePath="/admin/students" params={params} {...result} />
          </>
        )}
      </div>
    </AdminShell>
  );
}
