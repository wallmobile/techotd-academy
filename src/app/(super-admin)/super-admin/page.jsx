import Link from "next/link";
import { requireSuperAdminContext } from "@/lib/superAdmin/context";
import { getSuperAdminOverview } from "@/lib/superAdmin/staff";
import { superAdminNavItems } from "@/constants/adminNav";
import { AdminShell } from "@/components/admin/AdminShell";
import { RoleBadge, StatusBadge } from "@/components/admin/AdminDataList";
import {
  Avatar,
  DashboardHero,
  Distribution,
  HealthList,
  Panel,
  ROLE_TONES,
  ShortcutGrid,
} from "@/components/admin/DashboardParts";
import { ROLE_LABELS } from "@/constants/roles";
import { formatDbDate } from "@/lib/utils";

export const metadata = {
  title: "Super Admin Console",
  robots: { index: false, follow: false },
};

const SHORTCUTS = [
  { key: "staff", label: "Staff accounts", href: "/super-admin/staff", icon: "users" },
  { key: "new-staff", label: "Create staff", href: "/super-admin/staff/new", icon: "profile" },
  { key: "roles", label: "Roles & access", href: "/admin/roles", icon: "roles" },
  { key: "admin", label: "Admin panel", href: "/admin", icon: "dashboard" },
];

export default async function SuperAdminOverviewPage() {
  const { user } = await requireSuperAdminContext();
  const data = await getSuperAdminOverview();
  const { stats, statusCounts, system, staffByRole, recentStaff, adminAccounts } = data;
  const notActive = (statusCounts.INACTIVE || 0) + (statusCounts.SUSPENDED || 0);

  return (
    <AdminShell user={user} title="Overview" navItems={superAdminNavItems} brand="TechOTD Super Admin">
      <div className="flex flex-col gap-6">
        <DashboardHero
          name={user.name}
          title="Super Admin Console"
          description="Platform-level control: staff accounts and access."
          actions={[
            { label: "Create staff account", href: "/super-admin/staff/new", icon: "users" },
            { label: "Open admin panel", href: "/admin", icon: "dashboard" },
          ]}
          glance={[
            { label: "Staff accounts", value: stats.staff, icon: "roles", progress: stats.totalUsers ? stats.staff / stats.totalUsers : 0 },
            { label: "Total users", value: stats.totalUsers, icon: "users" },
            { label: "Signed in now", value: stats.usersWithActiveSession, icon: "profile", progress: stats.totalUsers ? stats.usersWithActiveSession / stats.totalUsers : 0 },
            { label: "Inactive / suspended", value: notActive, icon: "attendance", progress: stats.totalUsers ? notActive / stats.totalUsers : 0 },
          ]}
        />

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <Panel title="Staff by role" subtitle={`${stats.staff} staff account${stats.staff === 1 ? "" : "s"} · ${adminAccounts} with admin access`}>
            <Distribution
              items={staffByRole.map(({ role, count }) => ({ key: role, label: ROLE_LABELS[role], value: count, tone: ROLE_TONES[role] }))}
              emptyText="No staff accounts yet."
            />
          </Panel>

          <Panel title="Recent staff accounts" href="/super-admin/staff" className="lg:col-span-2">
            {recentStaff.length === 0 ? (
              <p className="text-sm text-muted">No staff accounts yet.</p>
            ) : (
              <ul className="-my-2.5 divide-y divide-border">
                {recentStaff.map((u) => (
                  <li key={u.id} className="flex flex-wrap items-center gap-x-3 gap-y-2 py-3">
                    <Avatar name={u.name} toneName={ROLE_TONES[u.role]} />
                    <div className="min-w-0 flex-1">
                      <Link href={`/admin/users/${u.id}`} className="block truncate text-sm font-medium text-dark hover:text-primary">
                        {u.name}
                      </Link>
                      <p className="truncate text-xs text-muted">{u.email}</p>
                    </div>
                    <div className="flex flex-none items-center gap-2 max-sm:w-full max-sm:pl-12">
                      <RoleBadge role={u.role} />
                      <StatusBadge status={u.status} />
                      <span className="w-24 text-right text-xs text-muted max-sm:ml-auto">{formatDbDate(u.createdAt)}</span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <Panel title="Shortcuts" className="lg:col-span-2">
            <ShortcutGrid items={SHORTCUTS} />
          </Panel>

          <Panel title="System status">
            <HealthList
              rows={[
                { label: "Database", value: system.databaseOk ? "Connected" : "Unavailable", tone: system.databaseOk ? "success" : "danger" },
                { label: "Signed-in users", value: stats.usersWithActiveSession, tone: "primary" },
                { label: "Inactive / suspended accounts", value: notActive, tone: notActive > 0 ? "warning" : "success" },
              ]}
            />
          </Panel>
        </div>
      </div>
    </AdminShell>
  );
}
