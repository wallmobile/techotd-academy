// Admin identity + authorization (Phase 10.1). Same pattern as
// src/lib/trainer/context.js: "who is asking" comes exclusively from
// getCurrentUser() (session cookie -> DB session -> user row). No admin id,
// user id or role is ever read from a form, URL or header as proof of
// authorization.
//
// Two layers on purpose:
//  - the (admin) layout admits every staff role to the /admin shell
//    (requireArea("admin"), unchanged), so non-admin staff keep a landing
//    page instead of a redirect loop;
//  - the management modules (users/students/trainers/roles) and EVERY
//    mutation require ADMIN_MANAGEMENT_ROLES, checked here, per page and
//    per action — layouts are not a security boundary for Server Actions.

import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/currentUser";
import { requireRole } from "@/lib/auth/guards";
import { ADMIN_MANAGEMENT_ROLES } from "@/lib/auth/roles";

// Non-throwing: null unless the caller is a signed-in, ACTIVE ADMIN or
// SUPER_ADMIN. Use in Server Actions and domain functions.
export async function getAdminContext() {
  const user = await getCurrentUser();
  if (!user || !ADMIN_MANAGEMENT_ROLES.includes(user.role)) return null;
  return { user, isSuperAdmin: user.role === "SUPER_ADMIN" };
}

// Page guard: unauthenticated -> /login; student/trainer -> their own home;
// other staff roles -> /admin (the limited dashboard). Returns the context.
export async function requireAdminContext() {
  await requireRole(ADMIN_MANAGEMENT_ROLES);
  const ctx = await getAdminContext();
  if (!ctx) redirect("/admin");
  return ctx;
}
