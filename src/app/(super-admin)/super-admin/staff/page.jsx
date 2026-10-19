import Link from "next/link";
import { requireSuperAdminContext } from "@/lib/superAdmin/context";
import { getStaffPage } from "@/lib/superAdmin/staff";
import { parseListParams } from "@/lib/admin/listParams";
import { superAdminNavItems } from "@/constants/adminNav";
import { STAFF_ROLES } from "@/lib/auth/roles";
import { AdminShell } from "@/components/admin/AdminShell";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { AdminSearchForm, AdminPagination } from "@/components/admin/AdminListControls";
import { AdminDataList, RoleBadge, StatusBadge } from "@/components/admin/AdminDataList";
import { EmptyState } from "@/components/ui/EmptyState";
import { Button } from "@/components/ui/Button";
import { formatDbDate } from "@/lib/utils";

export const metadata = {
  title: "Staff Accounts",
  robots: { index: false, follow: false },
};

export default async function SuperAdminStaffPage({ searchParams }) {
  const { user } = await requireSuperAdminContext();
  const params = parseListParams(await searchParams, { allowRole: true });
  if (!STAFF_ROLES.includes(params.role)) params.role = "";
  const result = await getStaffPage(params);

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
    <AdminShell user={user} title="Staff Accounts" navItems={superAdminNavItems} brand="TechOTD Super Admin">
      <div className="flex flex-col gap-6">
        <AdminPageHeader title="Staff Accounts" description="Admins, Super Admins, Counsellors, Accountants, Content and Placement managers.">
          <Button href="/super-admin/staff/new">Create staff account</Button>
        </AdminPageHeader>
        <AdminSearchForm basePath="/super-admin/staff" params={params} searchLabel="Name or email" showRoleFilter roles={STAFF_ROLES} />
        {result.rows.length === 0 ? (
          <EmptyState
            title="No staff accounts found"
            description={params.q || params.role ? "No staff match these filters. Try clearing the search or role filter." : "No staff accounts exist yet."}
          />
        ) : (
          <>
            <AdminDataList columns={columns} rows={result.rows} caption="Staff accounts" />
            <AdminPagination basePath="/super-admin/staff" params={params} {...result} />
          </>
        )}
      </div>
    </AdminShell>
  );
}
