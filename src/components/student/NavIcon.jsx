// Small, dependency-free icon set for the student sidebar. Purely
// decorative (aria-hidden) — every nav item also renders a text label, so
// nothing here is relied on as the only way to identify an item.
const PATHS = {
  dashboard: "M3 4h6v6H3V4zm8 0h6v10h-6V4zM3 12h6v4H3v-4z",
  courses: "M3 5.5L10 3l7 2.5v7L10 15l-7-2.5v-7zM3 5.5L10 8l7-2.5M10 8v7",
  batches: "M3 6h14M3 10h14M3 14h9",
  schedule: "M4 4h12v13H4V4zm0 4h12M7 2v3M13 2v3",
  assignments: "M6 3h8v14H6V3zm2 4h4M8 8h4M8 11h2",
  attendance: "M4 10l4 4 8-9",
  projects: "M4 4h5l1.5 2H16v10H4V4z",
  students: "M10 10a3 3 0 100-6 3 3 0 000 6zM4 17c0-3.3 2.7-6 6-6s6 2.7 6 6M15 4a2.5 2.5 0 010 5",
  materials: "M4 4h9l3 3v9H4V4zm9 0v3h3",
  announcements: "M4 8l6-4v12l-6-4H2V8h2zm9-2a5 5 0 010 8",
  certificates: "M10 3l2.2 4.5L17 8l-3.5 3.2L14.4 16 10 13.5 5.6 16l.9-4.8L3 8l4.8-.5L10 3z",
  payments: "M3 6h14v9H3V6zm0 3h14M6 12h2",
  notifications: "M10 3a4 4 0 00-4 4v3l-1.5 3h11L14 10V7a4 4 0 00-4-4zM8.5 16a1.5 1.5 0 003 0",
  profile: "M10 10a3 3 0 100-6 3 3 0 000 6zM4 17c0-3.3 2.7-6 6-6s6 2.7 6 6",
  assistant: "M10 3l1.6 3.9L16 8.5l-4.4 1.6L10 14l-1.6-3.9L4 8.5l4.4-1.6L10 3zM15.5 13l.6 1.4 1.4.6-1.4.6-.6 1.4-.6-1.4-1.4-.6 1.4-.6.6-1.4z",
  // Admin area (Phase 10.1)
  users: "M7.5 9a2.5 2.5 0 100-5 2.5 2.5 0 000 5zM2.5 16c0-2.8 2.2-5 5-5s5 2.2 5 5M13 4.5a2.3 2.3 0 010 4.5M14 11.3c1.9.5 3.5 2.2 3.5 4.7",
  roles: "M10 2.5l6 2.2v4.6c0 3.6-2.5 6.4-6 7.7-3.5-1.3-6-4.1-6-7.7V4.7l6-2.2zM7.5 10l2 2 3.5-4",
  crm: "M3 4h14v9H8l-4 3v-3H3V4z",
  reports: "M4 16V9m4 7V4m4 12v-5m4 5V7",
  placement: "M3 7h14v9H3V7zm4 0V5a1 1 0 011-1h4a1 1 0 011 1v2",
  content: "M4 3h12v14H4V3zm3 4h6M7 10h6M7 13h3",
  settings: "M10 12.5a2.5 2.5 0 100-5 2.5 2.5 0 000 5zM10 2.5v2M10 15.5v2M2.5 10h2M15.5 10h2M4.7 4.7l1.4 1.4M13.9 13.9l1.4 1.4M4.7 15.3l1.4-1.4M13.9 6.1l1.4-1.4",
};

export function NavIcon({ name, className }) {
  const d = PATHS[name] || PATHS.dashboard;
  return (
    <svg
      viewBox="0 0 20 20"
      fill="none"
      aria-hidden="true"
      className={className}
      width="18"
      height="18"
    >
      <path d={d} stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
