// Super Admin identity + authorization. Same pattern as
// src/lib/admin/context.js: "who is asking" comes exclusively from
// getCurrentUser() (session cookie -> DB session -> user row), never from a
// form, URL or header. The console is stricter than the Admin area — only
// SUPER_ADMIN passes — and is re-checked in every page and every domain
// function, because layouts are not a security boundary for Server Actions.

import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/currentUser";
import { requireRole } from "@/lib/auth/guards";
import { SUPER_ADMIN_ROLES } from "@/lib/auth/roles";

// Non-throwing: null unless the caller is a signed-in, ACTIVE SUPER_ADMIN.
export async function getSuperAdminContext() {
  const user = await getCurrentUser();
  if (!user || !SUPER_ADMIN_ROLES.includes(user.role)) return null;
  return { user };
}

// Page guard: unauthenticated -> /login; any other role -> its own home.
export async function requireSuperAdminContext() {
  await requireRole(SUPER_ADMIN_ROLES);
  const ctx = await getSuperAdminContext();
  if (!ctx) redirect("/login");
  return ctx;
}
