// Admin dashboard aggregates (Phase 10.1). Every figure is computed from
// real rows at request time — nothing is hard-coded or estimated. Returns
// null for anyone who isn't an ADMIN/SUPER_ADMIN.

import { getAdminContext } from "@/lib/admin/context";
import {
  countUsersByRole,
  countUsersByStatus,
  countUsersWithActiveSession,
  listRecentUsers,
  pingDatabase,
} from "@/lib/db/adminQueries";
import { countEnrollmentsByStatus } from "@/lib/db/enrollments";
import { countLeadsByStatus } from "@/lib/db/leads";
import { getBatchEnrollmentSummary } from "@/lib/db/catalog";
import { getAnalytics, toSeries } from "@/lib/analytics/service";
import { listBatches, getCourse } from "@/lib/catalog";
import { listDays } from "@/lib/analytics/range";
import { ROLES } from "@/lib/auth/roles";
import { PUBLIC_BATCH_STATUSES } from "@/constants/catalog";
import { DEFAULT_CURRENCY } from "@/constants/fees";

export async function getAdminDashboardData() {
  const ctx = await getAdminContext();
  if (!ctx) return null;

  const byRole = await countUsersByRole();
  const roleDistribution = ROLES.map((role) => ({ role, count: byRole[role] || 0 }));
  const total = roleDistribution.reduce((sum, r) => sum + r.count, 0);
  const students = byRole.STUDENT || 0;
  const trainers = byRole.TRAINER || 0;

  let databaseOk = false;
  try {
    databaseOk = await pingDatabase();
  } catch {
    databaseOk = false;
  }

  return {
    user: ctx.user,
    stats: {
      totalUsers: total,
      students,
      trainers,
      staff: total - students - trainers,
      usersWithActiveSession: await countUsersWithActiveSession(),
    },
    roleDistribution,
    statusCounts: await countUsersByStatus(),
    enrollments: await countEnrollmentsByStatus(),
    recentUsers: await listRecentUsers(5),
    system: { databaseOk },
  };
}

const sumBy = (rows, key) => rows.reduce((s, r) => s + Number(r[key] || 0), 0);

// The richer dashboard panels: last-30-day activity (from the analytics
// service, so the definitions match /admin/analytics), the current lead
// pipeline and the next batches to start. Kept apart from
// getAdminDashboardData so the Super Admin overview doesn't pay for it.
// Money is reported in DEFAULT_CURRENCY only (currencies are never summed).
export async function getAdminDashboardInsights() {
  if (!(await getAdminContext())) return null;

  const report = await getAnalytics({ preset: "last30" });
  const { range } = report;
  const inCurrency = (rows) => (rows || []).filter((r) => r.currency === DEFAULT_CURRENCY);

  const collectedByDay = {};
  for (const r of inCurrency(report.dailyCollected)) collectedByDay[r.d] = (collectedByDay[r.d] || 0) + Number(r.c);
  const outstanding = inCurrency(report.finance?.outstanding)[0];

  const pipeline = await countLeadsByStatus();

  const openBatches = (await listBatches()).filter((b) => PUBLIC_BATCH_STATUSES.includes(b.status));
  const upcoming = [...openBatches]
    .sort((a, b) => (a.datesTba ? 1 : 0) - (b.datesTba ? 1 : 0) || String(a.startsOn).localeCompare(String(b.startsOn)))
    .slice(0, 4);
  const upcomingBatches = await Promise.all(
    upcoming.map(async (b) => ({
      id: b.id,
      courseTitle: (await getCourse(b.courseSlug))?.title ?? b.courseSlug,
      startDate: b.startDate,
      status: b.status,
      mode: b.mode,
      enrolled: (await getBatchEnrollmentSummary(b.id)).ACTIVE || 0,
    }))
  );

  return {
    range: { from: range.from, to: range.to },
    days: listDays(range.from, range.to),
    registrations: {
      total: report.overview.registrations,
      totalStudents: report.overview.totalStudents,
      series: toSeries(range, report.dailyRegistrations).map((p) => p.value),
    },
    leads: {
      total: report.crm.total,
      conversions: report.crm.verifiedConversions,
      series: toSeries(range, report.dailyLeads).map((p) => p.value),
    },
    enrollments: {
      created: report.enrollment.created,
      series: toSeries(range, report.dailyEnrollments).map((p) => p.value),
    },
    finance: {
      currency: DEFAULT_CURRENCY,
      collected: sumBy(inCurrency(report.finance.collected), "amount"),
      outstanding: Number(outstanding?.balance || 0),
      overdue: Number(outstanding?.overdue_balance || 0),
      series: toSeries(range, collectedByDay).map((p) => p.value),
    },
    pipeline,
    openBatchCount: openBatches.length,
    upcomingBatches,
  };
}
