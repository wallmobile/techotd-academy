import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/currentUser";
import { rolesForArea, roleHomeRoute } from "@/lib/auth/roles";

// Reusable server-side authorization primitives. `proxy.js` gives coarse,
// fast protection at the edge, but per the Phase 7 spec authorization must
// also be enforced at the server/data-access boundary — these are that
// enforcement point, called directly from every protected page.

// Ensures a session exists; redirects to /login (preserving the attempted
// destination) if not. Returns the safe current-user object otherwise.
export async function requireAuth(redirectTo = "/login") {
  const user = await getCurrentUser();
  if (!user) {
    redirect(redirectTo);
  }
  return user;
}

export function hasRole(user, allowedRoles) {
  if (!user) return false;
  return allowedRoles.includes(user.role);
}

// Ensures the current user is authenticated AND holds one of the allowed
// roles. Unauthenticated -> redirect to login. Authenticated but wrong
// role -> redirected to their own role home rather than shown someone
// else's protected area.
export async function requireRole(allowedRoles, loginRedirectTo = "/login") {
  const user = await requireAuth(loginRedirectTo);
  if (!hasRole(user, allowedRoles)) {
    redirect(roleHomeRoute(user.role));
  }
  return user;
}

// Convenience wrapper for the three placeholder areas (student/trainer/
// admin), so pages don't need to know the exact role list for their area.
export async function requireArea(area) {
  return await requireRole(rolesForArea(area));
}
