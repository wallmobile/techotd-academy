// Fee / payment domain layer (Phase 10.4). Every function re-derives the
// caller via getFinanceContext(); validates input server-side (amounts are
// parsed from strings to integer minor units, never floats); and delegates
// the atomic write + audit to src/lib/db/fees.js. Returns
// { ok: true, ... } or { ok: false, reason, message } — never throws for
// expected business failures.

import crypto from "node:crypto";
import { getFinanceContext } from "@/lib/fees/context";
import {
  getFeePlanById,
  getFeePlanByEnrollmentId,
  listFeePlans,
  listPaymentsForPlan,
  getPaymentById,
  searchEnrollmentsWithoutFee,
  getEnrollmentForFee,
  feeTotals,
  listAuditForFeePlan,
  createFeePlanTx,
  updateFeePlanTx,
  cancelFeePlanTx,
  recordManualPaymentTx,
  voidPaymentTx,
} from "@/lib/db/fees";
import { parseAmountToMinor } from "@/lib/money";
import {
  SUPPORTED_CURRENCIES,
  DEFAULT_CURRENCY,
  MANUAL_PAYMENT_METHODS,
  FEES_PAGE_SIZE,
  NOTE_MAX_LENGTH,
} from "@/constants/fees";
import { getBatchById } from "@/data/batches";
import { getCourseBySlug } from "@/data/courses";

const MESSAGES = {
  forbidden: "You don't have permission to do that.",
  enrollment_invalid: "Please choose a valid enrollment.",
  enrollment_cancelled: "Fees can't be assigned to a cancelled enrollment.",
  student_inactive: "This student's account is not active.",
  amount_invalid: "Enter a valid amount (up to 2 decimal places).",
  discount_invalid: "Enter a valid discount (up to 2 decimal places).",
  discount_exceeds: "The discount can't exceed the total fee.",
  currency_invalid: "Unsupported currency.",
  due_invalid: "Enter a valid due date.",
  note_long: `Notes can be at most ${NOTE_MAX_LENGTH} characters.`,
  duplicate: "A fee has already been assigned to this enrollment.",
  not_found: "Fee record not found.",
  cancelled: "This fee has been cancelled.",
  below_paid: "The net fee can't be set below the amount already paid.",
  has_payments: "This fee has recorded payments, so it can't be cancelled.",
  method_invalid: "Please choose a payment method.",
  date_invalid: "Enter a valid payment date (not in the future).",
  payment_amount_invalid: "Enter a valid payment amount greater than zero.",
  exceeds_outstanding: "That payment is more than the outstanding balance.",
  already_paid: "This fee is already fully paid.",
  currency_mismatch: "Payment currency does not match the fee.",
  reason_required: "Please give a reason.",
  already_voided: "This payment is already voided.",
};
export const feeMessage = (reason) => MESSAGES[reason] || "Something went wrong.";
const fail = (reason, extra = {}) => ({ ok: false, reason, message: feeMessage(reason), ...extra });

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
function validDate(value) {
  if (typeof value !== "string" || !DATE_RE.test(value)) return false;
  const d = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === value;
}

function describePlan(plan) {
  const batch = getBatchById(plan.batchId);
  return {
    ...plan,
    courseTitle: getCourseBySlug(plan.courseSlug)?.title ?? plan.courseSlug,
    batchLabel: batch ? `${batch.mode} — ${batch.startDate}` : plan.batchId,
  };
}

// --- reads -----------------------------------------------------------------
export async function getFeesPage({ q, status, course, sort, page }) {
  if (!(await getFinanceContext())) return { rows: [], page: 1, totalPages: 1, pageSize: FEES_PAGE_SIZE, total: 0 };
  const probe = listFeePlans({ q, status, course, sort, limit: 1, offset: 0 });
  const totalPages = Math.max(1, Math.ceil(probe.total / FEES_PAGE_SIZE));
  const current = Math.min(Math.max(1, page || 1), totalPages);
  const { rows, total } = listFeePlans({ q, status, course, sort, limit: FEES_PAGE_SIZE, offset: (current - 1) * FEES_PAGE_SIZE });
  return { rows: rows.map(describePlan), page: current, totalPages, pageSize: FEES_PAGE_SIZE, total };
}

export async function getFeeDetail(feePlanId) {
  if (!(await getFinanceContext())) return null;
  const plan = getFeePlanById(feePlanId);
  if (!plan) return null;
  return {
    plan: describePlan(plan),
    payments: listPaymentsForPlan(plan.id),
    history: listAuditForFeePlan(plan.id),
  };
}

export async function getFeeForEnrollment(enrollmentId) {
  if (!(await getFinanceContext())) return null;
  const plan = getFeePlanByEnrollmentId(enrollmentId);
  return plan ? describePlan(plan) : null;
}

export async function getFeeSummary() {
  if (!(await getFinanceContext())) return null;
  return feeTotals();
}

export async function getFeeFormData({ enrollmentId, query }) {
  if (!(await getFinanceContext())) return null;
  const enrollment = enrollmentId ? getEnrollmentForFee(enrollmentId) : null;
  const usable = enrollment && enrollment.status !== "CANCELLED" ? enrollment : null;
  const batch = usable ? getBatchById(usable.batchId) : null;
  return {
    enrollment: usable
      ? {
          ...usable,
          courseTitle: batch ? getCourseBySlug(batch.courseSlug)?.title ?? batch.courseSlug : "Unknown course",
          batchLabel: batch ? `${batch.mode} — ${batch.startDate}` : usable.batchId,
          existingFeeId: getFeePlanByEnrollmentId(usable.id)?.id ?? null,
        }
      : null,
    candidates: usable
      ? []
      : searchEnrollmentsWithoutFee(query || "").map((c) => {
          const b = getBatchById(c.batchId);
          return { ...c, courseTitle: b ? getCourseBySlug(b.courseSlug)?.title ?? b.courseSlug : c.batchId };
        }),
    currencies: SUPPORTED_CURRENCIES,
    defaultCurrency: DEFAULT_CURRENCY,
  };
}

export async function getPaymentForReceipt(paymentId) {
  if (!(await getFinanceContext())) return null;
  const payment = getPaymentById(paymentId);
  if (!payment || payment.status === "VOIDED") return null;
  const plan = getFeePlanById(payment.feePlanId);
  return plan ? { payment, plan: describePlan(plan) } : null;
}

// --- mutations -------------------------------------------------------------
function parseMoneyFields({ total, discount }) {
  const totalMinor = parseAmountToMinor(typeof total === "string" ? total : "");
  if (totalMinor === null) return { error: "amount_invalid" };
  const discountRaw = typeof discount === "string" && discount.trim() !== "" ? discount : "0";
  const discountMinor = parseAmountToMinor(discountRaw);
  if (discountMinor === null) return { error: "discount_invalid" };
  if (discountMinor > totalMinor) return { error: "discount_exceeds" };
  return { totalMinor, discountMinor };
}

function cleanNote(note) {
  const value = typeof note === "string" ? note.trim() : "";
  return value.length > NOTE_MAX_LENGTH ? null : value;
}

export async function assignFee({ enrollmentId, currency, total, discount, dueDate, note }) {
  const ctx = await getFinanceContext();
  if (!ctx) return fail("forbidden");

  const enrollment = getEnrollmentForFee(enrollmentId);
  if (!enrollment) return fail("enrollment_invalid");
  if (enrollment.status === "CANCELLED") return fail("enrollment_cancelled");
  if (enrollment.userStatus !== "ACTIVE") return fail("student_inactive");
  if (!SUPPORTED_CURRENCIES.includes(currency)) return fail("currency_invalid");

  const money = parseMoneyFields({ total, discount });
  if (money.error) return fail(money.error);
  const due = typeof dueDate === "string" ? dueDate.trim() : "";
  if (due && !validDate(due)) return fail("due_invalid");
  const cleaned = cleanNote(note);
  if (cleaned === null) return fail("note_long");

  const batch = getBatchById(enrollment.batchId);
  if (!batch) return fail("enrollment_invalid");

  const result = createFeePlanTx({
    enrollmentId: enrollment.id,
    studentUserId: enrollment.studentUserId,
    courseSlug: batch.courseSlug,
    batchId: batch.id,
    currency,
    totalMinor: money.totalMinor,
    discountMinor: money.discountMinor,
    dueDate: due,
    note: cleaned,
    actorUserId: ctx.user.id,
  });
  if (!result.ok) return fail(result.reason, { feePlanId: result.feePlanId });
  return { ok: true, feePlanId: result.feePlanId, studentUserId: enrollment.studentUserId };
}

export async function updateFee({ feePlanId, total, discount, dueDate, note }) {
  const ctx = await getFinanceContext();
  if (!ctx) return fail("forbidden");
  const money = parseMoneyFields({ total, discount });
  if (money.error) return fail(money.error);
  const due = typeof dueDate === "string" ? dueDate.trim() : "";
  if (due && !validDate(due)) return fail("due_invalid");
  const cleaned = cleanNote(note);
  if (cleaned === null) return fail("note_long");

  const result = updateFeePlanTx({
    feePlanId,
    totalMinor: money.totalMinor,
    discountMinor: money.discountMinor,
    dueDate: due,
    note: cleaned,
    actorUserId: ctx.user.id,
  });
  return result.ok ? { ok: true, feePlanId } : fail(result.reason);
}

export async function cancelFee({ feePlanId, reason }) {
  const ctx = await getFinanceContext();
  if (!ctx) return fail("forbidden");
  const text = typeof reason === "string" ? reason.trim() : "";
  if (!text) return fail("reason_required");
  if (text.length > NOTE_MAX_LENGTH) return fail("note_long");
  const result = cancelFeePlanTx({ feePlanId, reason: text, actorUserId: ctx.user.id });
  return result.ok ? { ok: true, feePlanId } : fail(result.reason);
}

// Manual (offline) payment, entered by authorized staff. Always stored as
// source MANUAL / status RECORDED — it can never be marked gateway-verified
// from here. `idempotencyKey` (a per-form-render token) makes a
// double-submit record once.
export async function recordManualPayment({ feePlanId, amount, method, paidOn, note, idempotencyKey }) {
  const ctx = await getFinanceContext();
  if (!ctx) return fail("forbidden");

  const plan = getFeePlanById(feePlanId);
  if (!plan) return fail("not_found");
  const amountMinor = parseAmountToMinor(typeof amount === "string" ? amount : "");
  if (amountMinor === null || amountMinor <= 0) return fail("payment_amount_invalid");
  if (!MANUAL_PAYMENT_METHODS.includes(method)) return fail("method_invalid");
  const tomorrow = new Date(Date.now() + 86_400_000).toISOString().slice(0, 10);
  if (!validDate(paidOn) || paidOn > tomorrow) return fail("date_invalid");
  const cleaned = cleanNote(note);
  if (cleaned === null) return fail("note_long");
  const key = typeof idempotencyKey === "string" && /^[A-Za-z0-9_-]{8,64}$/.test(idempotencyKey) ? `manual:${idempotencyKey}` : null;

  const result = recordManualPaymentTx({
    feePlanId: plan.id,
    amountMinor,
    currency: plan.currency,
    method,
    paidOn,
    note: cleaned,
    idempotencyKey: key,
    actorUserId: ctx.user.id,
  });
  if (!result.ok) return fail(result.reason, { paymentId: result.paymentId });
  return { ok: true, feePlanId: plan.id, paymentId: result.paymentId, receiptNumber: result.receiptNumber };
}

export async function voidPayment({ paymentId, reason }) {
  const ctx = await getFinanceContext();
  if (!ctx) return fail("forbidden");
  const text = typeof reason === "string" ? reason.trim() : "";
  if (!text) return fail("reason_required");
  if (text.length > NOTE_MAX_LENGTH) return fail("note_long");
  const result = voidPaymentTx({ paymentId, reason: text, actorUserId: ctx.user.id });
  return result.ok ? { ok: true, feePlanId: result.feePlanId } : fail(result.reason);
}

export function newIdempotencyKey() {
  return crypto.randomBytes(12).toString("base64url");
}
