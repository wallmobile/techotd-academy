import { db } from "@/lib/db/client";

// Aggregation queries for the analytics module (Phase 10.8). Everything is a
// parameterized COUNT/SUM/GROUP BY — no table is loaded into JavaScript to be
// counted there. Ranges are [fromTs, toTs) string bounds against UTC
// timestamps (see src/lib/analytics/range.js); `paid_on` is a plain date so
// it uses the inclusive [from, to] days. Authorization is NOT decided here
// (src/lib/analytics/service.js); `scopeUserId` only narrows lead queries
// for counsellors.

const one = async (sql, params) => await db.get(sql, params);
const all = async (sql, params) => await db.all(sql, params);

function leadScope(scopeUserId) {
  return scopeUserId ? "AND (assigned_to = @scope OR assigned_to IS NULL)" : "";
}

// ---- registrations ----------------------------------------------------------
export async function studentRegistrations({ fromTs, toTs }) {
  return (await one("SELECT COUNT(*) AS c FROM users WHERE role = 'STUDENT' AND created_at >= @fromTs AND created_at < @toTs", { fromTs, toTs })).c;
}

export async function totalStudents() {
  return (await one("SELECT COUNT(*) AS c FROM users WHERE role = 'STUDENT'", {})).c;
}

// ---- CRM -------------------------------------------------------------------------
export async function leadsInRange({ fromTs, toTs }, scopeUserId) {
  const p = { fromTs, toTs, ...(scopeUserId ? { scope: scopeUserId } : {}) };
  const scope = leadScope(scopeUserId);
  const total = (await one(`SELECT COUNT(*) AS c FROM leads WHERE created_at >= @fromTs AND created_at < @toTs ${scope}`, p)).c;
  const byStatus = await all(`SELECT status, COUNT(*) AS c FROM leads WHERE created_at >= @fromTs AND created_at < @toTs ${scope} GROUP BY status`, p);
  const bySource = await all(`SELECT source, COUNT(*) AS c FROM leads WHERE created_at >= @fromTs AND created_at < @toTs ${scope} GROUP BY source`, p);
  // Leads converted through the real conversion flow (a student account is
  // linked) in the period.
  const verifiedConversions = (
    await one(`SELECT COUNT(*) AS c FROM leads WHERE converted_user_id IS NOT NULL AND converted_at >= @fromTs AND converted_at < @toTs ${scope}`, p)
  ).c;
  // Leads created in the period that are marked CONVERTED but have no linked
  // student (status set by hand) — reported separately, never as conversions.
  const markedWithoutStudent = (
    await one(
      `SELECT COUNT(*) AS c FROM leads WHERE status = 'CONVERTED' AND converted_user_id IS NULL
         AND created_at >= @fromTs AND created_at < @toTs ${scope}`,
      p
    )
  ).c;
  return { total, byStatus, bySource, verifiedConversions, markedWithoutStudent };
}

// ---- enrollment ----------------------------------------------------------------
// The unit is a batch enrollment (one student in one batch). course_enrollments
// are derived from these rows and are deliberately NOT counted again.
export async function enrollmentStats({ fromTs, toTs }) {
  const created = (await one("SELECT COUNT(*) AS c FROM batch_enrollments WHERE created_at >= @fromTs AND created_at < @toTs", { fromTs, toTs })).c;
  const createdStudents = (
    await one("SELECT COUNT(DISTINCT student_id) AS c FROM batch_enrollments WHERE created_at >= @fromTs AND created_at < @toTs", { fromTs, toTs })
  ).c;
  const snapshot = { ACTIVE: 0, COMPLETED: 0, CANCELLED: 0 };
  for (const r of await all("SELECT status, COUNT(*) AS c FROM batch_enrollments GROUP BY status", {})) snapshot[r.status] = r.c;
  const enrolledStudents = (await one("SELECT COUNT(DISTINCT student_id) AS c FROM batch_enrollments WHERE status IN ('ACTIVE','COMPLETED')", {})).c;
  return { created, createdStudents, snapshot, enrolledStudents };
}

// ---- finance --------------------------------------------------------------------
export async function financeStats({ fromTs, toTs, from, to }, today) {
  const p = { fromTs, toTs, from, to, today };
  const feesAssigned = await all(
    `SELECT currency, COUNT(*) AS plans, COALESCE(SUM(total_minor - discount_minor), 0) AS net
       FROM fee_plans WHERE status = 'ACTIVE' AND created_at >= @fromTs AND created_at < @toTs GROUP BY currency`,
    p
  );
  const feesCancelled = (
    await one("SELECT COUNT(*) AS c FROM fee_plans WHERE status = 'CANCELLED' AND created_at >= @fromTs AND created_at < @toTs", p)
  ).c;
  // Money actually recorded as received in the period (by the date received).
  const collected = await all(
    `SELECT p.currency, p.source, COUNT(*) AS payments, SUM(p.amount_minor) AS amount
       FROM payments p JOIN fee_plans f ON f.id = p.fee_plan_id
       WHERE p.status IN ('RECORDED','VERIFIED') AND f.status = 'ACTIVE' AND p.paid_on >= @from AND p.paid_on <= @to
       GROUP BY p.currency, p.source`,
    p
  );
  const voided = await all(
    `SELECT currency, COUNT(*) AS payments, SUM(amount_minor) AS amount FROM payments
       WHERE status = 'VOIDED' AND voided_at >= @fromTs AND voided_at < @toTs GROUP BY currency`,
    p
  );
  // Point-in-time (as of now), not period-bound.
  const outstanding = await all(
    `SELECT currency,
            COUNT(*) AS plans,
            COALESCE(SUM(balance), 0) AS balance,
            COALESCE(SUM(CASE WHEN due_date IS NOT NULL AND due_date < @today THEN balance END), 0) AS overdue_balance,
            COALESCE(SUM(CASE WHEN due_date IS NOT NULL AND due_date < @today THEN 1 END), 0) AS overdue_plans
       FROM (
         SELECT f.currency, f.due_date,
                (f.total_minor - f.discount_minor
                  - COALESCE((SELECT SUM(p.amount_minor) FROM payments p
                              WHERE p.fee_plan_id = f.id AND p.status IN ('RECORDED','VERIFIED')), 0)) AS balance
         FROM fee_plans f WHERE f.status = 'ACTIVE'
       ) AS balances WHERE balance > 0 GROUP BY currency`,
    p
  );
  return { feesAssigned, feesCancelled, collected, voided, outstanding };
}

// ---- certificates -----------------------------------------------------------------
export async function certificateStats({ fromTs, toTs }) {
  const p = { fromTs, toTs };
  const issued = (await one("SELECT COUNT(*) AS c FROM certificates WHERE issued_at >= @fromTs AND issued_at < @toTs", p)).c;
  const issuedManual = (
    await one("SELECT COUNT(*) AS c FROM certificates WHERE issued_at >= @fromTs AND issued_at < @toTs AND issuance_basis = 'MANUAL_APPROVAL'", p)
  ).c;
  const revoked = (await one("SELECT COUNT(*) AS c FROM certificates WHERE revoked_at >= @fromTs AND revoked_at < @toTs", p)).c;
  const snapshot = { ACTIVE: 0, REVOKED: 0 };
  for (const r of await all("SELECT status, COUNT(*) AS c FROM certificates GROUP BY status", {})) snapshot[r.status] = r.c;
  return { issued, issuedManual, revoked, snapshot };
}

// ---- placement ----------------------------------------------------------------------
export async function placementStats({ fromTs, toTs }, today) {
  const p = { fromTs, toTs, today };
  const jobsPublished = (await one("SELECT COUNT(*) AS c FROM jobs WHERE published_at >= @fromTs AND published_at < @toTs", p)).c;
  const jobsOpen = (
    await one("SELECT COUNT(*) AS c FROM jobs WHERE status = 'PUBLISHED' AND (apply_deadline IS NULL OR apply_deadline >= @today)", p)
  ).c;
  const applications = (await one("SELECT COUNT(*) AS c FROM job_applications WHERE applied_at >= @fromTs AND applied_at < @toTs", p)).c;
  const byStatus = await all("SELECT status, COUNT(*) AS c FROM job_applications WHERE applied_at >= @fromTs AND applied_at < @toTs GROUP BY status", p);
  const verifiedPlacements = (
    await one("SELECT COUNT(*) AS c FROM job_applications WHERE placement_confirmed_at >= @fromTs AND placement_confirmed_at < @toTs", p)
  ).c;
  return { jobsPublished, jobsOpen, applications, byStatus, verifiedPlacements };
}

// ---- daily series -----------------------------------------------------------------------
async function daily(sql, params) {
  return Object.fromEntries((await all(sql, params)).map((r) => [r.d, r.c]));
}

export async function dailyLeads({ fromTs, toTs }, scopeUserId) {
  return await daily(
    `SELECT substr(created_at, 1, 10) AS d, COUNT(*) AS c FROM leads
       WHERE created_at >= @fromTs AND created_at < @toTs ${leadScope(scopeUserId)} GROUP BY d`,
    { fromTs, toTs, ...(scopeUserId ? { scope: scopeUserId } : {}) }
  );
}

export async function dailyEnrollments({ fromTs, toTs }) {
  return await daily(
    "SELECT substr(created_at, 1, 10) AS d, COUNT(*) AS c FROM batch_enrollments WHERE created_at >= @fromTs AND created_at < @toTs GROUP BY d",
    { fromTs, toTs }
  );
}

export async function dailyRegistrations({ fromTs, toTs }) {
  return await daily(
    "SELECT substr(created_at, 1, 10) AS d, COUNT(*) AS c FROM users WHERE role = 'STUDENT' AND created_at >= @fromTs AND created_at < @toTs GROUP BY d",
    { fromTs, toTs }
  );
}

// Minor units per day (single sum across currencies is NOT meaningful, so
// the series is per currency).
export async function dailyCollected({ from, to }) {
  return await all(
    `SELECT p.paid_on AS d, p.currency, SUM(p.amount_minor) AS c
       FROM payments p JOIN fee_plans f ON f.id = p.fee_plan_id
       WHERE p.status IN ('RECORDED','VERIFIED') AND f.status = 'ACTIVE' AND p.paid_on >= @from AND p.paid_on <= @to
       GROUP BY p.paid_on, p.currency`,
    { from, to }
  );
}
