// Trainer assignment management (Phase 9.2). Same pattern as the rest of
// the trainer domain layer: identity from getCurrentUser() via
// getTrainerContext(), ownership re-derived from the database on every
// call. Reads/writes the SAME assignments/assignment_submissions tables
// the student assignment pages read from — no duplicate model.

import { getTrainerContext, enrichAssignedBatches } from "@/lib/trainer/context";
import {
  listAssignmentsForCourseSlugs,
  getAssignmentById,
  createAssignment,
  updateAssignment,
} from "@/lib/db/assignments";
import { countPendingSubmissionsForAssignmentInBatches } from "@/lib/db/assignmentSubmissions";
import { getBatch, getCourse } from "@/lib/catalog";

export async function getManagedCourseContext() {
  const ctx = await getTrainerContext();
  if (!ctx) return null;

  const assignedBatches = enrichAssignedBatches(ctx.batchIds);
  const courseSlugs = [...new Set(assignedBatches.map((ab) => ab.course.slug))];

  return { ...ctx, assignedBatches, courseSlugs };
}

// Phase 9.4 ownership model (Option B + authorship for course-wide rows):
//
//  - Student data is ALWAYS scoped through the trainer's managed batches
//    (see getReviewBatchIds below) — two trainers teaching the same course
//    never see each other's students' submissions.
//  - A batch-scoped assignment is manageable only by a trainer who manages
//    that batch (and the batch must belong to the assignment's course).
//  - A course-wide assignment (batchId null) is manageable only by the
//    trainer who created it. Rows with no recorded author (created before
//    created_by existed) stay manageable by any trainer of that course —
//    their submissions are still student-scoped, so no other trainer's
//    students are ever exposed.
function isManagedByTrainer(assignment, ctx) {
  if (!ctx.courseSlugs.includes(assignment.courseSlug)) return false;
  if (assignment.batchId) {
    return ctx.assignedBatches.some(
      (ab) => ab.batch.id === assignment.batchId && ab.course.slug === assignment.courseSlug
    );
  }
  return assignment.createdBy === null || assignment.createdBy === ctx.user.id;
}

// The managed batches whose students' submissions this trainer may see
// for this assignment: its own batch when batch-scoped, otherwise every
// batch of the trainer's that teaches the assignment's course.
export function getReviewBatchIds(assignment, ctx) {
  return ctx.assignedBatches
    .filter((ab) => ab.course.slug === assignment.courseSlug)
    .filter((ab) => !assignment.batchId || ab.batch.id === assignment.batchId)
    .map((ab) => ab.batch.id);
}

function batchBelongsToCourse(ctx, batchId, courseSlug) {
  return ctx.assignedBatches.some((ab) => ab.batch.id === batchId && ab.course.slug === courseSlug);
}

// "My Assignments" for the trainer — every assignment (any status,
// unlike the student-facing list) across the courses this trainer
// teaches, enriched with its real course/batch and a live pending-review
// count.
export async function getMyManagedAssignments() {
  const ctx = await getManagedCourseContext();
  if (!ctx) return [];

  const assignments = listAssignmentsForCourseSlugs(ctx.courseSlugs).filter((a) => isManagedByTrainer(a, ctx));

  return assignments.map((assignment) => ({
    ...assignment,
    course: getCourse(assignment.courseSlug),
    batch: assignment.batchId ? getBatch(assignment.batchId) : null,
    pendingReviewCount: countPendingSubmissionsForAssignmentInBatches(assignment.id, getReviewBatchIds(assignment, ctx)),
  }));
}

// Assignment detail for /trainer/assignments/[assignment-id]. Returns
// null for "doesn't exist" AND "exists but isn't one of my
// courses/batches" identically (spec Step 11).
export async function getAssignmentDetailForTrainer(assignmentId) {
  const ctx = await getManagedCourseContext();
  if (!ctx) return null;

  const assignment = getAssignmentById(assignmentId);
  if (!assignment) return null;
  if (!isManagedByTrainer(assignment, ctx)) return null;

  const course = getCourse(assignment.courseSlug);
  if (!course) return null;
  const batch = assignment.batchId ? getBatch(assignment.batchId) : null;

  return { assignment, course, batch, reviewBatchIds: getReviewBatchIds(assignment, ctx) };
}

// The trainer's own courses (derived from assigned batches) for the
// "which course is this assignment for" <select> — never the full course
// catalog.
export async function getMyManagedCourseOptions() {
  const ctx = await getManagedCourseContext();
  if (!ctx) return [];

  const byCourseSlug = new Map();
  for (const { course } of ctx.assignedBatches) {
    if (!byCourseSlug.has(course.slug)) byCourseSlug.set(course.slug, course);
  }
  return [...byCourseSlug.values()];
}

// Ownership-checked creation. `courseSlug` must be one this trainer
// teaches; if `batchId` is given, it must also be one of theirs.
export async function createManagedAssignment({ courseSlug, batchId, title, description, dueAt, status }) {
  const ctx = await getManagedCourseContext();
  if (!ctx) return { ok: false };
  if (!ctx.courseSlugs.includes(courseSlug)) return { ok: false };
  if (batchId && !batchBelongsToCourse(ctx, batchId, courseSlug)) return { ok: false };

  const assignment = createAssignment({ courseSlug, batchId, title, description, dueAt, status, createdBy: ctx.user.id });
  return { ok: true, assignment };
}

// Ownership-checked update — re-verifies against the assignment's REAL,
// currently-stored courseSlug/batchId (not whatever a form claims) before
// allowing any change, then applies the requested fields.
export async function updateManagedAssignment(assignmentId, { title, description, dueAt, status, batchId }) {
  const ctx = await getManagedCourseContext();
  if (!ctx) return { ok: false };

  const existing = getAssignmentById(assignmentId);
  if (!existing || !isManagedByTrainer(existing, ctx)) return { ok: false };
  if (batchId && !batchBelongsToCourse(ctx, batchId, existing.courseSlug)) return { ok: false };

  const assignment = updateAssignment(assignmentId, {
    title,
    description,
    dueAt,
    status,
    batchId: batchId || existing.batchId,
  });
  return { ok: true, assignment };
}

// Total submissions awaiting this trainer's review (dashboard metric).
// Sums the same scoped per-assignment counts the assignment list shows,
// so the two figures can never disagree.
export async function getMyPendingReviewCount() {
  const assignments = await getMyManagedAssignments();
  return assignments.reduce((sum, a) => sum + a.pendingReviewCount, 0);
}
