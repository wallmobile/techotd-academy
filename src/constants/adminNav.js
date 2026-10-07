/**
 * Admin sidebar navigation (Phase 10.1). Only routes that really exist are
 * links. Everything planned for later phases (CRM, Courses, Batches,
 * Payments, Certificates, Reports, Placement, Content, Settings) is
 * `comingSoon: true` — rendered as a non-link "Soon" item by AdminNavList,
 * with no route behind it — same mechanism as trainerNav/studentNav.
 *
 * `managerOnly` items are shown (and routable) only to ADMIN/SUPER_ADMIN;
 * other staff roles see just the Dashboard until their own modules exist.
 * The nav is presentation only — every route and action re-checks
 * authorization server-side (src/lib/admin/context.js).
 */
export const adminNavItems = [
  { key: "dashboard", label: "Dashboard", href: "/admin", icon: "dashboard", comingSoon: false, managerOnly: false },
  { key: "users", label: "Users", href: "/admin/users", icon: "users", comingSoon: false, managerOnly: true },
  { key: "students", label: "Students", href: "/admin/students", icon: "students", comingSoon: false, managerOnly: true },
  { key: "trainers", label: "Trainers", href: "/admin/trainers", icon: "profile", comingSoon: false, managerOnly: true },
  { key: "roles", label: "Roles & Access", href: "/admin/roles", icon: "roles", comingSoon: false, managerOnly: true },
  { key: "crm", label: "CRM", href: "/admin/crm", icon: "crm", comingSoon: true, managerOnly: true },
  { key: "courses", label: "Courses", href: "/admin/courses", icon: "courses", comingSoon: true, managerOnly: true },
  { key: "batches", label: "Batches", href: "/admin/batches", icon: "batches", comingSoon: true, managerOnly: true },
  { key: "payments", label: "Payments", href: "/admin/payments", icon: "payments", comingSoon: true, managerOnly: true },
  { key: "certificates", label: "Certificates", href: "/admin/certificates", icon: "certificates", comingSoon: true, managerOnly: true },
  { key: "reports", label: "Reports", href: "/admin/reports", icon: "reports", comingSoon: true, managerOnly: true },
  { key: "placement", label: "Placement", href: "/admin/placement", icon: "placement", comingSoon: true, managerOnly: true },
  { key: "content", label: "Content", href: "/admin/content", icon: "content", comingSoon: true, managerOnly: true },
  { key: "settings", label: "Settings", href: "/admin/settings", icon: "settings", comingSoon: true, managerOnly: true },
];
