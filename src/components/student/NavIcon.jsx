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
