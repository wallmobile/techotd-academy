// Page tags the public enquiry forms may carry (?source=… and the homepage
// widget). Anything else is normalized to "direct". Lives in constants so
// both the pages and the server-side lead validation can import it without
// a circular dependency through src/lib/enquiry.js.
export const KNOWN_SOURCES = [
  "homepage",
  "course-detail",
  "training",
  "batches",
  "navbar",
  "trainers",
  "career",
  "resources",
  "about",
  "direct",
];
