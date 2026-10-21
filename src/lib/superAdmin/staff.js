// Super Admin staff management: listing, creation and the console overview.
// Every function re-derives the caller from the session via
// getSuperAdminContext() and returns an "empty" result for anyone who isn't
// an ACTIVE SUPER_ADMIN. Status changes reuse setUserStatus
// (src/lib/admin/users.js), which already enforces self-lockout and
// last-Super-Admin protection.

import { isUniqueViolation } from "@/lib/db/client";
import { getSuperAdminContext } from "@/lib/superAdmin/context";
import { PAGE_SIZE, paginate } from "@/lib/admin/listParams";
import { getAdminDashboardData } from "@/lib/admin/dashboard";
import { listStaffPage } from "@/lib/db/adminQueries";
import { createUser, findUserByEmailInternal } from "@/lib/db/users";
import { hashPassword } from "@/lib/auth/password";
import { STAFF_ROLES } from "@/lib/auth/roles";
import { CREATABLE_STAFF_ROLES } from "@/constants/roles";
import { writeAudit } from "@/lib/db/audit";

const EMPTY_PAGE = { rows: [], page: 1, totalPages: 1, pageSize: PAGE_SIZE, total: 0 };

export async function getStaffPage({ q, role, sort, page }) {
  if (!(await getSuperAdminContext())) return EMPTY_PAGE;
  const probe = paginate((await listStaffPage({ roles: STAFF_ROLES, q, role, sort, limit: 1, offset: 0 })).total, page);
  const { rows, total } = await listStaffPage({
    roles: STAFF_ROLES,
    q,
    role,
    sort,
    limit: PAGE_SIZE,
    offset: (probe.page - 1) * PAGE_SIZE,
  });
  return { rows, ...paginate(total, probe.page) };
}

// Null for anyone but a SUPER_ADMIN. Staff-only figures on top of the Admin
// dashboard aggregates — all computed from real rows.
export async function getSuperAdminOverview() {
  if (!(await getSuperAdminContext())) return null;
  const base = await getAdminDashboardData();
  if (!base) return null;

  const count = Object.fromEntries(base.roleDistribution.map((r) => [r.role, r.count]));
  const staffByRole = STAFF_ROLES.map((role) => ({ role, count: count[role] || 0 }));
  const recentStaff = (await listStaffPage({ roles: STAFF_ROLES, limit: 5, offset: 0 })).rows;

  return {
    stats: base.stats,
    statusCounts: base.statusCounts,
    system: base.system,
    staffByRole,
    recentStaff,
    adminAccounts: (count.ADMIN || 0) + (count.SUPER_ADMIN || 0),
  };
}

// Creates a staff account. `role` must be one of CREATABLE_STAFF_ROLES —
// SUPER_ADMIN, STUDENT and TRAINER can never be created through here, so a
// forged form value cannot escalate. Email must be pre-validated by the
// caller; duplicates (including a race) are rejected.
export async function createStaffAccount({ name, email, phone, password, role }) {
  const ctx = await getSuperAdminContext();
  if (!ctx) return { ok: false, reason: "forbidden" };
  if (!CREATABLE_STAFF_ROLES.includes(role)) return { ok: false, reason: "invalid_role" };

  if (await findUserByEmailInternal(email)) return { ok: false, reason: "duplicate_email" };

  const passwordHash = await hashPassword(password);
  try {
    const user = await createUser({ name, email, phone: phone || null, passwordHash, role });
    // Who created which privileged account, and with what role (never the password).
    await writeAudit(ctx.user.id, "staff.created", "user", user.id, { role });
    return { ok: true, user };
  } catch (error) {
    if (isUniqueViolation(error)) return { ok: false, reason: "duplicate_email" };
    throw error;
  }
}
