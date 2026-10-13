// Placement identity + authorization (Phase 10.6). Same rules as the other
// admin contexts: the caller comes only from getCurrentUser(); nothing from a
// form or URL is trusted as proof of role. Access = PLACEMENT_ROLES
// (SUPER_ADMIN, ADMIN, PLACEMENT_MANAGER). Applicant data is never reachable
// by trainers, counsellors, accountants or content managers.

import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/currentUser";
import { requireRole } from "@/lib/auth/guards";
import { PLACEMENT_ROLES } from "@/constants/placement";

export async function getPlacementContext() {
  const user = await getCurrentUser();
  if (!user || !PLACEMENT_ROLES.includes(user.role)) return null;
  return { user };
}

export async function requirePlacementContext() {
  await requireRole(PLACEMENT_ROLES);
  const ctx = await getPlacementContext();
  if (!ctx) redirect("/admin");
  return ctx;
}
