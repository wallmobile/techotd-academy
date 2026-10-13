import crypto from "node:crypto";
import { db } from "@/lib/db/client";

// Fee plan / payment persistence (Phase 10.4). All SQL is parameterized (the
// only interpolation is a fixed whitelist sort / constant SQL fragments).
// Every financial write that touches more than one row runs in a single
// IMMEDIATE transaction so balances are checked and written atomically, and
// each writes an audit_log row in the same transaction. Authorization and
// input validation happen one layer up in src/lib/fees/service.js; the
// invariants that must never be violated (no overpayment, receipt
// uniqueness, plan active) are re-checked here inside the transaction.

export const COUNTED_PAYMENT_STATUSES = ["RECORDED", "VERIFIED"];

const PAID_SQL = `COALESCE((SELECT SUM(p.amount_minor) FROM payments p
  WHERE p.fee_plan_id = f.id AND p.status IN ('RECORDED','VERIFIED')), 0)`;

const DERIVED_STATUS_SQL = `CASE
  WHEN f.status = 'CANCELLED' THEN 'CANCELLED'
  WHEN ${PAID_SQL} >= (f.total_minor - f.discount_minor) THEN 'PAID'
  WHEN f.due_date IS NOT NULL AND f.due_date < @today THEN 'OVERDUE'
  WHEN ${PAID_SQL} > 0 THEN 'PARTIALLY_PAID'
  ELSE 'PENDING' END`;

const PLAN_SELECT = `SELECT f.*, u.name AS student_name, u.email AS student_email,
    ${PAID_SQL} AS paid_minor, (f.total_minor - f.discount_minor) AS net_minor,
    ${DERIVED_STATUS_SQL} AS derived_status
  FROM fee_plans f JOIN users u ON u.id = f.student_user_id`;

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function rowToPlan(r) {
  if (!r) return null;
  return {
    id: r.id,
    enrollmentId: r.enrollment_id,
    studentUserId: r.student_user_id,
    studentName: r.student_name,
    studentEmail: r.student_email,
    courseSlug: r.course_slug,
    batchId: r.batch_id,
    currency: r.currency,
    totalMinor: r.total_minor,
    discountMinor: r.discount_minor,
    netMinor: r.net_minor,
    paidMinor: r.paid_minor,
    outstandingMinor: r.status === "CANCELLED" ? 0 : Math.max(0, r.net_minor - r.paid_minor),
    dueDate: r.due_date,
    planStatus: r.status,
    status: r.derived_status,
    note: r.note,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

function rowToPayment(r) {
  if (!r) return null;
  return {
    id: r.id,
    feePlanId: r.fee_plan_id,
    amountMinor: r.amount_minor,
    currency: r.currency,
    source: r.source,
    method: r.method,
    provider: r.provider,
    providerReference: r.provider_reference,
    status: r.status,
    paidOn: r.paid_on,
    note: r.note,
    recordedBy: r.recorded_by,
    recordedByName: r.recorded_by_name ?? null,
    verifiedAt: r.verified_at,
    voidedAt: r.voided_at,
    voidReason: r.void_reason,
    receiptNumber: r.receipt_number,
    receiptToken: r.receipt_token,
    createdAt: r.created_at,
  };
}

const PAYMENT_SELECT = `SELECT p.*, u.name AS recorded_by_name FROM payments p
  LEFT JOIN users u ON u.id = p.recorded_by`;

export function writeAudit({ actorUserId, action, entityType, entityId, detail }) {
  db.prepare(
    "INSERT INTO audit_log (id, actor_user_id, action, entity_type, entity_id, detail) VALUES (?, ?, ?, ?, ?, ?)"
  ).run(crypto.randomUUID(), actorUserId ?? null, action, entityType, entityId, detail ? JSON.stringify(detail) : null);
}

// The change history of one fee plan: the plan's own audit rows plus those
// of every payment recorded against it.
export function listAuditForFeePlan(feePlanId) {
  return db
    .prepare(
      `SELECT a.action, a.detail, a.created_at, u.name AS actor_name FROM audit_log a
       LEFT JOIN users u ON u.id = a.actor_user_id
       WHERE (a.entity_type = 'fee_plan' AND a.entity_id = @id)
          OR (a.entity_type = 'payment' AND a.entity_id IN (SELECT id FROM payments WHERE fee_plan_id = @id))
       ORDER BY a.created_at DESC, a.rowid DESC`
    )
    .all({ id: feePlanId })
    .map((r) => ({ action: r.action, detail: r.detail ? JSON.parse(r.detail) : null, at: r.created_at, actorName: r.actor_name }));
}

// --- reads -----------------------------------------------------------------
export function getFeePlanById(id) {
  if (!id || typeof id !== "string") return null;
  return rowToPlan(db.prepare(`${PLAN_SELECT} WHERE f.id = @id`).get({ id, today: todayIso() }));
}

export function getFeePlanByEnrollmentId(enrollmentId) {
  if (!enrollmentId || typeof enrollmentId !== "string") return null;
  return rowToPlan(db.prepare(`${PLAN_SELECT} WHERE f.enrollment_id = @id`).get({ id: enrollmentId, today: todayIso() }));
}

function likePattern(q) {
  return `%${q.replace(/[\\%_]/g, (c) => `\\${c}`)}%`;
}

const SORTS = {
  newest: "created_at DESC, id ASC",
  oldest: "created_at ASC, id ASC",
  name: "student_name COLLATE NOCASE ASC, id ASC",
  outstanding: "(net_minor - paid_minor) DESC, id ASC",
};
export const FEE_SORT_KEYS = Object.keys(SORTS);

export function listFeePlans({ q = "", status = "", course = "", sort = "newest", limit = 20, offset = 0 }) {
  const clauses = [];
  const params = { today: todayIso() };
  if (status) {
    clauses.push("derived_status = @status");
    params.status = status;
  }
  if (course) {
    clauses.push("course_slug = @course");
    params.course = course;
  }
  if (q) {
    clauses.push("(student_name LIKE @q ESCAPE '\\' OR student_email LIKE @q ESCAPE '\\')");
    params.q = likePattern(q);
  }
  const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
  const base = `SELECT * FROM (${PLAN_SELECT})`;
  const order = SORTS[sort] || SORTS.newest;
  const rows = db.prepare(`${base} ${where} ORDER BY ${order} LIMIT @limit OFFSET @offset`).all({ ...params, limit, offset });
  const total = db.prepare(`SELECT COUNT(*) AS c FROM (${PLAN_SELECT}) ${where}`).get(params).c;
  return { rows: rows.map(rowToPlan), total };
}

export function listFeePlansForStudent(userId) {
  return db
    .prepare(`${PLAN_SELECT} WHERE f.student_user_id = @userId ORDER BY f.created_at DESC, f.id ASC`)
    .all({ userId, today: todayIso() })
    .map(rowToPlan);
}

export function listPaymentsForPlan(feePlanId) {
  return db
    .prepare(`${PAYMENT_SELECT} WHERE p.fee_plan_id = ? ORDER BY p.created_at DESC, p.rowid DESC`)
    .all(feePlanId)
    .map(rowToPayment);
}

export function getPaymentById(id) {
  if (!id || typeof id !== "string") return null;
  return rowToPayment(db.prepare(`${PAYMENT_SELECT} WHERE p.id = ?`).get(id));
}

export function getPaymentByReceiptToken(token) {
  if (!token || typeof token !== "string") return null;
  return rowToPayment(db.prepare(`${PAYMENT_SELECT} WHERE p.receipt_token = ?`).get(token));
}

export function getPaymentByProviderReference(provider, reference) {
  return rowToPayment(db.prepare(`${PAYMENT_SELECT} WHERE p.provider = ? AND p.provider_reference = ?`).get(provider, reference));
}

export function getPaymentByIdempotencyKey(key) {
  return rowToPayment(db.prepare(`${PAYMENT_SELECT} WHERE p.idempotency_key = ?`).get(key));
}

// Enrollments (any status except CANCELLED) with no fee plan yet — the
// picker for /admin/fees/new. Search only, capped.
export function searchEnrollmentsWithoutFee(q, limit = 20) {
  const where = q ? "AND (u.name LIKE @q ESCAPE '\\' OR u.email LIKE @q ESCAPE '\\')" : "";
  const params = q ? { q: likePattern(q), limit } : { limit };
  return db
    .prepare(
      `SELECT be.id, be.batch_id, be.status, u.name AS student_name, u.email AS student_email
       FROM batch_enrollments be
       JOIN student_profiles sp ON sp.id = be.student_id
       JOIN users u ON u.id = sp.user_id
       WHERE be.status != 'CANCELLED'
         AND NOT EXISTS (SELECT 1 FROM fee_plans f WHERE f.enrollment_id = be.id)
         ${where}
       ORDER BY u.name COLLATE NOCASE ASC LIMIT @limit`
    )
    .all(params)
    .map((r) => ({ id: r.id, batchId: r.batch_id, status: r.status, studentName: r.student_name, studentEmail: r.student_email }));
}

export function getEnrollmentForFee(enrollmentId) {
  if (!enrollmentId || typeof enrollmentId !== "string") return null;
  const r = db
    .prepare(
      `SELECT be.id, be.batch_id, be.status, u.id AS user_id, u.name AS student_name, u.email AS student_email, u.status AS user_status
       FROM batch_enrollments be
       JOIN student_profiles sp ON sp.id = be.student_id
       JOIN users u ON u.id = sp.user_id
       WHERE be.id = ?`
    )
    .get(enrollmentId);
  if (!r) return null;
  return {
    id: r.id,
    batchId: r.batch_id,
    status: r.status,
    studentUserId: r.user_id,
    studentName: r.student_name,
    studentEmail: r.student_email,
    userStatus: r.user_status,
  };
}

export function feeTotals() {
  const r = db
    .prepare(
      `SELECT
         COUNT(*) AS plans,
         COALESCE(SUM(CASE WHEN status != 'CANCELLED' THEN total_minor - discount_minor END), 0) AS net
       FROM fee_plans`
    )
    .get();
  const paid = db
    .prepare(
      `SELECT COALESCE(SUM(p.amount_minor), 0) AS paid FROM payments p JOIN fee_plans f ON f.id = p.fee_plan_id
       WHERE p.status IN ('RECORDED','VERIFIED') AND f.status != 'CANCELLED'`
    )
    .get().paid;
  return { plans: r.plans, netMinor: r.net, paidMinor: paid, outstandingMinor: Math.max(0, r.net - paid) };
}

// --- writes ------------------------------------------------------------------
export function createFeePlanTx({ enrollmentId, studentUserId, courseSlug, batchId, currency, totalMinor, discountMinor, dueDate, note, actorUserId }) {
  const run = db.transaction(() => {
    const existing = db.prepare("SELECT id FROM fee_plans WHERE enrollment_id = ?").get(enrollmentId);
    if (existing) return { ok: false, reason: "duplicate", feePlanId: existing.id };
    const id = crypto.randomUUID();
    db.prepare(
      `INSERT INTO fee_plans (id, enrollment_id, student_user_id, course_slug, batch_id, currency, total_minor, discount_minor, due_date, note, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(id, enrollmentId, studentUserId, courseSlug, batchId, currency, totalMinor, discountMinor, dueDate || null, note || null, actorUserId);
    writeAudit({
      actorUserId,
      action: "FEE_PLAN_CREATED",
      entityType: "fee_plan",
      entityId: id,
      detail: { enrollmentId, currency, totalMinor, discountMinor, dueDate: dueDate || null },
    });
    return { ok: true, feePlanId: id };
  });
  return run.immediate();
}

export function updateFeePlanTx({ feePlanId, totalMinor, discountMinor, dueDate, note, actorUserId }) {
  const run = db.transaction(() => {
    const plan = db.prepare("SELECT * FROM fee_plans WHERE id = ?").get(feePlanId);
    if (!plan) return { ok: false, reason: "not_found" };
    if (plan.status === "CANCELLED") return { ok: false, reason: "cancelled" };
    const paid = db
      .prepare("SELECT COALESCE(SUM(amount_minor), 0) AS s FROM payments WHERE fee_plan_id = ? AND status IN ('RECORDED','VERIFIED')")
      .get(feePlanId).s;
    // A plan can't be edited below what has already been paid.
    if (totalMinor - discountMinor < paid) return { ok: false, reason: "below_paid" };
    db.prepare(
      "UPDATE fee_plans SET total_minor = ?, discount_minor = ?, due_date = ?, note = ?, updated_at = datetime('now') WHERE id = ?"
    ).run(totalMinor, discountMinor, dueDate || null, note || null, feePlanId);
    writeAudit({
      actorUserId,
      action: "FEE_PLAN_UPDATED",
      entityType: "fee_plan",
      entityId: feePlanId,
      detail: {
        from: { totalMinor: plan.total_minor, discountMinor: plan.discount_minor, dueDate: plan.due_date },
        to: { totalMinor, discountMinor, dueDate: dueDate || null },
      },
    });
    return { ok: true };
  });
  return run.immediate();
}

export function cancelFeePlanTx({ feePlanId, reason, actorUserId }) {
  const run = db.transaction(() => {
    const plan = db.prepare("SELECT status FROM fee_plans WHERE id = ?").get(feePlanId);
    if (!plan) return { ok: false, reason: "not_found" };
    if (plan.status === "CANCELLED") return { ok: false, reason: "cancelled" };
    const counted = db
      .prepare("SELECT COUNT(*) AS c FROM payments WHERE fee_plan_id = ? AND status IN ('RECORDED','VERIFIED')")
      .get(feePlanId).c;
    if (counted > 0) return { ok: false, reason: "has_payments" };
    db.prepare("UPDATE fee_plans SET status = 'CANCELLED', updated_at = datetime('now') WHERE id = ?").run(feePlanId);
    writeAudit({ actorUserId, action: "FEE_PLAN_CANCELLED", entityType: "fee_plan", entityId: feePlanId, detail: { reason } });
    return { ok: true };
  });
  return run.immediate();
}

function nextReceiptNumber() {
  const count = db.prepare("SELECT COUNT(*) AS c FROM payments").get().c + 1;
  return `RCPT-${new Date().getUTCFullYear()}-${String(count).padStart(6, "0")}`;
}

// Inserts a counted payment after re-checking, inside the transaction, that
// the plan is active, the currency matches and the amount does not exceed
// the outstanding balance.
function insertPayment({ feePlanId, amountMinor, currency, source, method, provider, providerReference, idempotencyKey, status, paidOn, note, actorUserId, verifiedAt }) {
  const plan = db.prepare("SELECT * FROM fee_plans WHERE id = ?").get(feePlanId);
  if (!plan) return { ok: false, reason: "not_found" };
  if (plan.status === "CANCELLED") return { ok: false, reason: "cancelled" };
  if (plan.currency !== currency) return { ok: false, reason: "currency_mismatch" };
  const paid = db
    .prepare("SELECT COALESCE(SUM(amount_minor), 0) AS s FROM payments WHERE fee_plan_id = ? AND status IN ('RECORDED','VERIFIED')")
    .get(feePlanId).s;
  const outstanding = plan.total_minor - plan.discount_minor - paid;
  if (outstanding <= 0) return { ok: false, reason: "already_paid" };
  if (amountMinor > outstanding) return { ok: false, reason: "exceeds_outstanding", outstandingMinor: outstanding };

  const id = crypto.randomUUID();
  const receiptToken = crypto.randomBytes(24).toString("base64url");
  const receiptNumber = nextReceiptNumber();
  db.prepare(
    `INSERT INTO payments (id, fee_plan_id, amount_minor, currency, source, method, provider, provider_reference,
       idempotency_key, status, paid_on, note, recorded_by, verified_at, receipt_number, receipt_token)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    id, feePlanId, amountMinor, currency, source, method, provider ?? null, providerReference ?? null,
    idempotencyKey ?? null, status, paidOn, note ?? null, actorUserId ?? null, verifiedAt ?? null, receiptNumber, receiptToken
  );
  writeAudit({
    actorUserId,
    action: source === "GATEWAY" ? "PAYMENT_VERIFIED" : "PAYMENT_RECORDED",
    entityType: "payment",
    entityId: id,
    detail: { feePlanId, amountMinor, currency, method, source, receiptNumber, providerReference: providerReference ?? null },
  });
  return { ok: true, paymentId: id, receiptNumber, receiptToken };
}

export function recordManualPaymentTx({ feePlanId, amountMinor, currency, method, paidOn, note, idempotencyKey, actorUserId }) {
  const run = db.transaction(() => {
    if (idempotencyKey) {
      const dup = getPaymentByIdempotencyKey(idempotencyKey);
      if (dup) return { ok: false, reason: "duplicate", paymentId: dup.id };
    }
    return insertPayment({
      feePlanId, amountMinor, currency, source: "MANUAL", method, status: "RECORDED", paidOn, note, idempotencyKey, actorUserId,
    });
  });
  return run.immediate();
}

// A payment confirmed by a payment provider (called only from code that has
// already verified the provider's signature). Idempotent per
// (provider, eventId) and per (provider, providerReference).
export function recordGatewayPaymentTx({ provider, eventId, providerReference, feePlanId, amountMinor, currency, paidOn }) {
  const run = db.transaction(() => {
    const seen = db.prepare("SELECT 1 FROM payment_provider_events WHERE provider = ? AND event_id = ?").get(provider, eventId);
    if (seen) return { ok: true, duplicate: true };
    const existing = getPaymentByProviderReference(provider, providerReference);
    let outcome;
    let result;
    if (existing) {
      outcome = "duplicate_reference";
      result = { ok: true, duplicate: true, paymentId: existing.id };
    } else {
      result = insertPayment({
        feePlanId, amountMinor, currency, source: "GATEWAY", method: "GATEWAY", provider, providerReference,
        status: "VERIFIED", paidOn, actorUserId: null, verifiedAt: new Date().toISOString(),
      });
      outcome = result.ok ? "recorded" : `rejected:${result.reason}`;
    }
    db.prepare("INSERT INTO payment_provider_events (id, provider, event_id, outcome) VALUES (?, ?, ?, ?)").run(
      crypto.randomUUID(), provider, eventId, outcome
    );
    return result;
  });
  return run.immediate();
}

export function voidPaymentTx({ paymentId, reason, actorUserId }) {
  const run = db.transaction(() => {
    const p = db.prepare("SELECT status, fee_plan_id FROM payments WHERE id = ?").get(paymentId);
    if (!p) return { ok: false, reason: "not_found" };
    if (p.status === "VOIDED") return { ok: false, reason: "already_voided" };
    db.prepare(
      "UPDATE payments SET status = 'VOIDED', voided_at = datetime('now'), void_reason = ?, voided_by = ? WHERE id = ?"
    ).run(reason, actorUserId, paymentId);
    writeAudit({ actorUserId, action: "PAYMENT_VOIDED", entityType: "payment", entityId: paymentId, detail: { reason, feePlanId: p.fee_plan_id } });
    return { ok: true, feePlanId: p.fee_plan_id };
  });
  return run.immediate();
}
