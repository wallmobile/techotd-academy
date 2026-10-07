// Admin user management (Phase 10.1). Every function re-derives the
// caller from the session via getAdminContext() and returns an "empty"
// result (null / empty page / { ok: false }) for anyone who isn't an
// ADMIN or SUPER_ADMIN — callers never need to remember to check.

import { getAdminContext } from "@/lib/admin/context";
import { PAGE_SIZE, paginate } from "@/lib/admin/listParams";
import {
  listUsersPage,
  getUserRow,
  getStudentProfileRowByUserId,
  listTrainerBatchRows,
  countActiveUsersWithRole,
  updateUserStatusRow,
} from "@/lib/db/adminQueries";
import { deleteAllSessionsForUser } from "@/lib/db/sessions";
import { USER_STATUSES } from "@/lib/auth/roles";

const EMPTY_PAGE = { rows: [], page: 1, totalPages: 1, pageSize: PAGE_SIZE, total: 0 };

export async function getUsersPage({ q, role, sort, page }) {
  if (!(await getAdminContext())) return EMPTY_PAGE;
  const probe = paginate(listUsersPage({ q, role, sort, limit: 1, offset: 0 }).total, page);
  const { rows, total } = listUsersPage({
    q,
    role,
    sort,
    limit: PAGE_SIZE,
    offset: (probe.page - 1) * PAGE_SIZE,
  });
  return { rows, ...paginate(total, probe.page) };
}

// Safe detail for /admin/users/[user-id]: only fields rowToUser/getUserRow
// select — never password_hash, session token hashes or reset tokens.
export async function getUserDetail(userId) {
  const ctx = await getAdminContext();
  if (!ctx) return null;
  const user = getUserRow(userId);
  if (!user) return null;

  return {
    user,
    canChangeStatus: canChangeStatus(ctx, user).ok,
    studentProfileId: user.role === "STUDENT" ? getStudentProfileRowByUserId(user.id)?.id ?? null : null,
    assignedBatchCount: user.role === "TRAINER" ? listTrainerBatchRows(user.id).length : null,
  };
}

// Who may change whose account status:
//  - never your own account (no self-lockout);
//  - ADMIN/SUPER_ADMIN accounts only by a SUPER_ADMIN (an ADMIN can't
//    disable a peer or a superior);
//  - the last ACTIVE SUPER_ADMIN can never be deactivated.
function canChangeStatus(ctx, target, nextStatus) {
  if (target.id === ctx.user.id) return { ok: false, reason: "You can't change your own account status." };
  if (["ADMIN", "SUPER_ADMIN"].includes(target.role) && !ctx.isSuperAdmin) {
    return { ok: false, reason: "Only a Super Admin can change an admin account." };
  }
  if (
    nextStatus &&
    nextStatus !== "ACTIVE" &&
    target.role === "SUPER_ADMIN" &&
    target.status === "ACTIVE" &&
    countActiveUsersWithRole("SUPER_ADMIN") <= 1
  ) {
    return { ok: false, reason: "The last active Super Admin can't be deactivated." };
  }
  return { ok: true };
}

// Mutation. `status` must be one of USER_STATUSES; identity comes from the
// session. Deactivating also revokes the account's sessions (they'd already
// be rejected by getCurrentUser(), this just removes the dead rows).
export async function setUserStatus(targetUserId, status) {
  const ctx = await getAdminContext();
  if (!ctx) return { ok: false, reason: "You don't have permission to do that." };
  if (!USER_STATUSES.includes(status)) return { ok: false, reason: "Invalid status." };

  const target = getUserRow(targetUserId);
  if (!target) return { ok: false, reason: "User not found." };

  const decision = canChangeStatus(ctx, target, status);
  if (!decision.ok) return decision;

  updateUserStatusRow(target.id, status);
  if (status !== "ACTIVE") deleteAllSessionsForUser(target.id);
  return { ok: true, userId: target.id, status };
}
