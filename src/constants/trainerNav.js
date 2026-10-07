/**
 * Trainer sidebar navigation. Phase 9.1 (Trainer Foundation) shipped
 * Dashboard/Courses/Batches/Students; Phase 9.2 (Teaching Management)
 * adds Schedule, Attendance and Assignments as real, built routes.
 *
 * Phase 9.3 (Trainer Materials, Trainer Announcements, Trainer Profile,
 * advanced performance analytics) was intentionally DEFERRED, not
 * forgotten and not partly built. Its three nav entries below stay marked
 * `comingSoon: true` (rendered as a non-link "Soon" item by
 * TrainerNavList — same mechanism as src/constants/studentNav.js), and
 * there are deliberately NO /trainer/materials, /trainer/announcements or
 * /trainer/profile routes. Remove `comingSoon` only together with the real
 * page when that phase is built.
 */
export const trainerNavItems = [
  { key: "dashboard", label: "Dashboard", href: "/trainer", icon: "dashboard", comingSoon: false },
  { key: "courses", label: "Courses", href: "/trainer/courses", icon: "courses", comingSoon: false },
  { key: "batches", label: "Batches", href: "/trainer/batches", icon: "batches", comingSoon: false },
  { key: "students", label: "Students", href: "/trainer/students", icon: "students", comingSoon: false },
  { key: "schedule", label: "Schedule", href: "/trainer/schedule", icon: "schedule", comingSoon: false },
  { key: "attendance", label: "Attendance", href: "/trainer/attendance", icon: "attendance", comingSoon: false },
  { key: "assignments", label: "Assignments", href: "/trainer/assignments", icon: "assignments", comingSoon: false },
  { key: "materials", label: "Materials", href: "/trainer/materials", icon: "materials", comingSoon: true },
  { key: "announcements", label: "Announcements", href: "/trainer/announcements", icon: "announcements", comingSoon: true },
  { key: "profile", label: "Profile", href: "/trainer/profile", icon: "profile", comingSoon: true },
];
