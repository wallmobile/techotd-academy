"use server";

// Server Actions for trainer class-session management (Phase 9.2). Both
// re-derive the trainer from the session and re-verify batch ownership
// server-side on every call — never trust a batchId/classSessionId a
// form merely included (spec Step 4).

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getTrainerContext } from "@/lib/trainer/context";
import { createClassSession, updateClassSession, getClassSessionById } from "@/lib/db/classSessions";
import { validateClassSessionForm } from "@/lib/validateClassSession";

function fieldValues(formData, fields) {
  return Object.fromEntries(fields.map((field) => [field, formData.get(field) ?? ""]));
}

const FORM_FIELDS = ["batchId", "title", "sessionDate", "startTime", "endTime", "meetingUrl", "location"];

export async function createClassSessionAction(_prevState, formData) {
  const values = fieldValues(formData, FORM_FIELDS);

  const ctx = await getTrainerContext();
  if (!ctx) {
    return { status: "error", errors: {}, formError: "You need to be signed in as a trainer to do this.", values };
  }

  // Ownership: the submitted batchId must be one of THIS trainer's own
  // assigned batches — never trusted merely because the form included it.
  if (!ctx.batchIds.includes(values.batchId)) {
    return { status: "error", errors: {}, formError: "You can only schedule classes for your assigned batches.", values };
  }

  const errors = validateClassSessionForm(values);
  if (Object.keys(errors).length > 0) {
    return { status: "error", errors, values };
  }

  const session = await createClassSession({
    batchId: values.batchId,
    title: values.title.trim(),
    sessionDate: values.sessionDate,
    startTime: values.startTime,
    endTime: values.endTime,
    meetingUrl: values.meetingUrl.trim(),
    location: values.location.trim(),
  });

  revalidatePath("/trainer/schedule");
  revalidatePath("/student/schedule");
  redirect(`/trainer/classes/${session.id}`);
}

const EDIT_FORM_FIELDS = [...FORM_FIELDS, "status", "classSessionId"];

export async function updateClassSessionAction(_prevState, formData) {
  const values = fieldValues(formData, EDIT_FORM_FIELDS);

  const ctx = await getTrainerContext();
  if (!ctx) {
    return { status: "error", errors: {}, formError: "You need to be signed in as a trainer to do this.", values };
  }

  // Re-verify ownership from the DATABASE, not from the batchId in the
  // form: load the session's real, currently-stored batchId and check
  // THAT against this trainer's assignments, so a forged/edited batchId
  // in the submitted form can't move a session outside the batch it
  // actually belongs to, or grant access it doesn't have.
  const existing = await getClassSessionById(values.classSessionId);
  if (!existing || !ctx.batchIds.includes(existing.batchId)) {
    return { status: "error", errors: {}, formError: "You don't have access to this class session.", values };
  }

  // The edit form never submits a batchId (a session's batch doesn't
  // move once scheduled — see the form's read-only "Batch" label), so
  // this validation pass doesn't require one, unlike creation.
  const errors = validateClassSessionForm(values, { requireBatch: false });
  if (Object.keys(errors).length > 0) {
    return { status: "error", errors, values };
  }

  await updateClassSession(existing.id, {
    title: values.title.trim(),
    sessionDate: values.sessionDate,
    startTime: values.startTime,
    endTime: values.endTime,
    meetingUrl: values.meetingUrl.trim(),
    location: values.location.trim(),
    status: values.status,
  });

  // So the page's server-rendered title/date/etc. (and the student
  // schedule reading the same table) reflect the change immediately,
  // rather than only after the next full navigation.
  revalidatePath(`/trainer/classes/${existing.id}`);
  revalidatePath("/trainer/schedule");
  revalidatePath("/student/schedule");

  return { status: "success", message: "Class session updated." };
}
