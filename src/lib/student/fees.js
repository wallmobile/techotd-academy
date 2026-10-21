// Student fee view (Phase 10.4). Identity is the session user only — there
// is no student/user id parameter anywhere in this file. Students get a
// read-only view of their own fee plans and counted payments; voided rows
// and internal fields (who recorded, audit history, notes) are not exposed.

import { getCurrentUser } from "@/lib/auth/currentUser";
import { listFeePlansForStudent, listPaymentsForPlan, getPaymentByReceiptToken, getFeePlanById } from "@/lib/db/fees";
import { getBatch, getCourse } from "@/lib/catalog";

async function describe(plan) {
  const batch = await getBatch(plan.batchId);
  return {
    id: plan.id,
    courseTitle: (await getCourse(plan.courseSlug))?.title ?? plan.courseSlug,
    batchLabel: batch ? `${batch.mode} — ${batch.startDate}` : plan.batchId,
    currency: plan.currency,
    totalMinor: plan.totalMinor,
    discountMinor: plan.discountMinor,
    netMinor: plan.netMinor,
    paidMinor: plan.paidMinor,
    outstandingMinor: plan.outstandingMinor,
    dueDate: plan.dueDate,
    status: plan.status,
  };
}

function publicPayment(p) {
  return {
    id: p.id,
    amountMinor: p.amountMinor,
    currency: p.currency,
    method: p.method,
    source: p.source,
    status: p.status,
    paidOn: p.paidOn,
    receiptNumber: p.receiptNumber,
    receiptToken: p.receiptToken,
  };
}

export async function getMyFees() {
  const user = await getCurrentUser();
  if (!user || user.role !== "STUDENT") return [];
  return await Promise.all((await listFeePlansForStudent(user.id)).map(async (plan) => ({
    ...await describe(plan),
    payments: (await listPaymentsForPlan(plan.id))
      .filter((p) => p.status !== "VOIDED")
      .map(publicPayment),
  })));
}

// null for "doesn't exist", "isn't yours" and "was voided" alike.
export async function getMyReceipt(token) {
  const user = await getCurrentUser();
  if (!user || user.role !== "STUDENT") return null;
  const payment = await getPaymentByReceiptToken(token);
  if (!payment || payment.status === "VOIDED") return null;
  const plan = await getFeePlanById(payment.feePlanId);
  if (!plan || plan.studentUserId !== user.id) return null;
  return { student: { name: user.name }, plan: await describe(plan), payment: publicPayment(payment) };
}
