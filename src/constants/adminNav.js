/**
 * Admin sidebar navigation (Phase 10.1). Only routes that really exist are
 * links. Everything planned for later phases (Courses, Batches,
 * Content, Settings) is
 * `comingSoon: true` — rendered as a non-link "Soon" item by AdminNavList,
 * with no route behind it — same mechanism as trainerNav/studentNav.
 *
 * Each item may list the `roles` allowed to see it (default: every staff role).
 * The nav is presentation only — every route and action re-checks
 * authorization server-side (src/lib/admin/context.js, src/lib/crm/context.js).
 */
import { ADMIN_MANAGEMENT_ROLES, SUPER_ADMIN_ROLES } from "@/constants/roles";
import { CRM_ROLES } from "@/constants/crm";
import { FINANCE_ROLES } from "@/constants/fees";
import { PLACEMENT_ROLES } from "@/constants/placement";
import { ANALYTICS_ROLES } from "@/constants/analytics";

const MANAGERS = ADMIN_MANAGEMENT_ROLES;
export const adminNavItems = [
  { key: "dashboard", label: "Dashboard", href: "/admin", icon: "dashboard", comingSoon: false, roles: null },
  { key: "console", label: "Super Admin Console", href: "/super-admin", icon: "settings", comingSoon: false, roles: SUPER_ADMIN_ROLES },
  { key: "leads", label: "Leads / CRM", href: "/admin/leads", icon: "crm", comingSoon: false, roles: CRM_ROLES },
  { key: "users", label: "Users", href: "/admin/users", icon: "users", comingSoon: false, roles: MANAGERS },
  { key: "students", label: "Students", href: "/admin/students", icon: "students", comingSoon: false, roles: MANAGERS },
  { key: "enrollments", label: "Enrollments", href: "/admin/enrollments", icon: "batches", comingSoon: false, roles: MANAGERS },
  { key: "trainers", label: "Trainers", href: "/admin/trainers", icon: "profile", comingSoon: false, roles: MANAGERS },
  { key: "roles", label: "Roles & Access", href: "/admin/roles", icon: "roles", comingSoon: false, roles: MANAGERS },
  { key: "courses", label: "Courses", href: "/admin/courses", icon: "courses", comingSoon: false, roles: MANAGERS },
  { key: "batches", label: "Batches", href: "/admin/batches", icon: "batches", comingSoon: false, roles: MANAGERS },
  { key: "fees", label: "Fees", href: "/admin/fees", icon: "payments", comingSoon: false, roles: FINANCE_ROLES },
  { key: "certificates", label: "Certificates", href: "/admin/certificates", icon: "certificates", comingSoon: false, roles: MANAGERS },
  { key: "analytics", label: "Analytics", href: "/admin/analytics", icon: "reports", comingSoon: false, roles: ANALYTICS_ROLES },
  { key: "jobs", label: "Jobs & Placement", href: "/admin/jobs", icon: "placement", comingSoon: false, roles: PLACEMENT_ROLES },
  { key: "content", label: "Content", href: "/admin/content", icon: "content", comingSoon: true, roles: MANAGERS },
  { key: "settings", label: "Settings", href: "/admin/settings", icon: "settings", comingSoon: true, roles: MANAGERS },
];

// Super Admin console nav (/super-admin). SUPER_ADMIN only — enforced by the
// (super-admin) layout and every domain function, not by this list.
export const superAdminNavItems = [
  { key: "overview", label: "Overview", href: "/super-admin", icon: "dashboard", exact: true, comingSoon: false, roles: SUPER_ADMIN_ROLES },
  { key: "staff", label: "Staff Accounts", href: "/super-admin/staff", icon: "users", comingSoon: false, roles: SUPER_ADMIN_ROLES },
  { key: "admin", label: "Admin Panel", href: "/admin", icon: "reports", exact: true, comingSoon: false, roles: SUPER_ADMIN_ROLES },
];
