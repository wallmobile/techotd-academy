"use server";

// Course & batch Server Actions (Phase 10.11). They only translate form fields
// into the guarded domain functions (src/lib/admin/courses.js / batches.js),
// which authorize the caller from the session and validate every value. Form
// values are echoed back on error (never anything secret) so a failed submit
// doesn't lose what the admin typed.

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createCourse, updateCourse, setCourseStatus } from "@/lib/admin/courses";
import { createBatch, updateBatch, setBatchStatus, assignTrainerToBatchAdmin, removeTrainerFromBatch } from "@/lib/admin/batches";

function field(formData, name) {
  const value = formData.get(name);
  return typeof value === "string" ? value : "";
}

function courseValues(formData) {
  return {
    slug: field(formData, "slug"),
    title: field(formData, "title"),
    shortDescription: field(formData, "shortDescription"),
    description: field(formData, "description"),
    categorySlug: field(formData, "categorySlug"),
    level: field(formData, "level"),
    duration: field(formData, "duration"),
    durationBand: field(formData, "durationBand"),
    modes: formData.getAll("modes").filter((m) => typeof m === "string"),
    technologies: field(formData, "technologies"),
    prerequisites: field(formData, "prerequisites"),
    outcomes: field(formData, "outcomes"),
    status: field(formData, "status"),
  };
}

function batchValues(formData) {
  return {
    courseSlug: field(formData, "courseSlug"),
    mode: field(formData, "mode"),
    schedule: field(formData, "schedule"),
    startsOn: field(formData, "startsOn"),
    endsOn: field(formData, "endsOn"),
    status: field(formData, "status"),
    location: field(formData, "location"),
  };
}

function refreshCourses(slug) {
  revalidatePath("/admin/courses");
  if (slug) revalidatePath(`/admin/courses/${slug}`);
  revalidatePath("/admin/batches");
  revalidatePath("/admin");
}

function refreshBatches(batchId) {
  revalidatePath("/admin/batches");
  if (batchId) revalidatePath(`/admin/batches/${batchId}`);
  revalidatePath("/admin/courses", "layout");
  revalidatePath("/admin/trainers", "layout");
  revalidatePath("/admin");
}

const errorState = (result, values) => ({ status: "error", errors: result.errors ?? {}, formError: result.errors ? null : result.message, values });

export async function createCourseAction(_prev, formData) {
  const values = courseValues(formData);
  const result = await createCourse(values);
  if (!result.ok) return errorState(result, values);
  refreshCourses(result.slug);
  redirect(`/admin/courses/${result.slug}`);
}

export async function updateCourseAction(_prev, formData) {
  const values = courseValues(formData);
  const result = await updateCourse(values.slug, values);
  if (!result.ok) return errorState(result, values);
  refreshCourses(result.slug);
  return { status: "success", message: result.unchanged ? "No changes to save." : "Course saved.", errors: {}, values };
}

export async function setCourseStatusAction(_prev, formData) {
  const result = await setCourseStatus(field(formData, "slug"), field(formData, "status"));
  if (!result.ok) return { status: "error", formError: result.message };
  refreshCourses(result.slug);
  if (result.unchanged) return { status: "success", message: "The course already has that status." };
  return {
    status: "success",
    message:
      result.status === "PUBLISHED"
        ? "Course published. It is now visible on the public site."
        : `Course unpublished. It is hidden from the public site and from new enrollments; ${result.activeEnrollments} active enrollment(s) are unaffected.`,
  };
}

export async function createBatchAction(_prev, formData) {
  const values = batchValues(formData);
  const result = await createBatch(values);
  if (!result.ok) return errorState(result, values);
  refreshBatches(result.batchId);
  redirect(`/admin/batches/${result.batchId}`);
}

export async function updateBatchAction(_prev, formData) {
  const values = { batchId: field(formData, "batchId"), ...batchValues(formData) };
  const result = await updateBatch(values.batchId, values);
  if (!result.ok) return errorState(result, values);
  refreshBatches(result.batchId);
  return { status: "success", message: result.unchanged ? "No changes to save." : "Batch saved.", errors: {}, values };
}

export async function setBatchStatusAction(_prev, formData) {
  const result = await setBatchStatus(field(formData, "batchId"), field(formData, "status"));
  if (!result.ok) return { status: "error", formError: result.message };
  refreshBatches(result.batchId);
  return { status: "success", message: result.unchanged ? "The batch already has that status." : `Batch status set to ${result.status}.` };
}

export async function assignTrainerAction(_prev, formData) {
  const result = await assignTrainerToBatchAdmin(field(formData, "batchId"), field(formData, "trainerId"));
  if (!result.ok) return { status: "error", formError: result.message };
  refreshBatches(result.batchId);
  return { status: "success", message: "Trainer assigned." };
}

export async function removeTrainerAction(_prev, formData) {
  const result = await removeTrainerFromBatch(field(formData, "batchId"), field(formData, "trainerId"));
  if (!result.ok) return { status: "error", formError: result.message };
  refreshBatches(result.batchId);
  return { status: "success", message: "Trainer removed from this batch." };
}
