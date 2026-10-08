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
import { ROLES } from "@/lib/auth/roles";

export async function getAdminDashboardData() {
  const ctx = await getAdminContext();
  if (!ctx) return null;

  const byRole = countUsersByRole();
  const roleDistribution = ROLES.map((role) => ({ role, count: byRole[role] || 0 }));
  const total = roleDistribution.reduce((sum, r) => sum + r.count, 0);
  const students = byRole.STUDENT || 0;
  const trainers = byRole.TRAINER || 0;

  let databaseOk = false;
  try {
    databaseOk = pingDatabase();
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
      usersWithActiveSession: countUsersWithActiveSession(),
    },
    roleDistribution,
    statusCounts: countUsersByStatus(),
    enrollments: countEnrollmentsByStatus(),
    recentUsers: listRecentUsers(5),
    system: { databaseOk },
  };
}
