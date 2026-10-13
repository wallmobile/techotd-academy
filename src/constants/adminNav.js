/**
 * Admin sidebar navigation (Phase 10.1). Only routes that really exist are
 * links. Everything planned for later phases (Courses, Batches,
 * Certificates, Reports, Placement, Content, Settings) is
 * `comingSoon: true` — rendered as a non-link "Soon" item by AdminNavList,
 * with no route behind it — same mechanism as trainerNav/studentNav.
 *
 * Each item may list the `roles` allowed to see it (default: every staff role).
 * The nav is presentation only — every route and action re-checks
 * authorization server-side (src/lib/admin/context.js, src/lib/crm/context.js).
 */
import { ADMIN_MANAGEMENT_ROLES } from "@/constants/roles";
import { CRM_ROLES } from "@/constants/crm";
import { FINANCE_ROLES } from "@/constants/fees";

const MANAGERS = ADMIN_MANAGEMENT_ROLES;
export const adminNavItems = [
  { key: "dashboard", label: "Dashboard", href: "/admin", icon: "dashboard", comingSoon: false, roles: null },
  { key: "leads", label: "Leads / CRM", href: "/admin/leads", icon: "crm", comingSoon: false, roles: CRM_ROLES },
  { key: "users", label: "Users", href: "/admin/users", icon: "users", comingSoon: false, roles: MANAGERS },
  { key: "students", label: "Students", href: "/admin/students", icon: "students", comingSoon: false, roles: MANAGERS },
  { key: "enrollments", label: "Enrollments", href: "/admin/enrollments", icon: "batches", comingSoon: false, roles: MANAGERS },
  { key: "trainers", label: "Trainers", href: "/admin/trainers", icon: "profile", comingSoon: false, roles: MANAGERS },
  { key: "roles", label: "Roles & Access", href: "/admin/roles", icon: "roles", comingSoon: false, roles: MANAGERS },
  { key: "courses", label: "Courses", href: "/admin/courses", icon: "courses", comingSoon: true, roles: MANAGERS },
  { key: "batches", label: "Batches", href: "/admin/batches", icon: "batches", comingSoon: true, roles: MANAGERS },
  { key: "fees", label: "Fees", href: "/admin/fees", icon: "payments", comingSoon: false, roles: FINANCE_ROLES },
  { key: "certificates", label: "Certificates", href: "/admin/certificates", icon: "certificates", comingSoon: true, roles: MANAGERS },
  { key: "reports", label: "Reports", href: "/admin/reports", icon: "reports", comingSoon: true, roles: MANAGERS },
  { key: "placement", label: "Placement", href: "/admin/placement", icon: "placement", comingSoon: true, roles: MANAGERS },
  { key: "content", label: "Content", href: "/admin/content", icon: "content", comingSoon: true, roles: MANAGERS },
  { key: "settings", label: "Settings", href: "/admin/settings", icon: "settings", comingSoon: true, roles: MANAGERS },
];
