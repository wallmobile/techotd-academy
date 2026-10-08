// CRM identity + authorization (Phase 10.2). Same rules as
// src/lib/admin/context.js: "who is asking" comes only from
// getCurrentUser(); nothing from a form or URL is trusted as proof of
// identity or role.
//
// CRM access policy:
//  - SUPER_ADMIN / ADMIN ("managers"): every lead, assign freely.
//  - COUNSELLOR: sees leads assigned to them plus the unassigned queue
//    (read-only until claimed); may update status, mark contacted and add
//    notes ONLY on leads assigned to them; may claim an unassigned lead for
//    themselves but can't assign to anyone else or touch another
//    counsellor's leads. Counsellors get no user/trainer/student admin.
//  - every other role: no CRM access.

import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/currentUser";
import { requireRole } from "@/lib/auth/guards";
import { CRM_ROLES, CRM_MANAGER_ROLES } from "@/constants/crm";

export async function getCrmContext() {
  const user = await getCurrentUser();
  if (!user || !CRM_ROLES.includes(user.role)) return null;
  const isManager = CRM_MANAGER_ROLES.includes(user.role);
  return {
    user,
    isManager,
    // null = unrestricted; otherwise the counsellor's own id for scoping queries.
    scopeUserId: isManager ? null : user.id,
  };
}

// Page guard: anonymous -> /login; student/trainer -> their home; staff
// roles outside the CRM -> /admin (their limited landing page).
export async function requireCrmContext() {
  await requireRole(CRM_ROLES);
  const ctx = await getCrmContext();
  if (!ctx) redirect("/admin");
  return ctx;
}

// Can this actor SEE the lead? (counsellors: assigned to them or unassigned)
export function canViewLead(ctx, lead) {
  return ctx.isManager || lead.assignedTo === null || lead.assignedTo === ctx.user.id;
}

// Can this actor CHANGE the lead (status, contacted, notes)?
export function canModifyLead(ctx, lead) {
  return ctx.isManager || lead.assignedTo === ctx.user.id;
}
