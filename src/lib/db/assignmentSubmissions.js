import crypto from "node:crypto";
import { db } from "@/lib/db/client";

// Re-exported for backward compatibility (server-only call sites) — the
// values themselves live in src/constants/lmsStatuses.js so a "use
// client" form can read them without pulling this DB module (and
// better-sqlite3) into the browser bundle.
export { SUBMISSION_STATUSES } from "@/constants/lmsStatuses";

function rowToSubmission(row) {
  if (!row) return null;
  return {
    id: row.id,
    assignmentId: row.assignment_id,
    studentId: row.student_id,
    submissionText: row.submission_text,
    fileUrl: row.file_url,
    submittedAt: row.submitted_at,
    status: row.status,
    score: row.score,
    feedback: row.feedback,
    evaluatedAt: row.evaluated_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// `studentId` must always come from the authenticated session (see
// src/lib/student/assignments.js) — never a value a client supplied.
export function getSubmissionForStudentAssignment(studentId, assignmentId) {
  const row = db
    .prepare("SELECT * FROM assignment_submissions WHERE student_id = ? AND assignment_id = ?")
    .get(studentId, assignmentId);
  return rowToSubmission(row);
}

// Student-scope SQL shared by the trainer queries below (Phase 9.4): a
// submission belongs to a trainer's review scope only if its student has
// a non-cancelled enrollment in one of `batchIds`. `batchIds` must be the
// caller's OWN managed batch ids (src/lib/trainer/*.js) — never a client
// value. EXISTS (rather than a JOIN) so a student enrolled in two of the
// trainer's batches is still counted/listed once.
function studentInBatchesClause(batchIds) {
  const placeholders = batchIds.map(() => "?").join(", ");
  return `EXISTS (
    SELECT 1 FROM batch_enrollments be
    WHERE be.student_id = s.student_id
      AND be.status != 'CANCELLED'
      AND be.batch_id IN (${placeholders})
  )`;
}

// Pending (status SUBMITTED) submissions for ONE assignment, restricted
// to students in `batchIds`. Replaces the earlier course-wide count that
// over-counted other trainers' students.
export function countPendingSubmissionsForAssignmentInBatches(assignmentId, batchIds) {
  if (!assignmentId || !batchIds || batchIds.length === 0) return 0;
  const row = db
    .prepare(
      `SELECT COUNT(*) AS count FROM assignment_submissions s
       WHERE s.assignment_id = ? AND s.status = 'SUBMITTED' AND ${studentInBatchesClause(batchIds)}`
    )
    .get(assignmentId, ...batchIds);
  return row.count;
}

// Submissions for ONE assignment, restricted to students in `batchIds`.
// One joined query (submission + student_profiles + users) rather than
// N+1 lookups. Only safe user fields are selected — no password_hash.
export function listSubmissionsForAssignmentInBatches(assignmentId, batchIds) {
  if (!assignmentId || !batchIds || batchIds.length === 0) return [];
  return db
    .prepare(
      `SELECT
         s.*,
         u.name AS student_name,
         u.email AS student_email
       FROM assignment_submissions s
       JOIN student_profiles sp ON sp.id = s.student_id
       JOIN users u ON u.id = sp.user_id
       WHERE s.assignment_id = ? AND ${studentInBatchesClause(batchIds)}
       ORDER BY s.submitted_at DESC`
    )
    .all(assignmentId, ...batchIds)
    .map((row) => ({ ...rowToSubmission(row), studentName: row.student_name, studentEmail: row.student_email }));
}

// Is this submission's student inside `batchIds`? Used as the final
// ownership gate before a trainer evaluation write.
export function isSubmissionInBatches(submissionId, batchIds) {
  if (!submissionId || !batchIds || batchIds.length === 0) return false;
  const row = db
    .prepare(`SELECT 1 FROM assignment_submissions s WHERE s.id = ? AND ${studentInBatchesClause(batchIds)}`)
    .get(submissionId, ...batchIds);
  return Boolean(row);
}

// Trainer ownership check + detail load for a single submission
// (src/lib/trainer/submissions.js verifies the returned row's
// assignmentId belongs to one of the trainer's own assignments before
// anything is shown or evaluated).
export function getSubmissionById(id) {
  return rowToSubmission(db.prepare("SELECT * FROM assignment_submissions WHERE id = ?").get(id));
}

// Trainer evaluation (Phase 9.2) — writes directly onto the existing
// assignment_submissions row (no separate "evaluations" table — see the
// schema.sql comment above this table for why). `status` moves from
// SUBMITTED to REVIEWED or RETURNED, exactly the two values the Phase 8.6
// schema comment already reserved for "a future grading phase". Ownership
// must already be verified by the caller before this runs.
export function evaluateSubmission(id, { status, score, feedback }) {
  db.prepare(
    `UPDATE assignment_submissions
     SET status = ?, score = ?, feedback = ?, evaluated_at = datetime('now'), updated_at = datetime('now')
     WHERE id = ?`
  ).run(status, score === null || score === undefined ? null : score, feedback || null, id);

  return getSubmissionById(id);
}

// One row per (assignmentId, studentId), enforced by the UNIQUE
// constraint in schema.sql. Submitting again — a resubmission — updates
// the same row: text and submitted_at are replaced and status resets to
// SUBMITTED and any previous evaluation (score, feedback, evaluated_at)
// is cleared — a resubmission is a fresh submission awaiting review
// (Phase 9.4), never a new answer carrying a stale grade. This is the explicit,
// documented resubmission behavior for Phase 8.6 — a student can always
// revise their answer up until the assignment is CLOSED (enforced by the
// caller, not this module).
export function upsertSubmission({ assignmentId, studentId, submissionText }) {
  const id = crypto.randomUUID();
  db.prepare(
    `INSERT INTO assignment_submissions (id, assignment_id, student_id, submission_text, submitted_at, status)
     VALUES (?, ?, ?, ?, datetime('now'), 'SUBMITTED')
     ON CONFLICT (assignment_id, student_id)
     DO UPDATE SET
       submission_text = excluded.submission_text,
       submitted_at = datetime('now'),
       status = 'SUBMITTED',
       score = NULL,
       feedback = NULL,
       evaluated_at = NULL,
       updated_at = datetime('now')`
  ).run(id, assignmentId, studentId, submissionText);

  return getSubmissionForStudentAssignment(studentId, assignmentId);
}
