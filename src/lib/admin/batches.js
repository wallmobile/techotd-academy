// Admin batch management (Phase 10.11). Same rules as courses.js: the caller is
// derived from the session, every id is validated against the catalog and the
// database, and nothing is deleted. A batch's course is fixed at creation
// (enrollments, fees and attendance reference the batch id); closing or
// archiving a batch only changes its status, so all enrollment history stays.

import { getAdminContext } from "@/lib/admin/context";
import { isUniqueViolation } from "@/lib/db/client";
import { listBatches, getBatch, getCourse, listCourses } from "@/lib/catalog";
import {
  insertCustomBatch,
  saveBatchEdits,
  assignTrainer,
  unassignTrainer,
  listTrainersForBatch,
  listAssignableTrainers,
  getBatchEnrollmentSummary,
  listBatchEnrollmentsPreview,
  listAuditForEntity,
} from "@/lib/db/catalog";
import { getUserRow } from "@/lib/db/adminQueries";
import { validateBatchInput } from "@/lib/validateCatalog";
import { BATCH_STATUSES, BATCH_MODES, CATALOG_PAGE_SIZE } from "@/constants/catalog";

const FORBIDDEN = { ok: false, reason: "forbidden", message: "You don't have permission to do that." };
const EMPTY_PAGE = { rows: [], page: 1, totalPages: 1, pageSize: CATALOG_PAGE_SIZE, total: 0 };

export const BATCH_MESSAGES = {
  not_found: "Batch not found.",
  course_invalid: "Please choose a valid course.",
  invalid: "Please fix the highlighted fields.",
  duplicate_batch: "A batch for this course with the same mode, start date and schedule already exists.",
  archive_blocked: "This batch still has active enrollments. Complete or cancel them before archiving the batch.",
  status_invalid: "Please choose a valid status.",
  trainer_invalid: "Please choose a valid, active trainer.",
  batch_archived: "Archived batches can't be assigned to trainers.",
  already_assigned: "That trainer is already assigned to this batch.",
  not_assigned: "That trainer is not assigned to this batch.",
};

const fail = (reason, extra = {}) => ({ ok: false, reason, message: BATCH_MESSAGES[reason], ...extra });

export async function getBatchFormOptions() {
  return {
    courses: (await listCourses()).map((c) => ({ value: c.slug, label: c.status === "PUBLISHED" ? c.title : `${c.title} (unpublished)`, modes: c.modes })),
    modes: BATCH_MODES,
    statuses: BATCH_STATUSES,
  };
}

const SORTERS = {
  start: (a, b) => (a.startsOn < b.startsOn ? 1 : a.startsOn > b.startsOn ? -1 : a.id.localeCompare(b.id)),
  "start-asc": (a, b) => (a.startsOn < b.startsOn ? -1 : a.startsOn > b.startsOn ? 1 : a.id.localeCompare(b.id)),
  course: (a, b) => a.courseTitle.localeCompare(b.courseTitle) || (a.startsOn < b.startsOn ? -1 : 1),
};

// {q, course, status, mode, sort, page}; already whitelisted by parseBatchParams.
export async function getBatchesPage({ q = "", course = "", status = "", mode = "", sort = "start", page = 1 } = {}) {
  if (!(await getAdminContext())) return EMPTY_PAGE;
  const needle = q.trim().toLowerCase();
  const filtered = (await Promise.all((await listBatches())
    .map(async (b) => ({ ...b, courseTitle: (await getCourse(b.courseSlug))?.title ?? b.courseSlug }))))
    .filter((b) => !course || b.courseSlug === course)
    .filter((b) => !status || b.status === status)
    .filter((b) => !mode || b.mode === mode)
    .filter((b) => !needle || [b.courseTitle, b.id, b.schedule, b.location, b.mode].join(" ").toLowerCase().includes(needle))
    .sort(SORTERS[sort] ?? SORTERS.start);

  const total = filtered.length;
  const totalPages = Math.max(1, Math.ceil(total / CATALOG_PAGE_SIZE));
  const current = Math.min(Math.max(1, page || 1), totalPages);
  const rows = await Promise.all(filtered.slice((current - 1) * CATALOG_PAGE_SIZE, current * CATALOG_PAGE_SIZE).map(async (b) => ({
    ...b,
    trainerCount: (await listTrainersForBatch(b.id)).length,
    enrollments: await getBatchEnrollmentSummary(b.id),
  })));
  return { rows, page: current, totalPages, pageSize: CATALOG_PAGE_SIZE, total };
}

// Null for an unknown id.
export async function getBatchDetailForAdmin(id) {
  if (!(await getAdminContext())) return null;
  const batch = await getBatch(id);
  if (!batch) return null;
  return {
    batch,
    course: await getCourse(batch.courseSlug) ?? null,
    trainers: await listTrainersForBatch(batch.id),
    assignableTrainers: batch.status === "Archived" ? [] : await listAssignableTrainers(batch.id),
    enrollments: await getBatchEnrollmentSummary(batch.id),
    enrollmentPreview: await listBatchEnrollmentsPreview(batch.id),
    audit: await listAuditForEntity("batch", batch.id),
  };
}

async function nextBatchId(courseSlug) {
  const prefix = `${courseSlug}-`;
  let max = 0;
  for (const b of await listBatches({ courseSlug })) {
    const m = new RegExp(`^${prefix.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(\\d+)$`).exec(b.id);
    if (m) max = Math.max(max, Number(m[1]));
  }
  return (offset) => `${prefix}${String(max + 1 + offset).padStart(2, "0")}`;
}

async function isDuplicate(courseSlug, value, exceptId) {
  return (await listBatches({ courseSlug })).some(
    (b) => b.id !== exceptId && b.mode === value.mode && b.startsOn === value.startsOn && b.schedule.trim().toLowerCase() === value.schedule.toLowerCase() && b.status !== "Archived"
  );
}

/** Creates a batch for an existing course. The id is generated (course-slug-NN). */
export async function createBatch(raw) {
  const ctx = await getAdminContext();
  if (!ctx) return FORBIDDEN;

  const course = typeof raw.courseSlug === "string" ? await getCourse(raw.courseSlug) : null;
  if (!course) return fail("course_invalid", { errors: { courseSlug: BATCH_MESSAGES.course_invalid } });

  const { errors, value } = validateBatchInput(raw, { course });
  if (Object.keys(errors).length === 0 && await isDuplicate(course.slug, value, null)) errors.schedule = BATCH_MESSAGES.duplicate_batch;
  if (Object.keys(errors).length > 0) return fail("invalid", { errors });
  if (value.status === "Archived") return fail("invalid", { errors: { status: "A new batch can't start as Archived." } });

  const idFor = await nextBatchId(course.slug);
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const id = idFor(attempt);
    try {
      await insertCustomBatch(ctx.user.id, id, { courseSlug: course.slug, ...value });
      return { ok: true, batchId: id };
    } catch (error) {
      // A concurrent create took the id: the primary key decides, try the next number.
      if (!isUniqueViolation(error)) throw error;
    }
  }
  return fail("duplicate_batch");
}

const EDIT_KEYS = ["mode", "schedule", "startsOn", "endsOn", "status", "location"];

/** Edits a batch (course is fixed). Archiving requires that no enrollment is ACTIVE. */
export async function updateBatch(id, raw) {
  const ctx = await getAdminContext();
  if (!ctx) return FORBIDDEN;
  const batch = await getBatch(id);
  if (!batch) return fail("not_found");
  const course = await getCourse(batch.courseSlug);

  const { errors, value } = validateBatchInput(raw, { course, currentMode: batch.mode });
  if (Object.keys(errors).length === 0 && await isDuplicate(batch.courseSlug, value, batch.id)) errors.schedule = BATCH_MESSAGES.duplicate_batch;
  if (Object.keys(errors).length > 0) return fail("invalid", { errors });

  if (value.status === "Archived" && batch.status !== "Archived" && ((await getBatchEnrollmentSummary(batch.id)).ACTIVE ?? 0) > 0) {
    return fail("archive_blocked", { errors: { status: BATCH_MESSAGES.archive_blocked } });
  }

  const changed = EDIT_KEYS.filter((key) => (value[key] ?? "") !== (batch[key] ?? ""));
  if (changed.length === 0) return { ok: true, batchId: batch.id, unchanged: true };

  await saveBatchEdits(ctx.user.id, batch.id, batch.origin, value, changed);
  return { ok: true, batchId: batch.id, changed };
}

/** Quick status change from the batch page (same rules as updateBatch). */
export async function setBatchStatus(id, status) {
  const ctx = await getAdminContext();
  if (!ctx) return FORBIDDEN;
  if (!BATCH_STATUSES.includes(status)) return fail("status_invalid");
  const batch = await getBatch(id);
  if (!batch) return fail("not_found");
  if (batch.status === status) return { ok: true, batchId: batch.id, status, unchanged: true };
  if (status === "Archived" && ((await getBatchEnrollmentSummary(batch.id)).ACTIVE ?? 0) > 0) return fail("archive_blocked");

  await saveBatchEdits(
    ctx.user.id,
    batch.id,
    batch.origin,
    { mode: batch.mode, schedule: batch.schedule, startsOn: batch.startsOn, endsOn: batch.endsOn, status, location: batch.location },
    ["status"]
  );
  return { ok: true, batchId: batch.id, status };
}

/** Assign an ACTIVE trainer to a batch (idempotent; duplicates are reported). */
export async function assignTrainerToBatchAdmin(batchId, trainerUserId) {
  const ctx = await getAdminContext();
  if (!ctx) return FORBIDDEN;
  const batch = await getBatch(batchId);
  if (!batch) return fail("not_found");
  if (batch.status === "Archived") return fail("batch_archived");

  const trainer = typeof trainerUserId === "string" ? await getUserRow(trainerUserId) : null;
  if (!trainer || trainer.role !== "TRAINER" || trainer.status !== "ACTIVE") return fail("trainer_invalid");

  if (!await assignTrainer(ctx.user.id, trainer.id, batch.id)) return fail("already_assigned");
  return { ok: true, batchId: batch.id, trainerId: trainer.id };
}

/** Remove a trainer from a batch. Class, attendance and assignment records are kept. */
export async function removeTrainerFromBatch(batchId, trainerUserId) {
  const ctx = await getAdminContext();
  if (!ctx) return FORBIDDEN;
  const batch = await getBatch(batchId);
  if (!batch) return fail("not_found");
  if (typeof trainerUserId !== "string") return fail("trainer_invalid");
  if (!await unassignTrainer(ctx.user.id, trainerUserId, batch.id)) return fail("not_assigned");
  return { ok: true, batchId: batch.id, trainerId: trainerUserId };
}
