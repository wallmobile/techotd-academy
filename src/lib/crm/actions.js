"use server";

// CRM Server Actions (Phase 10.2). Each one delegates to a domain function
// that derives the caller from the session and enforces the CRM access
// policy; leadId / status / target user in the form are values to VALIDATE
// against the database, never proof of authorization. Unauthorized calls
// return a generic refusal and write nothing.

import { revalidatePath } from "next/cache";
import { updateLeadStatus, markLeadContacted, assignLead, addNote } from "@/lib/crm/leads";

function field(formData, name) {
  const value = formData.get(name);
  return typeof value === "string" ? value : "";
}

function finish(result, message) {
  if (!result.ok) return { status: "error", formError: result.reason || "Something went wrong." };
  revalidatePath(`/admin/leads/${result.leadId}`);
  revalidatePath("/admin/leads");
  return { status: "success", message };
}

export async function updateLeadStatusAction(_prev, formData) {
  return finish(await updateLeadStatus(field(formData, "leadId"), field(formData, "status")), "Status updated.");
}

export async function markLeadContactedAction(_prev, formData) {
  return finish(await markLeadContacted(field(formData, "leadId")), "Marked as contacted.");
}

export async function assignLeadAction(_prev, formData) {
  return finish(await assignLead(field(formData, "leadId"), field(formData, "assignedTo")), "Assignment updated.");
}

export async function addLeadNoteAction(_prev, formData) {
  return finish(await addNote(field(formData, "leadId"), field(formData, "note")), "Note added.");
}
