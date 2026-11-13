import Link from "next/link";
import { getCurrentUser } from "@/lib/auth/currentUser";
import { getAdminDashboardData, getAdminDashboardInsights } from "@/lib/admin/dashboard";
import { AdminShell } from "@/components/admin/AdminShell";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { RoleBadge } from "@/components/admin/AdminDataList";
import { BatchStatusBadge } from "@/components/admin/CatalogParts";
import {
  Avatar,
  DashboardHero,
  Distribution,
  HealthList,
  KpiGrid,
  Panel,
  ROLE_TONES,
  ShortcutGrid,
  TrendChart,
} from "@/components/admin/DashboardParts";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { ROLE_LABELS } from "@/constants/roles";
import { CRM_ROLES, LEAD_STATUSES, LEAD_STATUS_LABELS } from "@/constants/crm";
import { FINANCE_ROLES } from "@/constants/fees";
import { PLACEMENT_ROLES } from "@/constants/placement";
import { adminNavItems } from "@/constants/adminNav";
import { Button } from "@/components/ui/Button";
import { formatDbDate } from "@/lib/utils";

export const metadata = {
  title: "Admin Dashboard",
  robots: { index: false, follow: false },
};

const LEAD_TONES = { NEW: "primary", CONTACTED: "sky", QUALIFIED: "secondary", FOLLOW_UP: "warning", CONVERTED: "success", LOST: "slate" };
const SHORTCUT_KEYS = ["leads", "students", "enrollments", "batches", "courses", "fees", "certificates", "jobs"];

// Whole units for headline figures; the Fees pages show exact amounts.
function formatMoney(minor, currency) {
  const whole = new Intl.NumberFormat("en-IN").format(Math.round(minor / 100));
  return currency === "INR" ? `₹${whole}` : `${currency} ${whole}`;
}

export default async function AdminDashboardPage() {
  // The (admin) layout has already required a staff role. Only ADMIN /
  // SUPER_ADMIN get data (getAdminDashboardData returns null otherwise);
  // other staff roles see a limited landing page — never a redirect loop.
  const [user, data, insights] = await Promise.all([getCurrentUser(), getAdminDashboardData(), getAdminDashboardInsights()]);

  if (!data || !insights) {
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
  const { registrations, leads, finance, pipeline, upcomingBatches } = insights;
  const notActive = (statusCounts.INACTIVE || 0) + (statusCounts.SUSPENDED || 0);
  const newLeads = pipeline.NEW || 0;
  const totalLeads = Object.values(pipeline).reduce((sum, c) => sum + c, 0);
  const totalEnrollments = enrollments.ACTIVE + enrollments.COMPLETED + enrollments.CANCELLED;
  const shortcuts = SHORTCUT_KEYS.map((key) => adminNavItems.find((item) => item.key === key)).filter(
    (item) => item && !item.comingSoon && (!item.roles || item.roles.includes(user.role))
  );

  return (
    <AdminShell user={user} title="Dashboard">
      <div className="flex flex-col gap-6">
        <DashboardHero
          name={user.name}
          title="Admin Dashboard"
          description="Live figures from the platform database."
          actions={[
            { label: "New enrollment", href: "/admin/enrollments/new", icon: "batches" },
            { label: "View leads", href: "/admin/leads", icon: "crm" },
            { label: "Analytics", href: "/admin/analytics", icon: "reports" },
          ]}
          glance={[
            { label: "New leads to contact", value: newLeads, icon: "crm", progress: totalLeads ? newLeads / totalLeads : 0 },
            { label: "Active enrollments", value: enrollments.ACTIVE, icon: "batches", progress: totalEnrollments ? enrollments.ACTIVE / totalEnrollments : 0 },
            {
              label: "Collected · 30 days",
              value: formatMoney(finance.collected, finance.currency),
              icon: "payments",
              progress: finance.collected + finance.outstanding ? finance.collected / (finance.collected + finance.outstanding) : 0,
            },
            { label: "Open & upcoming batches", value: insights.openBatchCount, icon: "students" },
          ]}
        />

        <KpiGrid
          items={[
            {
              label: "Students",
              value: stats.students,
              hint: `+${registrations.total} registered in the last 30 days`,
              icon: "students",
              tone: "primary",
              trend: registrations.series,
              href: "/admin/students",
            },
            {
              label: "Leads (30 days)",
              value: leads.total,
              hint: `${leads.conversions} converted to students`,
              icon: "crm",
              tone: "secondary",
              trend: leads.series,
              href: "/admin/leads",
            },
            {
              label: "Active enrollments",
              value: enrollments.ACTIVE,
              hint: `+${insights.enrollments.created} new · ${enrollments.COMPLETED} completed · ${enrollments.CANCELLED} cancelled`,
              icon: "batches",
              tone: "success",
              trend: insights.enrollments.series,
              href: "/admin/enrollments",
            },
            {
              label: "Collected (30 days)",
              value: formatMoney(finance.collected, finance.currency),
              hint:
                finance.outstanding > 0
                  ? `${formatMoney(finance.outstanding, finance.currency)} outstanding${finance.overdue > 0 ? ` · ${formatMoney(finance.overdue, finance.currency)} overdue` : ""}`
                  : "Nothing outstanding",
              icon: "payments",
              tone: "warning",
              trend: finance.series,
              href: "/admin/fees",
            },
          ]}
        />

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <Panel title="Activity" subtitle="Daily leads, student registrations and enrollments · last 30 days" href="/admin/analytics" linkLabel="Full report" className="lg:col-span-2">
            <TrendChart
              days={insights.days}
              series={[
                { key: "leads", label: "Leads", tone: "secondary", values: leads.series },
                { key: "registrations", label: "Registrations", tone: "primary", values: registrations.series },
                { key: "enrollments", label: "Enrollments", tone: "success", values: insights.enrollments.series },
              ]}
            />
          </Panel>

          <Panel title="Lead pipeline" subtitle="All leads by current status" href="/admin/leads" linkLabel="Open CRM">
            {newLeads > 0 && (
              <Link
                href="/admin/leads?status=NEW"
                className="mb-4 flex items-center gap-3 rounded-sm border border-primary/20 bg-primary/5 px-3 py-2.5 text-sm text-primary transition-colors hover:bg-primary/10"
              >
                <span className="relative flex h-2.5 w-2.5 flex-none">
                  <span aria-hidden="true" className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-60 motion-reduce:animate-none" />
                  <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-primary" />
                </span>
                <span className="flex-1">
                  <strong className="font-semibold">{newLeads}</strong> new {newLeads === 1 ? "lead is" : "leads are"} waiting for first contact
                </span>
                <span aria-hidden="true">→</span>
              </Link>
            )}
            <Distribution
              items={LEAD_STATUSES.map((s) => ({ key: s, label: LEAD_STATUS_LABELS[s], value: pipeline[s] || 0, tone: LEAD_TONES[s] }))}
              emptyText="No leads yet. Enquiries and demo requests from the website will appear here."
            />
          </Panel>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <Panel title="Upcoming batches" subtitle="Open and upcoming, soonest first" href="/admin/batches">
            {upcomingBatches.length === 0 ? (
              <p className="text-sm text-muted">No open or upcoming batches.</p>
            ) : (
              <ul className="-my-2.5 divide-y divide-border">
                {upcomingBatches.map((b) => (
                  <li key={b.id} className="py-2.5">
                    <Link href={`/admin/batches/${b.id}`} className="group flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-dark group-hover:text-primary">{b.courseTitle}</p>
                        <p className="mt-0.5 truncate text-xs text-muted">
                          {b.startDate} · {b.enrolled} enrolled
                        </p>
                      </div>
                      <BatchStatusBadge status={b.status} />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Panel>

          <Panel title="Recent registrations" href="/admin/users">
            {recentUsers.length === 0 ? (
              <p className="text-sm text-muted">No users yet.</p>
            ) : (
              <ul className="-my-2.5 divide-y divide-border">
                {recentUsers.map((u) => (
                  <li key={u.id} className="flex items-center gap-3 py-2.5">
                    <Avatar name={u.name} toneName={ROLE_TONES[u.role]} />
                    <div className="min-w-0 flex-1">
                      <Link href={`/admin/users/${u.id}`} className="block truncate text-sm font-medium text-dark hover:text-primary">
                        {u.name}
                      </Link>
                      <p className="truncate text-xs text-muted">{u.email}</p>
                    </div>
                    <div className="flex flex-none flex-col items-end gap-1">
                      <RoleBadge role={u.role} />
                      <span className="text-[11px] text-muted">{formatDbDate(u.createdAt)}</span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Panel>

          <Panel title="People" subtitle="Accounts by role" href="/admin/roles" linkLabel="Roles & access">
            <dl className="mb-5 grid grid-cols-2 gap-3">
              {[
                { label: "Total users", value: stats.totalUsers },
                { label: "Trainers", value: stats.trainers },
                { label: "Staff", value: stats.staff },
                { label: "Signed in now", value: stats.usersWithActiveSession },
              ].map((s) => (
                <div key={s.label} className="rounded-sm bg-surface px-3 py-2.5">
                  <dt className="text-[11px] font-medium uppercase tracking-wide text-muted">{s.label}</dt>
                  <dd className="mt-0.5 text-lg font-semibold text-dark">{s.value}</dd>
                </div>
              ))}
            </dl>
            <Distribution
              items={roleDistribution
                .filter((r) => r.count > 0)
                .map((r) => ({ key: r.role, label: ROLE_LABELS[r.role], value: r.count, tone: ROLE_TONES[r.role] }))}
            />
          </Panel>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <Panel title="Shortcuts" className="lg:col-span-2">
            <ShortcutGrid items={shortcuts} />
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
