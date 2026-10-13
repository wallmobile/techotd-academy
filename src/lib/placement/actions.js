"use server";

// Placement Server Actions (Phase 10.6). Staff actions delegate to
// src/lib/placement/service.js (PLACEMENT_ROLES, re-checked per call);
// student actions delegate to src/lib/student/jobs.js (session student only).
// Ids and statuses in forms are untrusted input.

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createJob, updateJob, setJobStatus, updateApplicationStatus, confirmPlacement } from "@/lib/placement/service";
import { applyToJob, withdrawApplication } from "@/lib/student/jobs";

function field(formData, name) {
  const value = formData.get(name);
  return typeof value === "string" ? value : "";
}

function jobFields(formData) {
  return {
    title: field(formData, "title"),
    companyName: field(formData, "companyName"),
    description: field(formData, "description"),
    location: field(formData, "location"),
    employmentType: field(formData, "employmentType"),
    workMode: field(formData, "workMode"),
    experience: field(formData, "experience"),
    skills: field(formData, "skills"),
    applyDeadline: field(formData, "applyDeadline"),
  };
}

function revalidateJob(jobId) {
  revalidatePath("/admin/jobs");
  if (jobId) revalidatePath(`/admin/jobs/${jobId}`);
  revalidatePath("/student/jobs");
  if (jobId) revalidatePath(`/student/jobs/${jobId}`);
  revalidatePath("/student/jobs/applications");
}

export async function createJobAction(_prev, formData) {
  const values = jobFields(formData);
  const result = await createJob(values);
  if (!result.ok) return { status: "error", formError: result.message, values };
  revalidateJob(result.jobId);
  redirect(`/admin/jobs/${result.jobId}`);
}

export async function updateJobAction(_prev, formData) {
  const result = await updateJob(field(formData, "jobId"), jobFields(formData));
  if (!result.ok) return { status: "error", formError: result.message };
  revalidateJob(result.jobId);
  return { status: "success", message: "Job updated." };
}

export async function setJobStatusAction(_prev, formData) {
  const result = await setJobStatus(field(formData, "jobId"), field(formData, "status"));
  if (!result.ok) return { status: "error", formError: result.message };
  revalidateJob(result.jobId);
  return { status: "success", message: "Job status updated." };
}

export async function updateApplicationStatusAction(_prev, formData) {
  const result = await updateApplicationStatus({
    applicationId: field(formData, "applicationId"),
    status: field(formData, "status"),
    notes: field(formData, "notes"),
  });
  if (!result.ok) return { status: "error", formError: result.message };
  revalidateJob(result.jobId);
  return { status: "success", message: "Application updated." };
}

export async function confirmPlacementAction(_prev, formData) {
  const result = await confirmPlacement({ applicationId: field(formData, "applicationId"), note: field(formData, "note") });
  if (!result.ok) return { status: "error", formError: result.message };
  revalidateJob(result.jobId);
  return { status: "success", message: "Placement confirmed." };
}

export async function applyAction(_prev, formData) {
  const result = await applyToJob({ jobId: field(formData, "jobId"), coverMessage: field(formData, "coverMessage") });
  if (!result.ok) return { status: "error", formError: result.message };
  revalidateJob(result.jobId);
  return { status: "success", message: "Your application has been submitted." };
}

export async function withdrawAction(_prev, formData) {
  const result = await withdrawApplication({ applicationId: field(formData, "applicationId") });
  if (!result.ok) return { status: "error", formError: result.message };
  revalidatePath("/student/jobs", "layout");
  revalidatePath("/admin/jobs", "layout");
  return { status: "success", message: "Application withdrawn." };
}
