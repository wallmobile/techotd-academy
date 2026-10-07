"use server";

// Server Actions for trainer assignment management (Phase 9.2). Both
// delegate ownership checking to createManagedAssignment() /
// updateManagedAssignment() in src/lib/trainer/assignments.js — this file
// only handles form parsing/validation/redirects.

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createManagedAssignment, updateManagedAssignment } from "@/lib/trainer/assignments";
import { validateTrainerAssignmentForm } from "@/lib/validateTrainerAssignment";

function fieldValues(formData, fields) {
  return Object.fromEntries(fields.map((field) => [field, formData.get(field) ?? ""]));
}

const FORM_FIELDS = ["courseSlug", "batchId", "title", "description", "dueAt"];

export async function createAssignmentAction(_prevState, formData) {
  const values = fieldValues(formData, FORM_FIELDS);

  const errors = validateTrainerAssignmentForm(values);
  if (Object.keys(errors).length > 0) {
    return { status: "error", errors, values };
  }

  const result = await createManagedAssignment({
    courseSlug: values.courseSlug,
    batchId: values.batchId || null,
    title: values.title.trim(),
    description: values.description.trim(),
    dueAt: values.dueAt || null,
    status: "DRAFT",
  });

  if (!result.ok) {
    return { status: "error", errors: {}, formError: "You can only create assignments for your own courses.", values };
  }

  revalidatePath("/trainer/assignments");
  redirect(`/trainer/assignments/${result.assignment.id}`);
}

const EDIT_FORM_FIELDS = [...FORM_FIELDS, "status", "assignmentId"];

export async function updateAssignmentAction(_prevState, formData) {
  const values = fieldValues(formData, EDIT_FORM_FIELDS);

  const errors = validateTrainerAssignmentForm(values);
  if (Object.keys(errors).length > 0) {
    return { status: "error", errors, values };
  }

  const result = await updateManagedAssignment(values.assignmentId, {
    title: values.title.trim(),
    description: values.description.trim(),
    dueAt: values.dueAt || null,
    status: values.status,
    batchId: values.batchId || null,
  });

  if (!result.ok) {
    return { status: "error", errors: {}, formError: "You don't have access to this assignment.", values };
  }

  // So a PUBLISHED status change is immediately visible on the student's
  // assignments list (same assignments table, filtered to
  // PUBLISHED/CLOSED there) rather than only after the next full reload.
  revalidatePath(`/trainer/assignments/${values.assignmentId}`);
  revalidatePath("/trainer/assignments");
  revalidatePath("/student/assignments");
  revalidatePath(`/student/assignments/${values.assignmentId}`);

  return { status: "success", message: "Assignment updated." };
}
