import { requireAdminContext } from "@/lib/admin/context";
import { getAdminDashboardData } from "@/lib/admin/dashboard";
import { ROLES, ROLE_HOME_ROUTES, AREA_ROLES } from "@/lib/auth/roles";
import { ROLE_LABELS, ADMIN_MANAGEMENT_ROLES } from "@/constants/roles";
import { CRM_ROLES, CRM_MANAGER_ROLES } from "@/constants/crm";
import { AdminShell } from "@/components/admin/AdminShell";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { AdminDataList } from "@/components/admin/AdminDataList";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";

export const metadata = {
  title: "Roles & Access",
  robots: { index: false, follow: false },
};

function areaFor(role) {
  if (AREA_ROLES.student.includes(role)) return "Student LMS";
  if (AREA_ROLES.trainer.includes(role)) return "Trainer area";
  if (AREA_ROLES["super-admin"].includes(role)) return "Super Admin console + Admin area";
  if (AREA_ROLES.admin.includes(role)) return "Admin area";
  return "—";
}

export default async function AdminRolesPage() {
  const { user } = await requireAdminContext();
  const data = await getAdminDashboardData();
  const counts = Object.fromEntries((data?.roleDistribution || []).map((r) => [r.role, r.count]));

  const rows = ROLES.map((role) => ({ id: role, role }));
  const columns = [
    { key: "role", label: "Role", primary: true, render: (r) => <span className="font-semibold text-dark">{ROLE_LABELS[r.role]}</span> },
    { key: "area", label: "Area", render: (r) => areaFor(r.role) },
    { key: "home", label: "Signs in to", render: (r) => <code className="text-xs">{ROLE_HOME_ROUTES[r.role]}</code> },
    {
      key: "manage",
      label: "Admin management",
      render: (r) =>
        ADMIN_MANAGEMENT_ROLES.includes(r.role) ? <Badge variant="success">Full</Badge> : <Badge variant="neutral">None</Badge>,
    },
    {
      key: "crm",
      label: "Leads / CRM",
      render: (r) =>
        CRM_MANAGER_ROLES.includes(r.role) ? <Badge variant="success">All leads</Badge> : CRM_ROLES.includes(r.role) ? <Badge variant="primary">Assigned + unassigned</Badge> : <Badge variant="neutral">None</Badge>,
    },
    { key: "users", label: "Users", render: (r) => counts[r.role] ?? 0 },
  ];

  return (
    <AdminShell user={user} title="Roles & Access">
      <div className="flex flex-col gap-6">
        <AdminPageHeader title="Roles & Access" description="How each role is routed and what it can administer." />

        <AdminDataList columns={columns} rows={rows} caption="Roles and access" />

        <Card>
          <h2 className="text-sm font-semibold text-dark">Access policy</h2>
          <ul className="mt-3 list-disc space-y-1.5 pl-5 text-sm text-muted">
            <li>
              <span className="font-medium text-text">Super Admin</span> and <span className="font-medium text-text">Admin</span> can use the
              Users, Students, Trainers and Roles pages.
            </li>
            <li>Other staff roles can sign in to the Admin area but only see a limited dashboard until their modules exist.</li>
            <li>Counsellors can use Leads / CRM only: they see leads assigned to them plus the unassigned queue, and can change status and add notes only on leads assigned to them.</li>
            <li>Students and Trainers can never open the Admin area; they are sent back to their own area.</li>
            <li>Every Admin page and action re-checks the signed-in user on the server.</li>
          </ul>
          <p className="mt-4 rounded-sm border border-border bg-surface px-4 py-3 text-sm text-muted">
            Role changes are not available yet. Editing roles (with Super Admin-only promotion, last-Super-Admin protection and an audit
            trail) is deferred to a later phase; today a role is set when an account is created.
          </p>
        </Card>
      </div>
    </AdminShell>
  );
}
