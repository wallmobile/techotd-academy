import Link from "next/link";
import { requireAdminContext } from "@/lib/admin/context";
import { getUsersPage } from "@/lib/admin/users";
import { parseListParams } from "@/lib/admin/listParams";
import { AdminShell } from "@/components/admin/AdminShell";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { AdminSearchForm, AdminPagination } from "@/components/admin/AdminListControls";
import { AdminDataList, RoleBadge, StatusBadge } from "@/components/admin/AdminDataList";
import { EmptyState } from "@/components/ui/EmptyState";
import { formatDbDate } from "@/lib/utils";

export const metadata = {
  title: "Users",
  robots: { index: false, follow: false },
};

export default async function AdminUsersPage({ searchParams }) {
  const { user } = await requireAdminContext();
  const params = parseListParams(await searchParams, { allowRole: true });
  const result = await getUsersPage(params);

  const columns = [
    {
      key: "name",
      label: "Name",
      primary: true,
      render: (u) => (
        <Link href={`/admin/users/${u.id}`} className="font-semibold text-dark hover:text-primary">
          {u.name}
        </Link>
      ),
    },
    { key: "email", label: "Email", render: (u) => u.email },
    { key: "phone", label: "Phone", render: (u) => u.phone || "—" },
    { key: "role", label: "Role", render: (u) => <RoleBadge role={u.role} /> },
    { key: "status", label: "Status", render: (u) => <StatusBadge status={u.status} /> },
    {
      key: "session",
      label: "Session",
      render: (u) => (u.activeSessionCount > 0 ? `Signed in (${u.activeSessionCount})` : "No active session"),
    },
    { key: "created", label: "Joined", render: (u) => formatDbDate(u.createdAt) },
  ];

  return (
    <AdminShell user={user} title="Users">
      <div className="flex flex-col gap-6">
        <AdminPageHeader title="Users" description="Every account on the platform, across all roles." />
        <AdminSearchForm basePath="/admin/users" params={params} searchLabel="Name or email" showRoleFilter />
        {result.rows.length === 0 ? (
          <EmptyState
            title="No users found"
            description={params.q || params.role ? "No users match these filters. Try clearing the search or role filter." : "No users have registered yet."}
          />
        ) : (
          <>
            <AdminDataList columns={columns} rows={result.rows} caption="Users" />
            <AdminPagination basePath="/admin/users" params={params} {...result} />
          </>
        )}
      </div>
    </AdminShell>
  );
}
