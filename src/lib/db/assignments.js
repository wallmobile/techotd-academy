import crypto from "node:crypto";
import { db } from "@/lib/db/client";

// Re-exported for backward compatibility (server-only call sites) — the
// values themselves live in src/constants/lmsStatuses.js so a "use
// client" form can read them without pulling this DB module (and the
// database driver) into the browser bundle.
export { ASSIGNMENT_STATUSES } from "@/constants/lmsStatuses";

// Statuses a student is ever allowed to see. DRAFT is a trainer/admin-only
// state and must never be visible to a student, even by guessing an id.
const STUDENT_VISIBLE_STATUSES = ["PUBLISHED", "CLOSED"];

function rowToAssignment(row) {
  if (!row) return null;
  return {
    id: row.id,
    courseSlug: row.course_slug,
    batchId: row.batch_id,
    title: row.title,
    description: row.description,
    dueAt: row.due_at,
    status: row.status,
    createdBy: row.created_by ?? null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// `courseSlugs` must already be the caller's OWN enrolled course slugs
// (see src/lib/student/assignments.js) — never taken directly from a
// query parameter. Only PUBLISHED/CLOSED assignments are returned.
export async function listVisibleAssignmentsForCourseSlugs(courseSlugs) {
  if (!courseSlugs || courseSlugs.length === 0) return [];
  const coursePlaceholders = courseSlugs.map(() => "?").join(", ");
  const statusPlaceholders = STUDENT_VISIBLE_STATUSES.map(() => "?").join(", ");
  const rows = await db.all(
    `SELECT * FROM assignments
     WHERE course_slug IN (${coursePlaceholders}) AND status IN (${statusPlaceholders})
     ORDER BY (due_at IS NULL), due_at ASC, id ASC`,
    [...courseSlugs, ...STUDENT_VISIBLE_STATUSES]
  );
  return rows.map(rowToAssignment);
}

// Returns the assignment only if it's in a student-visible status; a DRAFT
// assignment (or a nonexistent id) returns null, same as "not found" — the
// caller (src/lib/student/assignments.js) still layers its own
// enrollment/batch check on top of this before showing anything.
export async function getVisibleAssignmentById(id) {
  const row = await db.get(`SELECT * FROM assignments WHERE id = ? AND status IN (${STUDENT_VISIBLE_STATUSES.map(() => "?").join(", ")})`, [
    id,
    ...STUDENT_VISIBLE_STATUSES,
  ]);
  return rowToAssignment(row);
}

// Trainer assignment authoring (Phase 9.2). `courseSlug`/`batchId` must
// already be confirmed as belonging to the caller's own assigned batches
// before this runs — ownership checking happens one layer up in
// src/lib/trainer/assignments.js.
// `createdBy` (Phase 9.4) is the authoring trainer's user id, taken from
// the session by the caller — it's what scopes a course-wide assignment
// (batchId null) to its author.
export async function createAssignment({ courseSlug, batchId, title, description, dueAt, status = "DRAFT", createdBy = null }) {
  const id = crypto.randomUUID();
  await db.run(
    `INSERT INTO assignments (id, course_slug, batch_id, title, description, due_at, status, created_by)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [id, courseSlug, batchId || null, title, description || null, dueAt || null, status, createdBy]
  );

  return await getAssignmentById(id);
}

// Trainer view of a single assignment, regardless of status (unlike
// getVisibleAssignmentById, which is student-facing and DRAFT-hides).
// `id` ownership is verified by the caller (src/lib/trainer/assignments.js)
// against the trainer's own course/batch scope before anything from this
// row is shown.
export async function getAssignmentById(id) {
  return rowToAssignment(await db.get("SELECT * FROM assignments WHERE id = ?", [id]));
}

// `courseSlugs` must already be the caller's OWN derived course slugs
// (src/lib/trainer/assignments.js) — ALL statuses, including DRAFT,
// since a trainer authoring their own assignments needs to see drafts
// they haven't published yet.
export async function listAssignmentsForCourseSlugs(courseSlugs) {
  if (!courseSlugs || courseSlugs.length === 0) return [];
  const placeholders = courseSlugs.map(() => "?").join(", ");
  const rows = await db.all(
    `SELECT * FROM assignments WHERE course_slug IN (${placeholders})
     ORDER BY (due_at IS NULL), due_at ASC, id ASC`,
    courseSlugs
  );
  return rows.map(rowToAssignment);
}

// Trainer editing an existing assignment (Phase 9.2). The existing
// DRAFT/PUBLISHED/CLOSED lifecycle (see ASSIGNMENT_STATUSES) is preserved
// exactly as-is. Ownership must already be verified by the caller.
export async function updateAssignment(id, { title, description, dueAt, status, batchId }) {
  await db.run(
    `UPDATE assignments
     SET title = ?, description = ?, due_at = ?, status = ?, batch_id = ?, updated_at = app_now()
     WHERE id = ?`,
    [title, description || null, dueAt || null, status, batchId || null, id]
  );

  return await getAssignmentById(id);
}
