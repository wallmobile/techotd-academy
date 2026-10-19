import Link from "next/link";
import { requireSuperAdminContext } from "@/lib/superAdmin/context";
import { getSuperAdminOverview } from "@/lib/superAdmin/staff";
import { superAdminNavItems } from "@/constants/adminNav";
import { AdminShell } from "@/components/admin/AdminShell";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { AdminStatsGrid } from "@/components/admin/AdminStatsGrid";
import { RoleBadge, StatusBadge } from "@/components/admin/AdminDataList";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { ROLE_LABELS } from "@/constants/roles";
import { formatDbDate } from "@/lib/utils";

export const metadata = {
  title: "Super Admin Console",
  robots: { index: false, follow: false },
};

export default async function SuperAdminOverviewPage() {
  const { user } = await requireSuperAdminContext();
  const data = await getSuperAdminOverview();
  const { stats, statusCounts, system, staffByRole, recentStaff, adminAccounts } = data;
  const maxRole = Math.max(1, ...staffByRole.map((r) => r.count));
  const notActive = (statusCounts.INACTIVE || 0) + (statusCounts.SUSPENDED || 0);

  return (
    <AdminShell user={user} title="Overview" navItems={superAdminNavItems} brand="TechOTD Super Admin">
      <div className="flex flex-col gap-6">
        <AdminPageHeader title="Super Admin Console" description="Platform-level control: staff accounts and access.">
          <Button href="/super-admin/staff/new">Create staff account</Button>
        </AdminPageHeader>

        <AdminStatsGrid
          stats={[
            { label: "Total users", value: stats.totalUsers },
            { label: "Staff accounts", value: stats.staff, hint: "All non-student, non-trainer roles" },
            { label: "Admin accounts", value: adminAccounts, hint: "Admin + Super Admin" },
            { label: "Signed-in users", value: stats.usersWithActiveSession, hint: "With an unexpired session" },
            { label: "Inactive / suspended", value: notActive },
          ]}
        />

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <Card>
            <h2 className="text-sm font-semibold text-dark">Staff by role</h2>
            <ul className="mt-4 flex flex-col gap-3">
              {staffByRole.map(({ role, count }) => (
                <li key={role} className="text-sm">
                  <div className="flex justify-between gap-3">
                    <span className="text-text">{ROLE_LABELS[role]}</span>
                    <span className="font-medium text-dark">{count}</span>
                  </div>
                  <div aria-hidden="true" className="mt-1 h-1.5 rounded-full bg-surface">
                    <div className="h-1.5 rounded-full bg-primary" style={{ width: `${(count / maxRole) * 100}%` }} />
                  </div>
                </li>
              ))}
            </ul>
          </Card>

          <div className="flex flex-col gap-6">
            <Card>
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-sm font-semibold text-dark">Recent staff accounts</h2>
                <Link href="/super-admin/staff" className="text-xs font-medium text-primary hover:text-primary-hover">
                  View all
                </Link>
              </div>
              {recentStaff.length === 0 ? (
                <p className="mt-3 text-sm text-muted">No staff accounts yet.</p>
              ) : (
                <ul className="mt-3 divide-y divide-border">
                  {recentStaff.map((u) => (
                    <li key={u.id} className="flex items-center justify-between gap-3 py-2.5">
                      <div className="min-w-0">
                        <Link href={`/admin/users/${u.id}`} className="block truncate text-sm font-medium text-dark hover:text-primary">
                          {u.name}
                        </Link>
                        <p className="truncate text-xs text-muted">{u.email}</p>
                      </div>
                      <div className="flex flex-none flex-col items-end gap-1">
                        <RoleBadge role={u.role} />
                        <StatusBadge status={u.status} />
                        <span className="text-xs text-muted">{formatDbDate(u.createdAt)}</span>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </Card>

            <Card>
              <h2 className="text-sm font-semibold text-dark">System status</h2>
              <dl className="mt-3 flex flex-col gap-2 text-sm">
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-muted">Database</dt>
                  <dd>
                    <Badge variant={system.databaseOk ? "success" : "danger"}>
                      {system.databaseOk ? "Connected" : "Unavailable"}
                    </Badge>
                  </dd>
                </div>
              </dl>
            </Card>
          </div>
        </div>
      </div>
    </AdminShell>
  );
}
