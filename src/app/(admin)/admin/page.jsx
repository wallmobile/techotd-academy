import Link from "next/link";
import { getCurrentUser } from "@/lib/auth/currentUser";
import { getAdminDashboardData } from "@/lib/admin/dashboard";
import { AdminShell } from "@/components/admin/AdminShell";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { AdminStatsGrid } from "@/components/admin/AdminStatsGrid";
import { RoleBadge } from "@/components/admin/AdminDataList";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { ROLE_LABELS } from "@/constants/roles";
import { CRM_ROLES } from "@/constants/crm";
import { FINANCE_ROLES } from "@/constants/fees";
import { PLACEMENT_ROLES } from "@/constants/placement";
import { Button } from "@/components/ui/Button";
import { formatDbDate } from "@/lib/utils";

export const metadata = {
  title: "Admin Dashboard",
  robots: { index: false, follow: false },
};

export default async function AdminDashboardPage() {
  // The (admin) layout has already required a staff role. Only ADMIN /
  // SUPER_ADMIN get data (getAdminDashboardData returns null otherwise);
  // other staff roles see a limited landing page — never a redirect loop.
  const [user, data] = await Promise.all([getCurrentUser(), getAdminDashboardData()]);

  if (!data) {
    return (
      <AdminShell user={user} title="Dashboard">
        <div className="flex flex-col gap-6">
          <AdminPageHeader title={`Welcome, ${user.name}`} description={`Signed in as ${ROLE_LABELS[user.role] || user.role}.`} />
          {CRM_ROLES.includes(user.role) ? (
            <Card className="max-w-md">
              <h2 className="text-sm font-semibold text-dark">Leads / CRM</h2>
              <p className="mt-1 text-sm text-muted">Follow up on enquiries and demo requests assigned to you.</p>
              <div className="mt-4">
                <Button href="/admin/leads">Open Leads</Button>
              </div>
            </Card>
          ) : FINANCE_ROLES.includes(user.role) ? (
            <Card className="max-w-md">
              <h2 className="text-sm font-semibold text-dark">Fees</h2>
              <p className="mt-1 text-sm text-muted">Assign fees to enrollments and record payments.</p>
              <div className="mt-4">
                <Button href="/admin/fees">Open Fees</Button>
              </div>
            </Card>
          ) : PLACEMENT_ROLES.includes(user.role) ? (
            <Card className="max-w-md">
              <h2 className="text-sm font-semibold text-dark">Jobs &amp; Placement</h2>
              <p className="mt-1 text-sm text-muted">Post openings and review student applications.</p>
              <div className="mt-4">
                <Button href="/admin/jobs">Open Jobs</Button>
              </div>
            </Card>
          ) : (
            <EmptyState
              title="No modules available for your role yet"
              description="Administration modules for your role haven't been built yet. Platform administration is currently limited to Admin and Super Admin accounts."
            />
          )}
        </div>
      </AdminShell>
    );
  }

  const { stats, roleDistribution, recentUsers, statusCounts, system, enrollments } = data;
  const maxRole = Math.max(1, ...roleDistribution.map((r) => r.count));
  const notActive = (statusCounts.INACTIVE || 0) + (statusCounts.SUSPENDED || 0);

  return (
    <AdminShell user={user} title="Dashboard">
      <div className="flex flex-col gap-6">
        <AdminPageHeader title="Admin Dashboard" description="Live figures from the platform database." />

        <AdminStatsGrid
          stats={[
            { label: "Total users", value: stats.totalUsers },
            { label: "Students", value: stats.students },
            { label: "Trainers", value: stats.trainers },
            { label: "Staff", value: stats.staff, hint: "Admins and other staff roles" },
            { label: "Signed-in users", value: stats.usersWithActiveSession, hint: "With an unexpired session" },
          ]}
        />

        <div>
          <h2 className="mb-3 text-sm font-semibold text-dark">Enrollments</h2>
          <AdminStatsGrid
            stats={[
              { label: "Active", value: enrollments.ACTIVE },
              { label: "Completed", value: enrollments.COMPLETED },
              { label: "Cancelled", value: enrollments.CANCELLED },
            ]}
          />
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <Card>
            <h2 className="text-sm font-semibold text-dark">Role distribution</h2>
            <ul className="mt-4 flex flex-col gap-3">
              {roleDistribution.map(({ role, count }) => (
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
              <h2 className="text-sm font-semibold text-dark">Recent registrations</h2>
              {recentUsers.length === 0 ? (
                <p className="mt-3 text-sm text-muted">No users yet.</p>
              ) : (
                <ul className="mt-3 divide-y divide-border">
                  {recentUsers.map((u) => (
                    <li key={u.id} className="flex items-center justify-between gap-3 py-2.5">
                      <div className="min-w-0">
                        <Link href={`/admin/users/${u.id}`} className="block truncate text-sm font-medium text-dark hover:text-primary">
                          {u.name}
                        </Link>
                        <p className="truncate text-xs text-muted">{u.email}</p>
                      </div>
                      <div className="flex flex-none flex-col items-end gap-1">
                        <RoleBadge role={u.role} />
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
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-muted">Inactive / suspended accounts</dt>
                  <dd className="font-medium text-dark">{notActive}</dd>
                </div>
              </dl>
            </Card>
          </div>
        </div>
      </div>
    </AdminShell>
  );
}
