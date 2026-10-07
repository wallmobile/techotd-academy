/**
 * Centralized navigation configuration for the public website.
 *
 * BUILT_ROUTES lists the route roots that actually exist. To avoid
 * shipping broken links, the Header/Footer/CTAs render any href not
 * covered by BUILT_ROUTES as an inert, visually-identical label
 * instead of a navigable <Link>. A route root also covers its dynamic
 * children (e.g. "/courses" covers "/courses/[course-slug]").
 */

export const BUILT_ROUTES = new Set([
  "/",
  "/courses",
  "/training/online",
  "/training/offline",
  "/training/classroom",
  "/training/corporate",
  "/batches",
  "/trainers",
  "/careers",
  "/blog",
  "/about",
  "/book-demo",
  "/enquiry",
  "/login",
  "/register",
  "/forgot-password",
  "/reset-password",
]);

// /student, /trainer and /admin are intentionally NOT in BUILT_ROUTES.
// They exist and are protected (see src/proxy.js + src/lib/auth/guards.js),
// but Phase 7 must not surface them anywhere in public navigation or CTAs
// — a signed-in user reaches them only by direct login redirect, never by
// clicking a public link.

export function isBuiltRoute(href) {
  // Match on the path only — CTAs may carry query params (e.g.
  // "/book-demo?course=react-development&source=homepage") and those
  // shouldn't affect whether the route is considered built.
  const path = href.split("?")[0];
  if (BUILT_ROUTES.has(path)) return true;
  for (const route of BUILT_ROUTES) {
    if (route !== "/" && path.startsWith(`${route}/`)) return true;
  }
  return false;
}

export const primaryNav = [
  { label: "Home", href: "/" },
  { label: "Courses", href: "/courses" },
  { label: "Training", href: "/training/online" },
  { label: "Batches", href: "/batches" },
  { label: "Trainers", href: "/trainers" },
  { label: "Career", href: "/careers" },
  { label: "Resources", href: "/blog" },
  { label: "About", href: "/about" },
];

export const headerCta = { label: "Book Free Counselling", href: "/book-demo?source=navbar" };

export const authNav = {
  login: { label: "Log In", href: "/login" },
  register: { label: "Create Account", href: "/register" },
};

export const footerColumns = [
  {
    heading: "Explore",
    links: [
      { label: "Courses", href: "/courses" },
      { label: "Training", href: "/training/online" },
      { label: "Batches", href: "/batches" },
      { label: "Live Classes", href: "/training/online" },
      { label: "Trainers", href: "/trainers" },
    ],
  },
  {
    heading: "Career",
    links: [
      { label: "Career Support", href: "/careers" },
      { label: "Placements", href: "/placements" },
      { label: "Jobs", href: "/careers" },
      { label: "Projects", href: "/courses" },
      { label: "Certificates", href: "/courses" },
    ],
  },
  {
    heading: "Resources",
    links: [
      { label: "Blog", href: "/blog" },
      { label: "FAQs", href: "/faq" },
      { label: "Events", href: "/events" },
      { label: "Contact", href: "/contact" },
    ],
  },
];

export const legalLinks = [
  { label: "Privacy Policy", href: "/privacy-policy" },
  { label: "Terms & Conditions", href: "/terms-conditions" },
];
