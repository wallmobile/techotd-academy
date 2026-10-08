"use server";

// Enrollment Server Actions (Phase 10.3). Delegates to
// src/lib/admin/enrollments.js, which authorizes the caller from the
// session and validates student / course / batch / status independently of
// anything the form claims.

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createEnrollment, setEnrollmentStatus } from "@/lib/admin/enrollments";

function field(formData, name) {
  const value = formData.get(name);
  return typeof value === "string" ? value : "";
}

function revalidateAll(studentUserId, enrollmentId) {
  revalidatePath("/admin/enrollments");
  if (enrollmentId) revalidatePath(`/admin/enrollments/${enrollmentId}`);
  if (studentUserId) revalidatePath(`/admin/students/${studentUserId}`);
  revalidatePath("/admin");
  // The student's and trainers' own views read the same tables.
  revalidatePath("/student", "layout");
  revalidatePath("/trainer", "layout");
}

export async function createEnrollmentAction(_prev, formData) {
  const values = {
    studentId: field(formData, "studentId"),
    course: field(formData, "course"),
    batch: field(formData, "batch"),
  };
  const result = await createEnrollment({ studentUserId: values.studentId, courseSlug: values.course, batchId: values.batch });
  if (!result.ok) return { status: "error", formError: result.message, values };

  revalidateAll(result.studentUserId, result.enrollmentId);
  redirect(`/admin/enrollments/${result.enrollmentId}`);
}

export async function setEnrollmentStatusAction(_prev, formData) {
  const result = await setEnrollmentStatus(field(formData, "enrollmentId"), field(formData, "status"));
  if (!result.ok) return { status: "error", formError: result.message };

  revalidateAll(result.studentUserId, result.enrollmentId);
  return { status: "success", message: "Enrollment status updated." };
}
