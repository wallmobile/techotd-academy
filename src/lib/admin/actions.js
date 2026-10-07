"use server";

// Admin Server Actions (Phase 10.1). Each one: (1) derives the caller from
// the session inside the domain function (getAdminContext) — a non-admin
// invoking the action directly gets a generic refusal and nothing is
// written; (2) validates input; (3) performs the write; (4) revalidates
// affected routes; (5) returns a safe result. userId/trainerId/batchId in
// the form are TARGETS to validate against the database, never proof of
// authorization, and the new account's role is fixed server-side.

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getAdminContext } from "@/lib/admin/context";
import { createTrainerAccount, assignTrainerToBatch } from "@/lib/admin/trainers";
import { setUserStatus } from "@/lib/admin/users";
import { validateCreateTrainerForm } from "@/lib/validateAdmin";

const FORBIDDEN = "You don't have permission to do that.";

function fieldValues(formData, fields) {
  return Object.fromEntries(fields.map((field) => [field, String(formData.get(field) ?? "")]));
}

export async function createTrainerAction(_prevState, formData) {
  // Password is never echoed back in `values`.
  const values = fieldValues(formData, ["name", "email", "phone", "password"]);
  const safeValues = { name: values.name, email: values.email, phone: values.phone };

  if (!(await getAdminContext())) return { status: "error", errors: {}, formError: FORBIDDEN, values: safeValues };

  const errors = validateCreateTrainerForm(values);
  if (Object.keys(errors).length > 0) return { status: "error", errors, values: safeValues };

  const result = await createTrainerAccount({
    name: values.name.trim(),
    email: values.email.trim(),
    phone: values.phone.trim(),
    password: values.password,
  });

  if (!result.ok) {
    return {
      status: "error",
      errors: result.reason === "duplicate_email" ? { email: "An account with this email already exists." } : {},
      formError: result.reason === "forbidden" ? FORBIDDEN : result.reason === "duplicate_email" ? null : "Could not create the trainer.",
      values: safeValues,
    };
  }

  revalidatePath("/admin/trainers");
  revalidatePath("/admin/users");
  revalidatePath("/admin");
  redirect(`/admin/trainers/${result.user.id}`);
}

const ASSIGN_MESSAGES = {
  forbidden: FORBIDDEN,
  trainer_not_found: "That trainer no longer exists.",
  batch_not_found: "Please choose a valid batch.",
  already_assigned: "This trainer is already assigned to that batch.",
};

export async function assignTrainerBatchAction(_prevState, formData) {
  const { trainerId, batchId } = fieldValues(formData, ["trainerId", "batchId"]);
  const result = await assignTrainerToBatch(trainerId, batchId);

  if (!result.ok) {
    return { status: "error", formError: ASSIGN_MESSAGES[result.reason] || "Could not assign the batch." };
  }

  revalidatePath(`/admin/trainers/${result.trainerId}`);
  revalidatePath("/admin/trainers");
  revalidatePath("/trainer");
  return { status: "success", message: "Batch assigned." };
}

export async function setUserStatusAction(_prevState, formData) {
  const { userId, status } = fieldValues(formData, ["userId", "status"]);
  const result = await setUserStatus(userId, status);

  if (!result.ok) return { status: "error", formError: result.reason || FORBIDDEN };

  revalidatePath(`/admin/users/${result.userId}`);
  revalidatePath("/admin/users");
  revalidatePath("/admin/students");
  revalidatePath("/admin/trainers");
  revalidatePath("/admin");
  return { status: "success", message: `Account status set to ${result.status}.` };
}
