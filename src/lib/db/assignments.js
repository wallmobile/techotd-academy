import crypto from "node:crypto";
import { db } from "@/lib/db/client";

// Re-exported for backward compatibility (server-only call sites) — the
// values themselves live in src/constants/lmsStatuses.js so a "use
// client" form can read them without pulling this DB module (and
// better-sqlite3) into the browser bundle.
export { ASSIGNMENT_STATUSES } from "@/constants/lmsStatuses";

// Statuses a student is ever allowed to see. DRAFT is a trainer/admin-only
// state (that authoring UI doesn't exist yet — out of scope for this
// phase) and must never be visible to a student, even by guessing an id.
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
export function listVisibleAssignmentsForCourseSlugs(courseSlugs) {
  if (!courseSlugs || courseSlugs.length === 0) return [];
  const coursePlaceholders = courseSlugs.map(() => "?").join(", ");
  const statusPlaceholders = STUDENT_VISIBLE_STATUSES.map(() => "?").join(", ");
  return db
    .prepare(
      `SELECT * FROM assignments
       WHERE course_slug IN (${coursePlaceholders}) AND status IN (${statusPlaceholders})
       ORDER BY (due_at IS NULL), due_at ASC`
    )
    .all(...courseSlugs, ...STUDENT_VISIBLE_STATUSES)
    .map(rowToAssignment);
}

// Returns the assignment only if it's in a student-visible status; a DRAFT
// assignment (or a nonexistent id) returns null, same as "not found" — the
// caller (src/lib/student/assignments.js) still layers its own
// enrollment/batch check on top of this before showing anything.
export function getVisibleAssignmentById(id) {
  const row = db
    .prepare(
      `SELECT * FROM assignments WHERE id = ? AND status IN (${STUDENT_VISIBLE_STATUSES.map(() => "?").join(", ")})`
    )
    .get(id, ...STUDENT_VISIBLE_STATUSES);
  return rowToAssignment(row);
}

// Trainer assignment authoring (Phase 9.2) — this is exactly the write
// path the Phase 8.6 comment above anticipated. `courseSlug`/`batchId`
// must already be confirmed as belonging to the caller's own assigned
// batches before this runs — ownership checking happens one layer up in
// src/lib/trainer/assignments.js.
// `createdBy` (Phase 9.4) is the authoring trainer's user id, taken from
// the session by the caller — it's what scopes a course-wide assignment
// (batchId null) to its author.
export function createAssignment({ courseSlug, batchId, title, description, dueAt, status = "DRAFT", createdBy = null }) {
  const id = crypto.randomUUID();
  db.prepare(
    `INSERT INTO assignments (id, course_slug, batch_id, title, description, due_at, status, created_by)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(id, courseSlug, batchId || null, title, description || null, dueAt || null, status, createdBy);

  return rowToAssignment(db.prepare("SELECT * FROM assignments WHERE id = ?").get(id));
}

// Trainer view of a single assignment, regardless of status (unlike
// getVisibleAssignmentById, which is student-facing and DRAFT-hides).
// `id` ownership is verified by the caller (src/lib/trainer/assignments.js)
// against the trainer's own course/batch scope before anything from this
// row is shown.
export function getAssignmentById(id) {
  return rowToAssignment(db.prepare("SELECT * FROM assignments WHERE id = ?").get(id));
}

// `courseSlugs` must already be the caller's OWN derived course slugs
// (src/lib/trainer/assignments.js) — ALL statuses, including DRAFT,
// since a trainer authoring their own assignments needs to see drafts
// they haven't published yet (unlike the student-facing list, which
// never shows DRAFT).
export function listAssignmentsForCourseSlugs(courseSlugs) {
  if (!courseSlugs || courseSlugs.length === 0) return [];
  const placeholders = courseSlugs.map(() => "?").join(", ");
  return db
    .prepare(
      `SELECT * FROM assignments WHERE course_slug IN (${placeholders})
       ORDER BY (due_at IS NULL), due_at ASC`
    )
    .all(...courseSlugs)
    .map(rowToAssignment);
}

// Trainer editing an existing assignment (Phase 9.2). `updates` is a
// plain object of only the columns this phase allows changing — the
// existing DRAFT/PUBLISHED/CLOSED lifecycle (see ASSIGNMENT_STATUSES
// above) is preserved exactly as-is, not replaced with a new one.
// Ownership must already be verified by the caller before this runs.
export function updateAssignment(id, { title, description, dueAt, status, batchId }) {
  db.prepare(
    `UPDATE assignments
     SET title = ?, description = ?, due_at = ?, status = ?, batch_id = ?, updated_at = datetime('now')
     WHERE id = ?`
  ).run(title, description || null, dueAt || null, status, batchId || null, id);

  return getAssignmentById(id);
}
