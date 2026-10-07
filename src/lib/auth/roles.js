// Centralized role/authorization definitions. Every other module imports
// role values from here — none should hand-type a role string.

export { ROLES, USER_STATUSES } from "@/lib/db/users";

export const STAFF_ROLES = [
  "ADMIN",
  "SUPER_ADMIN",
  "COUNSELLOR",
  "ACCOUNTANT",
  "CONTENT_MANAGER",
  "PLACEMENT_MANAGER",
];

// Where a freshly logged-in user lands, by role. Staff-type roles share the
// /admin shell for now (Phase 7 scope) but keep their distinct `role`
// value in the database — this map is presentation routing only, not a
// permissions merge.
export const ROLE_HOME_ROUTES = {
  STUDENT: "/student",
  TRAINER: "/trainer",
  ADMIN: "/admin",
  SUPER_ADMIN: "/admin",
  COUNSELLOR: "/admin",
  ACCOUNTANT: "/admin",
  CONTENT_MANAGER: "/admin",
  PLACEMENT_MANAGER: "/admin",
};

export function roleHomeRoute(role) {
  return ROLE_HOME_ROUTES[role] || "/";
}

// Minimal, extensible permission foundation (spec section 23). Each
// protected area maps to the set of roles allowed into it. Future phases
// can extend this map with finer-grained feature permissions without
// touching the guard functions that read it.
export const AREA_ROLES = {
  student: ["STUDENT"],
  trainer: ["TRAINER"],
  admin: STAFF_ROLES,
};

export function rolesForArea(area) {
  return AREA_ROLES[area] || [];
}
