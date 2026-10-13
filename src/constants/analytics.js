// Client-safe analytics constants (Phase 10.8).
import { ADMIN_MANAGEMENT_ROLES } from "@/constants/roles";
import { CRM_ROLES } from "@/constants/crm";
import { FINANCE_ROLES } from "@/constants/fees";
import { PLACEMENT_ROLES } from "@/constants/placement";

export const PRESETS = ["today", "last7", "last30", "month", "custom"];
export const PRESET_LABELS = {
  today: "Today",
  last7: "Last 7 days",
  last30: "Last 30 days",
  month: "This month",
  custom: "Custom range",
};
export const DEFAULT_PRESET = "last30";

// Longest range a request may ask for (keeps queries and charts bounded).
export const MAX_RANGE_DAYS = 366;

// Which report sections each role may see. Enforced server-side in
// src/lib/analytics/service.js — the page and the export both use it.
export const SECTION_ROLES = {
  overview: ADMIN_MANAGEMENT_ROLES,
  crm: CRM_ROLES, // COUNSELLOR sees only their own scope (assigned + unassigned)
  enrollment: ADMIN_MANAGEMENT_ROLES,
  finance: FINANCE_ROLES,
  certificates: ADMIN_MANAGEMENT_ROLES,
  placement: PLACEMENT_ROLES,
};

export const SECTION_LABELS = {
  overview: "Registrations",
  crm: "Leads & enquiries",
  enrollment: "Enrollments",
  finance: "Fees & payments",
  certificates: "Certificates",
  placement: "Jobs & placements",
};

export function sectionsForRole(role) {
  return Object.keys(SECTION_ROLES).filter((s) => SECTION_ROLES[s].includes(role));
}

// Roles that may open the analytics page at all.
export const ANALYTICS_ROLES = [...new Set(Object.values(SECTION_ROLES).flat())];

// CSV export is restricted to ADMIN / SUPER_ADMIN.
export const EXPORT_ROLES = ADMIN_MANAGEMENT_ROLES;
export const EXPORT_MAX_ROWS = 1000;
