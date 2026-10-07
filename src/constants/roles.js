// Client-safe role display/policy constants. Lives outside src/lib/auth so a
// "use client" component can import it without pulling the database layer
// (better-sqlite3, via src/lib/db/users.js) into the browser bundle.
// src/lib/auth/roles.js re-exports these for server code.

export const ROLE_LABELS = {
  SUPER_ADMIN: "Super Admin",
  ADMIN: "Admin",
  COUNSELLOR: "Counsellor",
  TRAINER: "Trainer",
  ACCOUNTANT: "Accountant",
  CONTENT_MANAGER: "Content Manager",
  PLACEMENT_MANAGER: "Placement Manager",
  STUDENT: "Student",
};

// Phase 10.1: who may USE the admin management modules (users, students,
// trainers, roles). Every staff role may enter the /admin shell (they land
// there via ROLE_HOME_ROUTES), but only these two get management access —
// a COUNSELLOR/ACCOUNTANT/etc. sees a limited dashboard until their own
// modules exist. Granular permissions can replace this list later without
// touching call sites (they all go through src/lib/admin/context.js).
export const ADMIN_MANAGEMENT_ROLES = ["SUPER_ADMIN", "ADMIN"];
