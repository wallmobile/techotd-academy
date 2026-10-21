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

const marks = (list) => list.map(() => "?").join(", ");

// `studentId` must always come from the authenticated session — see
// src/lib/student/dashboard.js, the only caller.
export async function listBatchEnrollmentsForStudent(studentId) {
  return (await db.all("SELECT * FROM batch_enrollments WHERE student_id = ? ORDER BY enrolled_at DESC", [studentId])).map(rowToEnrollment);
}

// `batchIds` must always be the caller's OWN assigned batch ids, already
// derived from the authenticated session (see src/lib/trainer/*.js) —
// never a batchId taken directly from a query parameter. Counts only
// non-cancelled enrollments per batch, grouped in one query rather than
// one query per batch.
export async function countActiveBatchEnrollmentsForBatchIds(batchIds) {
  if (!batchIds || batchIds.length === 0) return {};
  const rows = await db.all(
    `SELECT batch_id, COUNT(*) AS count FROM batch_enrollments
     WHERE batch_id IN (${marks(batchIds)}) AND status != 'CANCELLED'
     GROUP BY batch_id`,
    batchIds
  );
  return Object.fromEntries(rows.map((row) => [row.batch_id, row.count]));
}

// `batchIds` must always be the caller's OWN assigned batch ids (see
// src/lib/trainer/students.js) — never taken directly from a query
// parameter. Single joined query (enrollment + student_profiles + users)
// rather than N+1 per-student lookups. Only the safe user fields are
// selected — no password_hash, no session data.
export async function listEnrolledStudentsForBatchIds(batchIds) {
  if (!batchIds || batchIds.length === 0) return [];
  const rows = await db.all(
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
     WHERE be.batch_id IN (${marks(batchIds)}) AND be.status != 'CANCELLED'
     ORDER BY u.name ASC, u.id ASC`,
    batchIds
  );
  return rows.map((row) => ({
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

// Writes a batch enrollment (idempotent via the UNIQUE constraint).
export async function createBatchEnrollment(studentId, batchId) {
  const id = crypto.randomUUID();
  await db.run(
    `INSERT INTO batch_enrollments (id, student_id, batch_id, status)
     VALUES (?, ?, ?, 'ACTIVE')
     ON CONFLICT (student_id, batch_id) DO NOTHING`,
    [id, studentId, batchId]
  );

  return rowToEnrollment(await db.get("SELECT * FROM batch_enrollments WHERE student_id = ? AND batch_id = ?", [studentId, batchId]));
}
