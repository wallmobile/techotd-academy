import crypto from "node:crypto";
import { db } from "@/lib/db/client";

export const BATCH_ENROLLMENT_STATUSES = ["ACTIVE", "COMPLETED", "CANCELLED"];

function rowToEnrollment(row) {
  if (!row) return null;
  return {
    id: row.id,
    studentId: row.student_id,
    batchId: row.batch_id,
    status: row.status,
    enrolledAt: row.enrolled_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// `studentId` must always come from the authenticated session — see
// src/lib/student/dashboard.js, the only caller.
export function listBatchEnrollmentsForStudent(studentId) {
  return db
    .prepare("SELECT * FROM batch_enrollments WHERE student_id = ? ORDER BY enrolled_at DESC")
    .all(studentId)
    .map(rowToEnrollment);
}

// `batchIds` must always be the caller's OWN assigned batch ids, already
// derived from the authenticated session (see src/lib/trainer/*.js) —
// never a batchId taken directly from a query parameter. Counts only
// non-cancelled enrollments per batch, grouped in one query rather than
// one query per batch (Phase 9.1 performance requirement: "avoid
// duplicate database calls").
export function countActiveBatchEnrollmentsForBatchIds(batchIds) {
  if (!batchIds || batchIds.length === 0) return {};
  const placeholders = batchIds.map(() => "?").join(", ");
  const rows = db
    .prepare(
      `SELECT batch_id, COUNT(*) AS count FROM batch_enrollments
       WHERE batch_id IN (${placeholders}) AND status != 'CANCELLED'
       GROUP BY batch_id`
    )
    .all(...batchIds);
  return Object.fromEntries(rows.map((row) => [row.batch_id, row.count]));
}

// `batchIds` must always be the caller's OWN assigned batch ids (see
// src/lib/trainer/students.js) — never taken directly from a query
// parameter. Single joined query (enrollment + student_profiles + users)
// rather than N+1 per-student lookups. Only the safe user fields are
// selected — no password_hash, no session data.
export function listEnrolledStudentsForBatchIds(batchIds) {
  if (!batchIds || batchIds.length === 0) return [];
  const placeholders = batchIds.map(() => "?").join(", ");
  return db
    .prepare(
      `SELECT
         be.id AS enrollment_id,
         be.batch_id AS batch_id,
         be.status AS enrollment_status,
         be.enrolled_at AS enrolled_at,
         sp.id AS student_profile_id,
         u.id AS user_id,
         u.name AS user_name,
         u.email AS user_email
       FROM batch_enrollments be
       JOIN student_profiles sp ON sp.id = be.student_id
       JOIN users u ON u.id = sp.user_id
       WHERE be.batch_id IN (${placeholders}) AND be.status != 'CANCELLED'
       ORDER BY u.name ASC`
    )
    .all(...batchIds)
    .map((row) => ({
      enrollmentId: row.enrollment_id,
      batchId: row.batch_id,
      enrollmentStatus: row.enrollment_status,
      enrolledAt: row.enrolled_at,
      studentProfileId: row.student_profile_id,
      userId: row.user_id,
      name: row.user_name,
      email: row.user_email,
    }));
}

// Foundation for a future batch-enrollment action — not wired to any UI
// yet in Phase 8.1.
export function createBatchEnrollment(studentId, batchId) {
  const id = crypto.randomUUID();
  db.prepare(
    `INSERT INTO batch_enrollments (id, student_id, batch_id, status)
     VALUES (?, ?, ?, 'ACTIVE')
     ON CONFLICT (student_id, batch_id) DO NOTHING`
  ).run(id, studentId, batchId);

  return rowToEnrollment(
    db
      .prepare("SELECT * FROM batch_enrollments WHERE student_id = ? AND batch_id = ?")
      .get(studentId, batchId)
  );
}
