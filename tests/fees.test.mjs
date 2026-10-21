import { test } from "node:test";
import assert from "node:assert/strict";
import { tdb, failAuditInsert, removeAuditFailure } from "./tdb.mjs";
import crypto from "node:crypto";
import { db } from "@/lib/db/client";
import {
  assignFee,
  updateFee,
  cancelFee,
  recordManualPayment,
  voidPayment,
  getFeesPage,
  getFeeDetail,
  getFeeSummary,
  getFeeFormData,
  getPaymentForReceipt,
} from "@/lib/fees/service";
import { assignFeeAction, recordPaymentAction, voidPaymentAction, updateFeeAction, cancelFeeAction } from "@/lib/fees/actions";
import { getFinanceContext, requireFinanceContext } from "@/lib/fees/context";
import { parseFeeParams } from "@/lib/fees/params";
import { verifyWebhookSignature, confirmGatewayPayment, isGatewayConfigured } from "@/lib/fees/gateway";
import { getMyFees, getMyReceipt } from "@/lib/student/fees";
import { createEnrollment, setEnrollmentStatus } from "@/lib/admin/enrollments";
import { parseAmountToMinor, formatMinor } from "@/lib/money";
import { getFeePlanById } from "@/lib/db/fees";
import { makeUser, signIn, signOut, ensureSecondBatch } from "./helpers.mjs";

function form(values) {
  const fd = new FormData();
  for (const [k, v] of Object.entries(values)) fd.set(k, v);
  return fd;
}

async function redirectTarget(fn) {
  try {
    await fn();
  } catch (error) {
    if (error.location) return error.location;
    throw error;
  }
  return null;
}

const count = async (table) => (await tdb.prepare(`SELECT COUNT(*) AS c FROM ${table}`).get()).c;
const today = new Date().toISOString().slice(0, 10);
const yesterday = new Date(Date.now() - 86_400_000 * 2).toISOString().slice(0, 10);

// A student with an ACTIVE enrollment in a fresh batch, enrolled by an admin.
async function enrolled(label = "feestu") {
  const { batchA } = ensureSecondBatch();
  const student = await makeUser("STUDENT", label);
  const admin = await makeUser("ADMIN", "enr-admin");
  await signIn(admin);
  const e = await createEnrollment({ studentUserId: student.id, courseSlug: batchA.courseSlug, batchId: batchA.id });
  assert.equal(e.ok, true);
  return { student, enrollmentId: e.enrollmentId, batch: batchA };
}

async function withFee({ total = "10000", discount = "0", dueDate = "", label } = {}) {
  const ctx = await enrolled(label);
  const accountant = await makeUser("ACCOUNTANT", "acct");
  await signIn(accountant);
  const fee = await assignFee({ enrollmentId: ctx.enrollmentId, currency: "INR", total, discount, dueDate, note: "" });
  assert.equal(fee.ok, true, fee.message);
  return { ...ctx, accountant, feePlanId: fee.feePlanId };
}

const pay = async (feePlanId, amount, extra = {}) =>
  await recordManualPayment({ feePlanId, amount, method: "CASH", paidOn: today, note: "", idempotencyKey: crypto.randomBytes(9).toString("base64url"), ...extra });

// -------------------------------------------------------------------- money
test("money parsing is exact integer minor units; floats and malformed input are rejected", () => {
  assert.equal(parseAmountToMinor("25000"), 2500000);
  assert.equal(parseAmountToMinor("12500.5"), 1250050);
  assert.equal(parseAmountToMinor("0.07"), 7);
  assert.equal(parseAmountToMinor("1,00,000"), 10000000);
  assert.equal(parseAmountToMinor("100.10") + parseAmountToMinor("0.20"), 10030, "no float drift");
  for (const bad of ["", "abc", "-5", "1e3", "12.345", "12.", ".5", "NaN", "Infinity", "1 000", "9999999999", null, undefined, 12, {}]) {
    assert.equal(parseAmountToMinor(bad), null, String(bad));
  }
  assert.equal(formatMinor(1250050, "INR"), "₹12,500.50");
});

// ----------------------------------------------------------- fee assignment
test("a finance user can assign a fee to a real enrollment; amounts are stored as integer minor units", async () => {
  const ctx = await enrolled();
  await signIn(await makeUser("ACCOUNTANT", "fin"));
  const res = await assignFee({ enrollmentId: ctx.enrollmentId, currency: "INR", total: "25000.50", discount: "1000", dueDate: "2030-01-15", note: "Instalment plan" });
  assert.equal(res.ok, true);
  const plan = await getFeePlanById(res.feePlanId);
  assert.equal(plan.totalMinor, 2500050);
  assert.equal(plan.discountMinor, 100000);
  assert.equal(plan.netMinor, 2400050);
  assert.equal(plan.paidMinor, 0);
  assert.equal(plan.outstandingMinor, 2400050);
  assert.equal(plan.status, "PENDING");
  assert.equal(plan.courseSlug, ctx.batch.courseSlug);
  assert.equal(plan.batchId, ctx.batch.id);
  assert.equal(plan.studentUserId, ctx.student.id);
  const audit = await tdb.prepare("SELECT action, actor_user_id FROM audit_log WHERE entity_id = ?").all(res.feePlanId);
  assert.equal(audit[0].action, "FEE_PLAN_CREATED");
  assert.ok(audit[0].actor_user_id);
});

test("admins and super admins may assign fees too", async () => {
  for (const role of ["ADMIN", "SUPER_ADMIN"]) {
    const ctx = await enrolled(`fee-${role}`);
    await signIn(await makeUser(role, "fin"));
    assert.equal((await assignFee({ enrollmentId: ctx.enrollmentId, currency: "INR", total: "100", discount: "", dueDate: "", note: "" })).ok, true, role);
  }
});

test("invalid fee input is rejected and writes nothing", async () => {
  const ctx = await enrolled();
  await signIn(await makeUser("ACCOUNTANT", "fin"));
  const before = await count("fee_plans");
  const base = { enrollmentId: ctx.enrollmentId, currency: "INR", total: "1000", discount: "0", dueDate: "", note: "" };
  const cases = [
    [{ total: "abc" }, "amount_invalid"],
    [{ total: "-100" }, "amount_invalid"],
    [{ total: "" }, "amount_invalid"],
    [{ total: "10.999" }, "amount_invalid"],
    [{ discount: "oops" }, "discount_invalid"],
    [{ discount: "1000.01" }, "discount_exceeds"],
    [{ currency: "USD" }, "currency_invalid"],
    [{ currency: "" }, "currency_invalid"],
    [{ dueDate: "2030-02-31" }, "due_invalid"],
    [{ dueDate: "tomorrow" }, "due_invalid"],
    [{ note: "x".repeat(501) }, "note_long"],
    [{ enrollmentId: "no-such-enrollment" }, "enrollment_invalid"],
    [{ enrollmentId: undefined }, "enrollment_invalid"],
  ];
  for (const [override, reason] of cases) {
    const res = await assignFee({ ...base, ...override });
    assert.equal(res.ok, false, JSON.stringify(override));
    assert.equal(res.reason, reason, JSON.stringify(override));
  }
  assert.equal(await count("fee_plans"), before);
});

test("cancelled enrollments and inactive students can't be assigned a fee; duplicates are refused", async () => {
  const cancelled = await enrolled("cancelled");
  await signIn(await makeUser("ADMIN", "x"));
  await setEnrollmentStatus(cancelled.enrollmentId, "CANCELLED");
  await signIn(await makeUser("ACCOUNTANT", "fin"));
  const args = { currency: "INR", total: "500", discount: "", dueDate: "", note: "" };
  assert.equal((await assignFee({ enrollmentId: cancelled.enrollmentId, ...args })).reason, "enrollment_cancelled");

  const inactive = await enrolled("inactive");
  await tdb.prepare("UPDATE users SET status = 'INACTIVE' WHERE id = ?").run(inactive.student.id);
  await signIn(await makeUser("ACCOUNTANT", "fin2"));
  assert.equal((await assignFee({ enrollmentId: inactive.enrollmentId, ...args })).reason, "student_inactive");

  const dup = await enrolled("dup");
  await signIn(await makeUser("ACCOUNTANT", "fin3"));
  assert.equal((await assignFee({ enrollmentId: dup.enrollmentId, ...args })).ok, true);
  const second = await assignFee({ enrollmentId: dup.enrollmentId, ...args });
  assert.equal(second.reason, "duplicate");
  assert.equal((await tdb.prepare("SELECT COUNT(*) AS c FROM fee_plans WHERE enrollment_id = ?").get(dup.enrollmentId)).c, 1);
});

test("unauthorized roles can't see or change fees — by function or by direct action call", async () => {
  const ctx = await withFee({ total: "5000" });
  const before = [await count("fee_plans"), await count("payments"), await count("audit_log")];
  const other = await enrolled("target2");

  await signOut();
  for (const role of [null, "STUDENT", "TRAINER", "COUNSELLOR", "CONTENT_MANAGER", "PLACEMENT_MANAGER"]) {
    if (role) await signIn(await makeUser(role, "intruder"));
    assert.equal(await getFinanceContext(), null, String(role));
    assert.equal((await assignFee({ enrollmentId: other.enrollmentId, currency: "INR", total: "1", discount: "", dueDate: "", note: "" })).ok, false);
    assert.equal((await pay(ctx.feePlanId, "100")).ok, false);
    assert.equal((await updateFee({ feePlanId: ctx.feePlanId, total: "1", discount: "0", dueDate: "", note: "" })).ok, false);
    assert.equal((await cancelFee({ feePlanId: ctx.feePlanId, reason: "x" })).ok, false);
    assert.equal(
      (await assignFeeAction(null, form({ enrollmentId: other.enrollmentId, currency: "INR", total: "1" }))).status,
      "error"
    );
    assert.equal((await recordPaymentAction(null, form({ feePlanId: ctx.feePlanId, amount: "100", method: "CASH", paidOn: today }))).status, "error");
    assert.equal((await updateFeeAction(null, form({ feePlanId: ctx.feePlanId, total: "1", discount: "0" }))).status, "error");
    assert.equal((await cancelFeeAction(null, form({ feePlanId: ctx.feePlanId, reason: "x" }))).status, "error");
    assert.equal((await getFeesPage(parseFeeParams({}))).total, 0);
    assert.equal(await getFeeDetail(ctx.feePlanId), null);
    assert.equal(await getFeeSummary(), null);
    assert.equal(await getFeeFormData({}), null);
  }
  assert.deepEqual([await count("fee_plans"), await count("payments"), await count("audit_log")], before);
});

test("page guard: anonymous, student, trainer, counsellor are redirected from finance routes", async () => {
  await signOut();
  assert.equal(await redirectTarget(requireFinanceContext), "/login");
  await signIn(await makeUser("STUDENT", "s"));
  assert.equal(await redirectTarget(requireFinanceContext), "/student");
  await signIn(await makeUser("TRAINER", "t"));
  assert.equal(await redirectTarget(requireFinanceContext), "/trainer");
  await signIn(await makeUser("COUNSELLOR", "c"));
  assert.equal(await redirectTarget(requireFinanceContext), "/admin");
  for (const role of ["ACCOUNTANT", "ADMIN", "SUPER_ADMIN"]) {
    await signIn(await makeUser(role, "ok"));
    assert.equal(await redirectTarget(requireFinanceContext), null, role);
  }
});

// ------------------------------------------------------------------ payments
test("partial then full payment: balances and derived status are exact", async () => {
  const f = await withFee({ total: "100.10", discount: "0.10" }); // net 100.00
  let plan = await getFeePlanById(f.feePlanId);
  assert.equal(plan.netMinor, 10000);
  assert.equal(plan.status, "PENDING");

  assert.equal((await pay(f.feePlanId, "33.33")).ok, true);
  plan = await getFeePlanById(f.feePlanId);
  assert.equal(plan.paidMinor, 3333);
  assert.equal(plan.outstandingMinor, 6667);
  assert.equal(plan.status, "PARTIALLY_PAID");

  assert.equal((await pay(f.feePlanId, "66.67")).ok, true);
  plan = await getFeePlanById(f.feePlanId);
  assert.equal(plan.paidMinor, 10000);
  assert.equal(plan.outstandingMinor, 0);
  assert.equal(plan.status, "PAID");

  assert.equal((await pay(f.feePlanId, "0.01")).reason, "already_paid");
  assert.equal((await tdb.prepare("SELECT COUNT(*) AS c FROM payments WHERE fee_plan_id = ?").get(f.feePlanId)).c, 2);
});

test("overpayment, bad amounts, bad methods and future dates are rejected", async () => {
  const f = await withFee({ total: "1000" });
  const before = await count("payments");
  assert.equal((await pay(f.feePlanId, "1000.01")).reason, "exceeds_outstanding");
  assert.equal((await pay(f.feePlanId, "0")).reason, "payment_amount_invalid");
  assert.equal((await pay(f.feePlanId, "-10")).reason, "payment_amount_invalid");
  assert.equal((await pay(f.feePlanId, "ten")).reason, "payment_amount_invalid");
  assert.equal((await pay(f.feePlanId, "10", { method: "GATEWAY" })).reason, "method_invalid", "a gateway method can't be claimed manually");
  assert.equal((await pay(f.feePlanId, "10", { method: "BITCOIN" })).reason, "method_invalid");
  assert.equal((await pay(f.feePlanId, "10", { paidOn: "2999-01-01" })).reason, "date_invalid");
  assert.equal((await pay(f.feePlanId, "10", { paidOn: "garbage" })).reason, "date_invalid");
  assert.equal((await pay("missing-plan", "10")).reason, "not_found");
  assert.equal(await count("payments"), before);
});

test("derived status: OVERDUE when past due with a balance; PAID when fully paid even if past due", async () => {
  const f = await withFee({ total: "500", dueDate: yesterday });
  assert.equal((await getFeePlanById(f.feePlanId)).status, "OVERDUE");
  await pay(f.feePlanId, "100");
  assert.equal((await getFeePlanById(f.feePlanId)).status, "OVERDUE");
  await pay(f.feePlanId, "400");
  assert.equal((await getFeePlanById(f.feePlanId)).status, "PAID");
});

test("a manual payment is recorded as MANUAL/RECORDED, attributed to the staff member, and never as gateway-verified", async () => {
  const f = await withFee({ total: "900" });
  const res = await pay(f.feePlanId, "250", { method: "UPI", note: "UTR 12345" });
  const row = await tdb.prepare("SELECT * FROM payments WHERE id = ?").get(res.paymentId);
  assert.equal(row.source, "MANUAL");
  assert.equal(row.status, "RECORDED");
  assert.equal(row.method, "UPI");
  assert.equal(row.provider, null);
  assert.equal(row.verified_at, null);
  assert.equal(row.recorded_by, f.accountant.id);
  assert.equal(row.amount_minor, 25000);
  const detail = await getFeeDetail(f.feePlanId);
  assert.equal(detail.payments[0].recordedByName.startsWith("acct"), true);
});

test("a double-submitted payment (same idempotency key) is recorded once", async () => {
  const f = await withFee({ total: "900" });
  const key = "form-render-abc12345";
  const a = await pay(f.feePlanId, "100", { idempotencyKey: key });
  const b = await pay(f.feePlanId, "100", { idempotencyKey: key });
  assert.equal(a.ok, true);
  assert.equal(b.ok, false);
  assert.equal(b.reason, "duplicate");
  assert.equal((await tdb.prepare("SELECT COUNT(*) AS c FROM payments WHERE fee_plan_id = ?").get(f.feePlanId)).c, 1);
  // through the action the repeat reads as already recorded, not an error
  const viaAction = await recordPaymentAction(null, form({ feePlanId: f.feePlanId, amount: "100", method: "CASH", paidOn: today, idempotencyKey: key }));
  assert.equal(viaAction.status, "success");
  assert.equal((await tdb.prepare("SELECT COUNT(*) AS c FROM payments WHERE fee_plan_id = ?").get(f.feePlanId)).c, 1);
});

test("a failed write rolls back the whole financial transaction", async () => {
  const f = await withFee({ total: "900" });
  await failAuditInsert("fail_payment_audit", "PAYMENT_RECORDED");
  const before = [await count("payments"), await count("audit_log")];
  try {
    await assert.rejects(async () => await pay(f.feePlanId, "100"));
  } finally {
    await removeAuditFailure("fail_payment_audit");
  }
  assert.deepEqual([await count("payments"), await count("audit_log")], before, "no half-written payment");
  assert.equal((await getFeePlanById(f.feePlanId)).paidMinor, 0);
  assert.equal((await pay(f.feePlanId, "100")).ok, true, "and the system still works afterwards");
});

// ------------------------------------------------------------------ receipts
test("a receipt exists only for a real recorded payment; numbers are unique and tokens unguessable", async () => {
  const f = await withFee({ total: "600" });
  assert.equal((await tdb.prepare("SELECT COUNT(*) AS c FROM payments WHERE fee_plan_id = ?").get(f.feePlanId)).c, 0);
  const rejected = await pay(f.feePlanId, "9999");
  assert.equal(rejected.ok, false);
  assert.equal((await tdb.prepare("SELECT COUNT(*) AS c FROM payments WHERE fee_plan_id = ?").get(f.feePlanId)).c, 0, "no receipt for a rejected payment");

  const a = await pay(f.feePlanId, "100");
  const b = await pay(f.feePlanId, "200");
  const rows = await tdb.prepare("SELECT receipt_number, receipt_token FROM payments WHERE fee_plan_id = ?").all(f.feePlanId);
  assert.equal(rows.length, 2);
  assert.notEqual(rows[0].receipt_number, rows[1].receipt_number);
  assert.match(rows[0].receipt_number, /^RCPT-\d{4}-\d{6}$/);
  for (const r of rows) assert.ok(r.receipt_token.length >= 32, "token has real entropy");
  assert.notEqual(rows[0].receipt_token, rows[1].receipt_token);
  assert.equal(a.ok && b.ok, true);

  const rec = await getPaymentForReceipt(a.paymentId);
  assert.equal(rec.payment.receiptNumber, a.receiptNumber);
  assert.equal(rec.payment.source, "MANUAL");
});

// ------------------------------------------------------------- student side
test("students see only their own fees and receipts, read-only", async () => {
  const mine = await withFee({ total: "3000", label: "mine" });
  const pm = await pay(mine.feePlanId, "1000");
  const theirs = await withFee({ total: "7000", label: "theirs" });
  const pt = await pay(theirs.feePlanId, "500");
  const tokenOf = async (id) => (await tdb.prepare("SELECT receipt_token t FROM payments WHERE id = ?").get(id)).t;

  await signIn(mine.student);
  const fees = await getMyFees();
  assert.equal(fees.length, 1);
  assert.equal(fees[0].id, mine.feePlanId);
  assert.equal(fees[0].netMinor, 300000);
  assert.equal(fees[0].paidMinor, 100000);
  assert.equal(fees[0].payments.length, 1);
  const dump = JSON.stringify(fees);
  for (const secret of ["recordedBy", "recorded_by", "audit", "note", "password", "token_hash"]) assert.ok(!dump.includes(secret), secret);

  assert.ok(await getMyReceipt(await tokenOf(pm.paymentId)));
  assert.equal(await getMyReceipt(await tokenOf(pt.paymentId)), null, "another student's receipt");
  assert.equal(await getMyReceipt("not-a-token"), null);

  // students can't change anything
  const before = [await count("payments"), await count("fee_plans"), await count("audit_log")];
  assert.equal((await recordPaymentAction(null, form({ feePlanId: mine.feePlanId, amount: "2000", method: "CASH", paidOn: today }))).status, "error");
  assert.equal((await updateFeeAction(null, form({ feePlanId: mine.feePlanId, total: "1", discount: "0" }))).status, "error");
  assert.equal((await voidPaymentAction(null, form({ paymentId: pm.paymentId, reason: "no" }))).status, "error");
  assert.deepEqual([await count("payments"), await count("fee_plans"), await count("audit_log")], before);
  assert.equal((await getFeePlanById(mine.feePlanId)).paidMinor, 100000);

  // other roles' sessions get nothing from the student view
  await signIn(await makeUser("TRAINER", "t"));
  assert.deepEqual(await getMyFees(), []);
  assert.equal(await getMyReceipt(await tokenOf(pm.paymentId)), null);
});

// --------------------------------------------------- history / void / cancel
test("voiding keeps the record, restores the balance, hides the receipt and is audited", async () => {
  const f = await withFee({ total: "1000" });
  const p = await pay(f.feePlanId, "400");
  const token = (await tdb.prepare("SELECT receipt_token t FROM payments WHERE id = ?").get(p.paymentId)).t;

  assert.equal((await voidPayment({ paymentId: p.paymentId, reason: "  " })).reason, "reason_required");
  assert.equal((await voidPayment({ paymentId: "missing", reason: "x" })).reason, "not_found");
  assert.equal((await voidPayment({ paymentId: p.paymentId, reason: "Entered against the wrong student" })).ok, true);
  assert.equal((await voidPayment({ paymentId: p.paymentId, reason: "again" })).reason, "already_voided");

  const row = await tdb.prepare("SELECT * FROM payments WHERE id = ?").get(p.paymentId);
  assert.equal(row.status, "VOIDED");
  assert.equal(row.amount_minor, 40000, "the amount is preserved");
  assert.equal(row.void_reason, "Entered against the wrong student");
  assert.equal(row.voided_by, f.accountant.id);
  assert.equal((await getFeePlanById(f.feePlanId)).paidMinor, 0);
  assert.equal((await getFeePlanById(f.feePlanId)).status, "PENDING");
  assert.equal(await getPaymentForReceipt(p.paymentId), null);
  const detail = await getFeeDetail(f.feePlanId);
  assert.equal(detail.payments.length, 1, "history keeps the voided row");
  assert.ok(detail.history.some((h) => h.action === "PAYMENT_VOIDED"));
  await signIn(f.student);
  assert.equal(await getMyReceipt(token), null);
  assert.equal((await getMyFees())[0].payments.length, 0);
});

test("fee edits can't go below what is paid; cancelling is blocked once payments exist; history is preserved", async () => {
  const f = await withFee({ total: "1000" });
  await pay(f.feePlanId, "600");
  assert.equal((await updateFee({ feePlanId: f.feePlanId, total: "500", discount: "0", dueDate: "", note: "" })).reason, "below_paid");
  assert.equal((await updateFee({ feePlanId: f.feePlanId, total: "1500", discount: "100", dueDate: "2031-01-01", note: "revised" })).ok, true);
  const plan = await getFeePlanById(f.feePlanId);
  assert.equal(plan.netMinor, 140000);
  assert.equal(plan.outstandingMinor, 80000);
  assert.equal((await cancelFee({ feePlanId: f.feePlanId, reason: "oops" })).reason, "has_payments");

  const clean = await withFee({ total: "200" });
  assert.equal((await cancelFee({ feePlanId: clean.feePlanId, reason: "" })).reason, "reason_required");
  assert.equal((await cancelFee({ feePlanId: clean.feePlanId, reason: "Enrollment withdrawn" })).ok, true);
  const cancelled = await getFeePlanById(clean.feePlanId);
  assert.equal(cancelled.status, "CANCELLED");
  assert.equal(cancelled.totalMinor, 20000, "the record and amounts are kept");
  assert.equal((await pay(clean.feePlanId, "10")).reason, "cancelled");
  assert.equal((await updateFee({ feePlanId: clean.feePlanId, total: "1", discount: "0", dueDate: "", note: "" })).reason, "cancelled");

  const actions = (await tdb.prepare("SELECT action FROM audit_log WHERE entity_id = ? ORDER BY seq").all(f.feePlanId)).map((r) => r.action);
  assert.deepEqual(actions, ["FEE_PLAN_CREATED", "FEE_PLAN_UPDATED"]);
});

test("fees survive an enrollment cancellation (financial history is preserved)", async () => {
  const f = await withFee({ total: "800" });
  await pay(f.feePlanId, "300");
  await signIn(await makeUser("ADMIN", "canceller"));
  assert.equal((await setEnrollmentStatus(f.enrollmentId, "CANCELLED")).ok, true);
  const plan = await getFeePlanById(f.feePlanId);
  assert.equal(plan.paidMinor, 30000);
  assert.equal((await tdb.prepare("SELECT COUNT(*) AS c FROM payments WHERE fee_plan_id = ?").get(f.feePlanId)).c, 1);
});

// ------------------------------------------------------------------ gateway
test("webhook signature verification: valid, tampered, malformed and unconfigured", () => {
  const secret = "test-only-secret";
  const body = JSON.stringify({ id: "evt_1", amount: "100.00" });
  const good = crypto.createHmac("sha256", secret).update(body).digest("hex");
  assert.equal(verifyWebhookSignature(body, good, secret), true);
  assert.equal(verifyWebhookSignature(body + " ", good, secret), false, "tampered body");
  assert.equal(verifyWebhookSignature(body, good.replace(/.$/, "0"), secret), false, "wrong signature");
  assert.equal(verifyWebhookSignature(body, "short", secret), false);
  assert.equal(verifyWebhookSignature(body, "zz".repeat(32), secret), false);
  assert.equal(verifyWebhookSignature(body, good, ""), false, "no secret configured");
  assert.equal(verifyWebhookSignature(null, good, secret), false);
  assert.equal(isGatewayConfigured(), false, "no gateway is configured in this project");
});

test("gateway confirmations (fake provider fixtures) are idempotent, validated and distinct from manual payments", async () => {
  const f = await withFee({ total: "1000" });
  const evt = { provider: "fixture-provider", eventId: "evt_100", providerReference: "txn_100", feePlanId: f.feePlanId, amount: "400", currency: "INR", paidOn: today };

  const first = await confirmGatewayPayment(evt);
  assert.equal(first.ok, true);
  const row = await tdb.prepare("SELECT * FROM payments WHERE provider_reference = 'txn_100'").get();
  assert.equal(row.source, "GATEWAY");
  assert.equal(row.status, "VERIFIED");
  assert.ok(row.verified_at);
  assert.equal(row.recorded_by, null);
  assert.equal((await getFeePlanById(f.feePlanId)).paidMinor, 40000);

  // replay of the same event / same provider reference: still one payment
  assert.equal((await confirmGatewayPayment(evt)).duplicate, true);
  assert.equal((await confirmGatewayPayment({ ...evt, eventId: "evt_100_retry" })).duplicate, true);
  assert.equal((await tdb.prepare("SELECT COUNT(*) AS c FROM payments WHERE provider_reference = 'txn_100'").get()).c, 1);
  assert.equal((await getFeePlanById(f.feePlanId)).paidMinor, 40000);

  // invalid events change nothing
  const before = await count("payments");
  assert.equal((await confirmGatewayPayment({ ...evt, eventId: "e2", providerReference: "t2", currency: "USD" })).reason, "currency_mismatch");
  assert.equal((await confirmGatewayPayment({ ...evt, eventId: "e3", providerReference: "t3", amount: "abc" })).reason, "invalid_amount");
  assert.equal((await confirmGatewayPayment({ ...evt, eventId: "e4", providerReference: "t4", amount: "-5" })).reason, "invalid_amount");
  assert.equal((await confirmGatewayPayment({ ...evt, eventId: "e5", providerReference: "t5", feePlanId: "nope" })).reason, "unknown_fee");
  assert.equal((await confirmGatewayPayment({ ...evt, eventId: "e6", providerReference: "t6", amount: "600.01" })).reason, "exceeds_outstanding");
  assert.equal((await confirmGatewayPayment({ ...evt, eventId: "", providerReference: "t7" })).reason, "invalid_event");
  assert.equal(await count("payments"), before);

  // out-of-order delivery: a later event can land first without breaking the balance
  assert.equal((await confirmGatewayPayment({ ...evt, eventId: "evt_103", providerReference: "txn_103", amount: "300" })).ok, true);
  assert.equal((await confirmGatewayPayment({ ...evt, eventId: "evt_102", providerReference: "txn_102", amount: "300" })).ok, true);
  assert.equal((await getFeePlanById(f.feePlanId)).status, "PAID");
  assert.equal((await confirmGatewayPayment({ ...evt, eventId: "evt_104", providerReference: "txn_104", amount: "1" })).reason, "already_paid");
});

// -------------------------------------------------------------- list / search
test("fee list: search, derived-status and course filters, sort, pagination; injection is inert", async () => {
  await signIn(await makeUser("ACCOUNTANT", "lister"));
  const tag = `fq${crypto.randomUUID().slice(0, 6)}`;
  const ids = [];
  for (let i = 0; i < 22; i += 1) {
    const { batchA } = ensureSecondBatch();
    const s = await makeUser("STUDENT", `${tag}-${String(i).padStart(2, "0")}`);
    await signIn(await makeUser("ADMIN", "e"));
    const e = await createEnrollment({ studentUserId: s.id, courseSlug: batchA.courseSlug, batchId: batchA.id });
    await signIn(await makeUser("ACCOUNTANT", "lister"));
    const fee = await assignFee({ enrollmentId: e.enrollmentId, currency: "INR", total: String(1000 + i), discount: "", dueDate: i < 3 ? yesterday : "", note: "" });
    ids.push(fee.feePlanId);
  }
  await pay(ids[5], "1005"); // PAID
  await pay(ids[6], "10"); // PARTIALLY_PAID

  const p = (o) => parseFeeParams({ q: tag, ...o });
  const all = await getFeesPage(p({}));
  assert.equal(all.total, 22);
  assert.equal(all.rows.length, 20);
  assert.equal(all.totalPages, 2);
  assert.equal((await getFeesPage(p({ page: "2" }))).rows.length, 2);
  assert.equal((await getFeesPage(p({ status: "PAID" }))).total, 1);
  assert.equal((await getFeesPage(p({ status: "PARTIALLY_PAID" }))).total, 1);
  assert.equal((await getFeesPage(p({ status: "OVERDUE" }))).total, 3);
  assert.equal((await getFeesPage(p({ status: "PENDING" }))).total, 17);
  assert.equal((await getFeesPage(p({ course: "no-such-course" }))).total, 0);
  const byBalance = await getFeesPage(p({ sort: "outstanding" }));
  assert.ok(byBalance.rows[0].outstandingMinor >= byBalance.rows[1].outstandingMinor);
  const names = (await getFeesPage(p({ sort: "name" }))).rows.map((r) => r.studentName.toLowerCase());
  assert.deepEqual(names, [...names].sort());

  const before = await count("fee_plans");
  for (const evil of ["' OR 1=1 --", "'; DROP TABLE fee_plans; --", "%", "_"]) {
    const r = await getFeesPage(parseFeeParams({ q: evil, status: evil, course: evil, sort: evil }));
    if (["%", "_"].includes(evil)) {
      // wildcards are literal: only rows that really contain the character match
      for (const row of r.rows) assert.ok(`${row.studentName} ${row.studentEmail}`.includes(evil), `${evil} matched ${row.studentName}`);
    } else {
      assert.equal(r.total, 0, evil);
    }
  }
  assert.equal(await count("fee_plans"), before);
  const summary = await getFeeSummary();
  assert.ok(summary.paidMinor >= 100500 + 1000);
});

test("fee screens never carry credentials or tokens", async () => {
  const f = await withFee({ total: "800" });
  await pay(f.feePlanId, "100");
  const dump = JSON.stringify([await getFeeDetail(f.feePlanId), await getFeesPage(parseFeeParams({}))]);
  for (const secret of ["password_hash", "passwordHash", "$2b$", "$2a$", "token_hash", "tokenHash"]) {
    assert.ok(!dump.includes(secret), secret);
  }
});
