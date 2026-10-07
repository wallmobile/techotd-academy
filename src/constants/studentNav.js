/**
 * Student LMS sidebar navigation — final list for the Student LMS (Phase
 * 8.8). This is now the complete, spec-final set of items; every one
 * except "Projects" is a real route. "Projects" stays a "Coming soon"
 * control (same pattern as BUILT_ROUTES/isBuiltRoute on the public site)
 * because there is still no standalone /student/projects route — capstone
 * projects are shown read-only inside /student/assignments instead (see
 * Phase 8.6). Logout is rendered separately (StudentSidebar /
 * StudentMobileDrawer), not part of this list.
 */
export const studentNavItems = [
  { key: "dashboard", label: "Dashboard", href: "/student", icon: "dashboard", comingSoon: false },
  { key: "my-courses", label: "My Courses", href: "/student/courses", icon: "courses", comingSoon: false },
  { key: "my-batches", label: "My Batches", href: "/student/batches", icon: "batches", comingSoon: false },
  { key: "schedule", label: "Schedule", href: "/student/schedule", icon: "schedule", comingSoon: false },
  { key: "assignments", label: "Assignments", href: "/student/assignments", icon: "assignments", comingSoon: false },
  { key: "attendance", label: "Attendance", href: "/student/attendance", icon: "attendance", comingSoon: false },
  { key: "projects", label: "Projects", href: "/student/projects", icon: "projects", comingSoon: true },
  { key: "certificates", label: "Certificates", href: "/student/certificates", icon: "certificates", comingSoon: false },
  { key: "notifications", label: "Notifications", href: "/student/notifications", icon: "notifications", comingSoon: false },
  { key: "profile", label: "Profile", href: "/student/profile", icon: "profile", comingSoon: false },
];
