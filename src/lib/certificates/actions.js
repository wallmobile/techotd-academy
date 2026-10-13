"use server";

// Certificate Server Actions (Phase 10.5). Delegate to
// src/lib/certificates/service.js, which authorizes the caller from the
// session (ADMIN / SUPER_ADMIN) and re-validates eligibility itself; the
// enrollment id and mode in the form are untrusted input.

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { issueCertificate, revokeCertificate } from "@/lib/certificates/service";

function field(formData, name) {
  const value = formData.get(name);
  return typeof value === "string" ? value : "";
}

function revalidateCertificates(certificateId) {
  revalidatePath("/admin/certificates");
  if (certificateId) revalidatePath(`/admin/certificates/${certificateId}`);
  revalidatePath("/student/certificates");
}

export async function issueCertificateAction(_prev, formData) {
  const result = await issueCertificate({
    enrollmentId: field(formData, "enrollmentId"),
    mode: field(formData, "mode"),
    approvalNote: field(formData, "approvalNote"),
  });
  if (!result.ok) return { status: "error", formError: result.message };
  revalidateCertificates(result.certificateId);
  redirect(`/admin/certificates/${result.certificateId}`);
}

export async function revokeCertificateAction(_prev, formData) {
  const result = await revokeCertificate({ certificateId: field(formData, "certificateId"), reason: field(formData, "reason") });
  if (!result.ok) return { status: "error", formError: result.message };
  revalidateCertificates(result.certificateId);
  return { status: "success", message: "Certificate revoked. The record is kept." };
}
