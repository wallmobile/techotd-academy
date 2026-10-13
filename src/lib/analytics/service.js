// Analytics domain layer (Phase 10.8). Every function derives the caller from
// the session and returns only the report sections that role may see (see
// SECTION_ROLES). All figures are aggregated from the real tables; nothing
// is estimated, trended or invented. Money is in integer minor units, grouped
// per currency (amounts in different currencies are never summed together).
//
// Definitions (also shown on the page and in the README):
//  - Period metrics use UTC calendar days, both ends inclusive.
//  - "As of now" metrics ignore the period.
//  - An enrollment = one batch enrollment (student + batch). Course
//    enrollment rows are derived from them and are not counted again.
//  - Collected = counted payments (manual RECORDED or gateway VERIFIED, never
//    VOIDED) by the date received (paid_on), on active fee plans.
//    Manual and gateway amounts are reported separately.
//  - Outstanding = net fee − counted payments on active fee plans, where > 0.
//  - Verified conversion = a lead with a linked student account created via
//    the conversion flow. A lead merely *marked* Converted is reported apart.
//  - Selected ≠ placed: a verified placement needs explicit staff confirmation.

import { getCurrentUser } from "@/lib/auth/currentUser";
import { getCrmContext } from "@/lib/crm/context";
import { parseRange, listDays } from "@/lib/analytics/range";
import { toCsv } from "@/lib/analytics/csv";
import { minorToInput } from "@/lib/money";
import { sectionsForRole, ANALYTICS_ROLES, EXPORT_ROLES } from "@/constants/analytics";
import * as q from "@/lib/db/analytics";

function asMap(rows, key) {
  return Object.fromEntries(rows.map((r) => [r[key], r.c]));
}

export async function getAnalytics(input = {}) {
  const user = await getCurrentUser();
  if (!user || !ANALYTICS_ROLES.includes(user.role)) return null;

  const range = parseRange(input);
  const allowed = sectionsForRole(user.role);
  const today = new Date().toISOString().slice(0, 10);
  const report = { range, sections: allowed, generatedAt: new Date().toISOString(), role: user.role };

  if (allowed.includes("overview")) {
    report.overview = {
      registrations: q.studentRegistrations(range),
      totalStudents: q.totalStudents(),
    };
  }
  if (allowed.includes("crm")) {
    const ctx = await getCrmContext();
    const scopeUserId = ctx?.scopeUserId ?? null;
    const leads = q.leadsInRange(range, scopeUserId);
    report.crm = {
      scoped: Boolean(scopeUserId),
      total: leads.total,
      byStatus: asMap(leads.byStatus, "status"),
      bySource: asMap(leads.bySource, "source"),
      verifiedConversions: leads.verifiedConversions,
      markedWithoutStudent: leads.markedWithoutStudent,
    };
    report.dailyLeads = q.dailyLeads(range, scopeUserId);
  }
  if (allowed.includes("enrollment")) {
    report.enrollment = q.enrollmentStats(range);
    report.dailyEnrollments = q.dailyEnrollments(range);
  }
  if (allowed.includes("finance")) {
    report.finance = q.financeStats(range, today);
    report.dailyCollected = q.dailyCollected(range);
  }
  if (allowed.includes("certificates")) {
    report.certificates = q.certificateStats(range);
  }
  if (allowed.includes("placement")) {
    const p = q.placementStats(range, today);
    report.placement = {
      jobsPublished: p.jobsPublished,
      jobsOpen: p.jobsOpen,
      applications: p.applications,
      byStatus: asMap(p.byStatus, "status"),
      verifiedPlacements: p.verifiedPlacements,
    };
  }
  if (allowed.includes("overview")) report.dailyRegistrations = q.dailyRegistrations(range);
  return report;
}

// Zero-filled daily series for a chart: [{ day, value }].
export function toSeries(range, byDay) {
  return listDays(range.from, range.to).map((day) => ({ day, value: byDay?.[day] ?? 0 }));
}

// ---- CSV export ------------------------------------------------------------------
const amount = (minor) => minorToInput(Number(minor || 0));

function summaryRows(report) {
  const rows = [];
  const add = (section, metric, value, unit = "", note = "") => rows.push([section, metric, value, unit, note]);
  const r = report.range;
  add("Report", "Period start (UTC)", r.from);
  add("Report", "Period end (UTC)", r.to);
  add("Report", "Generated at (UTC)", report.generatedAt);

  if (report.overview) {
    add("Registrations", "Students registered in period", report.overview.registrations, "count");
    add("Registrations", "Total students (as of now)", report.overview.totalStudents, "count");
  }
  if (report.crm) {
    add("Leads", "Leads created in period", report.crm.total, "count");
    for (const [status, c] of Object.entries(report.crm.byStatus)) add("Leads", `Created in period, now ${status}`, c, "count");
    for (const [source, c] of Object.entries(report.crm.bySource)) add("Leads", `Source ${source}`, c, "count");
    add("Leads", "Verified conversions in period", report.crm.verifiedConversions, "count", "Lead linked to a student account");
    add("Leads", "Marked converted without a student link", report.crm.markedWithoutStudent, "count", "Not counted as conversions");
  }
  if (report.enrollment) {
    const e = report.enrollment;
    add("Enrollments", "New enrollments in period", e.created, "count", "Student + batch");
    add("Enrollments", "Distinct students newly enrolled in period", e.createdStudents, "count");
    add("Enrollments", "Active (as of now)", e.snapshot.ACTIVE, "count");
    add("Enrollments", "Completed (as of now)", e.snapshot.COMPLETED, "count");
    add("Enrollments", "Cancelled (as of now)", e.snapshot.CANCELLED, "count");
    add("Enrollments", "Students with an active/completed enrollment (as of now)", e.enrolledStudents, "count");
  }
  if (report.finance) {
    const f = report.finance;
    for (const x of f.feesAssigned) add("Finance", "Fees assigned in period (net)", amount(x.net), x.currency, `${x.plans} plans`);
    add("Finance", "Fee plans cancelled in period", f.feesCancelled, "count");
    for (const x of f.collected) add("Finance", `Collected in period — ${x.source === "GATEWAY" ? "gateway-verified" : "manual"}`, amount(x.amount), x.currency, `${x.payments} payments`);
    for (const x of f.voided) add("Finance", "Payments voided in period", amount(x.amount), x.currency, `${x.payments} payments (excluded from collected)`);
    for (const x of f.outstanding) {
      add("Finance", "Outstanding balance (as of now)", amount(x.balance), x.currency, `${x.plans} plans`);
      add("Finance", "Of which overdue (as of now)", amount(x.overdue_balance), x.currency, `${x.overdue_plans} plans`);
    }
  }
  if (report.certificates) {
    const c = report.certificates;
    add("Certificates", "Issued in period", c.issued, "count");
    add("Certificates", "Of which manual approvals", c.issuedManual, "count");
    add("Certificates", "Revoked in period", c.revoked, "count");
    add("Certificates", "Active (as of now)", c.snapshot.ACTIVE, "count");
    add("Certificates", "Revoked (as of now)", c.snapshot.REVOKED, "count");
  }
  if (report.placement) {
    const p = report.placement;
    add("Placement", "Jobs published in period", p.jobsPublished, "count");
    add("Placement", "Jobs open (as of now)", p.jobsOpen, "count");
    add("Placement", "Applications received in period", p.applications, "count");
    for (const [status, c] of Object.entries(p.byStatus)) add("Placement", `Received in period, now ${status}`, c, "count");
    add("Placement", "Verified placements confirmed in period", p.verifiedPlacements, "count", "Explicitly confirmed by staff; Selected is not a placement");
  }
  return rows.slice(0, 1000);
}

function dailyRows(report) {
  const days = listDays(report.range.from, report.range.to);
  const collectedByDay = {};
  const currencies = new Set();
  for (const r of report.dailyCollected || []) {
    currencies.add(r.currency);
    (collectedByDay[r.d] ||= {})[r.currency] = r.c;
  }
  const cur = [...currencies];
  const header = ["Date (UTC)"];
  if (report.dailyRegistrations) header.push("Students registered");
  if (report.dailyLeads) header.push("Leads created");
  if (report.dailyEnrollments) header.push("New enrollments");
  for (const c of cur) header.push(`Collected (${c})`);
  const rows = days.slice(0, 1000).map((d) => {
    const row = [d];
    if (report.dailyRegistrations) row.push(report.dailyRegistrations[d] ?? 0);
    if (report.dailyLeads) row.push(report.dailyLeads[d] ?? 0);
    if (report.dailyEnrollments) row.push(report.dailyEnrollments[d] ?? 0);
    for (const c of cur) row.push(amount(collectedByDay[d]?.[c] ?? 0));
    return row;
  });
  return { header, rows };
}

/**
 * Builds a CSV for ADMIN / SUPER_ADMIN only. `type`: "summary" | "daily".
 * Contains aggregates only — no names, emails, phone numbers or ids.
 * Returns { ok: true, csv, filename } or { ok: false, reason }.
 */
export async function buildExport({ type, input }) {
  const user = await getCurrentUser();
  if (!user || !EXPORT_ROLES.includes(user.role)) return { ok: false, reason: "forbidden" };
  if (!["summary", "daily"].includes(type)) return { ok: false, reason: "invalid_type" };

  const report = await getAnalytics(input);
  if (!report) return { ok: false, reason: "forbidden" };
  if (report.range.error) return { ok: false, reason: "invalid_range", message: report.range.error };

  const stamp = `${report.range.from}_to_${report.range.to}`;
  if (type === "summary") {
    return {
      ok: true,
      csv: toCsv(["Section", "Metric", "Value", "Unit", "Note"], summaryRows(report)),
      filename: `techotd-report-summary-${stamp}.csv`,
    };
  }
  const { header, rows } = dailyRows(report);
  return { ok: true, csv: toCsv(header, rows), filename: `techotd-report-daily-${stamp}.csv` };
}

