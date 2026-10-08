// Client-safe CRM constants (Phase 10.2). Kept free of server imports so
// "use client" CRM forms can read them without pulling the database layer
// into the browser bundle.

export const LEAD_STATUSES = ["NEW", "CONTACTED", "QUALIFIED", "FOLLOW_UP", "CONVERTED", "LOST"];

export const LEAD_STATUS_LABELS = {
  NEW: "New",
  CONTACTED: "Contacted",
  QUALIFIED: "Qualified",
  FOLLOW_UP: "Follow-up",
  CONVERTED: "Converted",
  LOST: "Lost",
};

// Where the lead came from: which public form captured it. The finer
// "origin" (homepage, course-detail, …) is the page tag the form already
// carries (see KNOWN_SOURCES in src/lib/enquiry.js).
export const LEAD_SOURCES = ["BOOK_DEMO", "ENQUIRY"];

export const LEAD_SOURCE_LABELS = {
  BOOK_DEMO: "Book Demo",
  ENQUIRY: "Enquiry",
};

// Roles that may use the CRM, and roles a lead may be assigned to.
export const CRM_ROLES = ["SUPER_ADMIN", "ADMIN", "COUNSELLOR"];
export const LEAD_ASSIGNABLE_ROLES = ["SUPER_ADMIN", "ADMIN", "COUNSELLOR"];
// Roles that see every lead and can assign freely.
export const CRM_MANAGER_ROLES = ["SUPER_ADMIN", "ADMIN"];

export const NOTE_MAX_LENGTH = 2000;
export const LEADS_PAGE_SIZE = 20;
