// Client-safe role display/policy constants. Lives outside src/lib/auth so a
// "use client" component can import it without pulling the database layer
// (and the database driver, via src/lib/db/users.js) into the browser bundle.
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

// Super Admin console (/super-admin): platform-level controls that an ADMIN
// must not have — creating and managing other staff accounts.
export const SUPER_ADMIN_ROLES = ["SUPER_ADMIN"];

// Roles a Super Admin may create from the console. SUPER_ADMIN is
// deliberately absent: a new Super Admin is bootstrapped out-of-band
// (npm run setup:admin), never minted from a web form.
export const CREATABLE_STAFF_ROLES = ["ADMIN", "COUNSELLOR", "ACCOUNTANT", "CONTENT_MANAGER", "PLACEMENT_MANAGER"];
