// Finance identity + authorization (Phase 10.4). Same rules as
// src/lib/admin/context.js: the caller comes only from getCurrentUser();
// nothing from a form or URL is trusted as proof of role. Finance access =
// FINANCE_ROLES (SUPER_ADMIN, ADMIN, ACCOUNTANT). Every page calls
// requireFinanceContext(); every Server Action / domain function calls
// getFinanceContext() again.

import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/currentUser";
import { requireRole } from "@/lib/auth/guards";
import { FINANCE_ROLES } from "@/constants/fees";

export async function getFinanceContext() {
  const user = await getCurrentUser();
  if (!user || !FINANCE_ROLES.includes(user.role)) return null;
  return { user };
}

// Anonymous -> /login; student/trainer -> own home; other staff -> /admin.
export async function requireFinanceContext() {
  await requireRole(FINANCE_ROLES);
  const ctx = await getFinanceContext();
  if (!ctx) redirect("/admin");
  return ctx;
}
