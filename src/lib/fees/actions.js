"use server";

// Fee / payment Server Actions (Phase 10.4). Each delegates to
// src/lib/fees/service.js, which authorizes the caller from the session
// (FINANCE_ROLES) and validates everything; ids and amounts in the form are
// untrusted input. Unauthorized calls return a generic refusal and write
// nothing.

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { assignFee, updateFee, cancelFee, recordManualPayment, voidPayment } from "@/lib/fees/service";

function field(formData, name) {
  const value = formData.get(name);
  return typeof value === "string" ? value : "";
}

function revalidateFee(feePlanId) {
  revalidatePath("/admin/fees");
  if (feePlanId) revalidatePath(`/admin/fees/${feePlanId}`);
  revalidatePath("/student/fees");
}

export async function assignFeeAction(_prev, formData) {
  const values = {
    enrollmentId: field(formData, "enrollmentId"),
    currency: field(formData, "currency"),
    total: field(formData, "total"),
    discount: field(formData, "discount"),
    dueDate: field(formData, "dueDate"),
    note: field(formData, "note"),
  };
  const result = await assignFee(values);
  if (!result.ok) return { status: "error", formError: result.message, values };
  revalidateFee(result.feePlanId);
  redirect(`/admin/fees/${result.feePlanId}`);
}

export async function updateFeeAction(_prev, formData) {
  const result = await updateFee({
    feePlanId: field(formData, "feePlanId"),
    total: field(formData, "total"),
    discount: field(formData, "discount"),
    dueDate: field(formData, "dueDate"),
    note: field(formData, "note"),
  });
  if (!result.ok) return { status: "error", formError: result.message };
  revalidateFee(result.feePlanId);
  return { status: "success", message: "Fee updated." };
}

export async function cancelFeeAction(_prev, formData) {
  const result = await cancelFee({ feePlanId: field(formData, "feePlanId"), reason: field(formData, "reason") });
  if (!result.ok) return { status: "error", formError: result.message };
  revalidateFee(result.feePlanId);
  return { status: "success", message: "Fee cancelled." };
}

export async function recordPaymentAction(_prev, formData) {
  const result = await recordManualPayment({
    feePlanId: field(formData, "feePlanId"),
    amount: field(formData, "amount"),
    method: field(formData, "method"),
    paidOn: field(formData, "paidOn"),
    note: field(formData, "note"),
    idempotencyKey: field(formData, "idempotencyKey"),
  });
  if (!result.ok && result.reason !== "duplicate") return { status: "error", formError: result.message };
  revalidateFee(result.feePlanId);
  return { status: "success", message: result.ok ? `Payment recorded. Receipt ${result.receiptNumber}.` : "This payment was already recorded." };
}

export async function voidPaymentAction(_prev, formData) {
  const result = await voidPayment({ paymentId: field(formData, "paymentId"), reason: field(formData, "reason") });
  if (!result.ok) return { status: "error", formError: result.message };
  revalidateFee(result.feePlanId);
  return { status: "success", message: "Payment voided. The record is kept." };
}
