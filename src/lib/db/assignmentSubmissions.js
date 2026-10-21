import crypto from "node:crypto";
import { db } from "@/lib/db/client";

// Re-exported for backward compatibility (server-only call sites) — the
// values themselves live in src/constants/lmsStatuses.js so a "use
// client" form can read them without pulling this DB module (and the
// database driver) into the browser bundle.
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
export async function getSubmissionForStudentAssignment(studentId, assignmentId) {
  return rowToSubmission(await db.get("SELECT * FROM assignment_submissions WHERE student_id = ? AND assignment_id = ?", [studentId, assignmentId]));
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
// to students in `batchIds`.
export async function countPendingSubmissionsForAssignmentInBatches(assignmentId, batchIds) {
  if (!assignmentId || !batchIds || batchIds.length === 0) return 0;
  const row = await db.get(
    `SELECT COUNT(*) AS count FROM assignment_submissions s
     WHERE s.assignment_id = ? AND s.status = 'SUBMITTED' AND ${studentInBatchesClause(batchIds)}`,
    [assignmentId, ...batchIds]
  );
  return row.count;
}

// Submissions for ONE assignment, restricted to students in `batchIds`.
// One joined query (submission + student_profiles + users) rather than
// N+1 lookups. Only safe user fields are selected — no password_hash.
export async function listSubmissionsForAssignmentInBatches(assignmentId, batchIds) {
  if (!assignmentId || !batchIds || batchIds.length === 0) return [];
  const rows = await db.all(
    `SELECT
       s.*,
       u.name AS student_name,
       u.email AS student_email
     FROM assignment_submissions s
     JOIN student_profiles sp ON sp.id = s.student_id
     JOIN users u ON u.id = sp.user_id
     WHERE s.assignment_id = ? AND ${studentInBatchesClause(batchIds)}
     ORDER BY s.submitted_at DESC, s.id ASC`,
    [assignmentId, ...batchIds]
  );
  return rows.map((row) => ({ ...rowToSubmission(row), studentName: row.student_name, studentEmail: row.student_email }));
}

// Is this submission's student inside `batchIds`? Used as the final
// ownership gate before a trainer evaluation write.
export async function isSubmissionInBatches(submissionId, batchIds) {
  if (!submissionId || !batchIds || batchIds.length === 0) return false;
  const row = await db.get(`SELECT 1 AS one FROM assignment_submissions s WHERE s.id = ? AND ${studentInBatchesClause(batchIds)}`, [submissionId, ...batchIds]);
  return Boolean(row);
}

// Trainer ownership check + detail load for a single submission
// (src/lib/trainer/submissions.js verifies the returned row's
// assignmentId belongs to one of the trainer's own assignments before
// anything is shown or evaluated).
export async function getSubmissionById(id) {
  return rowToSubmission(await db.get("SELECT * FROM assignment_submissions WHERE id = ?", [id]));
}

// Trainer evaluation (Phase 9.2) — writes directly onto the existing
// assignment_submissions row. `status` moves from SUBMITTED to REVIEWED or
// RETURNED. Ownership must already be verified by the caller.
export async function evaluateSubmission(id, { status, score, feedback }) {
  await db.run(
    `UPDATE assignment_submissions
     SET status = ?, score = ?, feedback = ?, evaluated_at = app_now(), updated_at = app_now()
     WHERE id = ?`,
    [status, score === null || score === undefined ? null : score, feedback || null, id]
  );

  return await getSubmissionById(id);
}

// One row per (assignmentId, studentId), enforced by the UNIQUE
// constraint. Submitting again — a resubmission — updates the same row:
// text and submitted_at are replaced and status resets to SUBMITTED and
// any previous evaluation (score, feedback, evaluated_at) is cleared — a
// resubmission is a fresh submission awaiting review (Phase 9.4), never a
// new answer carrying a stale grade. A student can always revise their
// answer up until the assignment is CLOSED (enforced by the caller).
export async function upsertSubmission({ assignmentId, studentId, submissionText }) {
  const id = crypto.randomUUID();
  await db.run(
    `INSERT INTO assignment_submissions (id, assignment_id, student_id, submission_text, submitted_at, status)
     VALUES (?, ?, ?, ?, app_now(), 'SUBMITTED')
     ON CONFLICT (assignment_id, student_id)
     DO UPDATE SET
       submission_text = excluded.submission_text,
       submitted_at = app_now(),
       status = 'SUBMITTED',
       score = NULL,
       feedback = NULL,
       evaluated_at = NULL,
       updated_at = app_now()`,
    [id, assignmentId, studentId, submissionText]
  );

  return await getSubmissionForStudentAssignment(studentId, assignmentId);
}
