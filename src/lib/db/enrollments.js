import crypto from "node:crypto";
import { db } from "@/lib/db/client";
import { getOrCreateStudentProfile } from "@/lib/db/studentProfiles";

// Admin-side enrollment persistence (Phase 10.3). There is deliberately no
// new table: an "enrollment" is the existing batch_enrollments row (student
// + batch; the course is the batch's course in the catalog) together with
// the student's course_enrollments row for that course. Both are written in
// one transaction so they can't disagree. Rows are never deleted —
// cancelling sets status CANCELLED, so the rows themselves are the history.
//
// All SQL is parameterized (the only interpolation is a fixed sort order
// from a whitelist and generated `?`/`@bN` placeholder lists). Authorization
// and catalog validation happen one layer up in src/lib/admin/enrollments.js.

const SORTS = {
  newest: "be.enrolled_at DESC, be.id ASC",
  oldest: "be.enrolled_at ASC, be.id ASC",
  name: "lower(u.name) ASC, be.id ASC",
};
export const ENROLLMENT_SORT_KEYS = Object.keys(SORTS);

function likePattern(q) {
  return `%${q.replace(/[\\%_]/g, (c) => `\\${c}`)}%`;
}

function rowToEnrollment(r) {
  return {
    id: r.id,
    studentProfileId: r.student_id,
    batchId: r.batch_id,
    status: r.status,
    enrolledAt: r.enrolled_at,
    updatedAt: r.updated_at,
    studentUserId: r.user_id,
    studentName: r.user_name,
    studentEmail: r.user_email,
    studentPhone: r.user_phone || r.profile_phone || null,
  };
}

const SELECT = `SELECT be.id, be.student_id, be.batch_id, be.status, be.enrolled_at, be.updated_at,
    u.id AS user_id, u.name AS user_name, u.email AS user_email, u.phone AS user_phone, sp.phone AS profile_phone
  FROM batch_enrollments be
  JOIN student_profiles sp ON sp.id = be.student_id
  JOIN users u ON u.id = sp.user_id`;

function buildWhere({ q, status, batchIds }) {
  const clauses = [];
  const params = {};
  if (status) {
    clauses.push("be.status = @status");
    params.status = status;
  }
  if (batchIds) {
    // batchIds === [] means "a filter that can match nothing"
    if (batchIds.length === 0) clauses.push("FALSE");
    else {
      clauses.push(`be.batch_id IN (${batchIds.map((_, i) => `@b${i}`).join(", ")})`);
      batchIds.forEach((id, i) => {
        params[`b${i}`] = id;
      });
    }
  }
  if (q) {
    clauses.push("(u.name ILIKE @q ESCAPE '\\' OR u.email ILIKE @q ESCAPE '\\' OR u.phone ILIKE @q ESCAPE '\\' OR sp.phone ILIKE @q ESCAPE '\\')");
    params.q = likePattern(q);
  }
  return { where: clauses.length ? `WHERE ${clauses.join(" AND ")}` : "", params };
}

export async function listEnrollments({ sort = "newest", limit = 20, offset = 0, ...filters }) {
  const { where, params } = buildWhere(filters);
  const order = SORTS[sort] || SORTS.newest;
  const rows = await db.all(`${SELECT} ${where} ORDER BY ${order} LIMIT @limit OFFSET @offset`, { ...params, limit, offset });
  const total = (
    await db.get(
      `SELECT COUNT(*) AS c FROM batch_enrollments be
       JOIN student_profiles sp ON sp.id = be.student_id JOIN users u ON u.id = sp.user_id ${where}`,
      params
    )
  ).c;
  return { rows: rows.map(rowToEnrollment), total };
}

export async function getEnrollmentById(id) {
  if (!id || typeof id !== "string") return null;
  const row = await db.get(`${SELECT} WHERE be.id = ?`, [id]);
  return row ? rowToEnrollment(row) : null;
}

// Every enrollment (any status) of one student USER, newest first.
export async function listEnrollmentsForUser(userId) {
  return (await db.all(`${SELECT} WHERE u.id = ? ORDER BY be.enrolled_at DESC, be.id ASC`, [userId])).map(rowToEnrollment);
}

export async function countEnrollmentsByStatus() {
  const counts = { ACTIVE: 0, COMPLETED: 0, CANCELLED: 0 };
  for (const r of await db.all("SELECT status, COUNT(*) AS c FROM batch_enrollments GROUP BY status")) {
    counts[r.status] = r.c;
  }
  return counts;
}

// Active students for the enrollment form's student picker. Search only —
// capped, never the whole student table.
export async function searchActiveStudents(q, limit = 20) {
  const where = q ? "AND (u.name ILIKE @q ESCAPE '\\' OR u.email ILIKE @q ESCAPE '\\' OR u.phone ILIKE @q ESCAPE '\\')" : "";
  const params = q ? { q: likePattern(q), limit } : { limit };
  return await db.all(
    `SELECT u.id, u.name, u.email FROM users u
     WHERE u.role = 'STUDENT' AND u.status = 'ACTIVE' ${where}
     ORDER BY lower(u.name) ASC, u.id ASC LIMIT @limit`,
    params
  );
}

export async function getUserForEnrollment(userId) {
  if (!userId || typeof userId !== "string") return null;
  return (await db.get("SELECT id, name, email, role, status FROM users WHERE id = ?", [userId])) ?? null;
}

// Course status is DERIVED from the student's batch enrollments in that
// course: any ACTIVE -> ACTIVE, else any COMPLETED -> COMPLETED, else
// CANCELLED. `courseBatchIds` are the catalog batch ids of the course.
// Runs inside the caller's transaction (`t`), which already holds the
// per-student lock, so the read-then-write below cannot interleave.
async function syncCourseEnrollment(t, profileId, courseSlug, courseBatchIds) {
  if (courseBatchIds.length === 0) return;
  const placeholders = courseBatchIds.map(() => "?").join(", ");
  const statuses = (
    await t.all(`SELECT status FROM batch_enrollments WHERE student_id = ? AND batch_id IN (${placeholders})`, [profileId, ...courseBatchIds])
  ).map((r) => r.status);
  if (statuses.length === 0) return;
  const derived = statuses.includes("ACTIVE") ? "ACTIVE" : statuses.includes("COMPLETED") ? "COMPLETED" : "CANCELLED";

  const existing = await t.get("SELECT id, status FROM course_enrollments WHERE student_id = ? AND course_slug = ?", [profileId, courseSlug]);
  if (!existing) {
    await t.run("INSERT INTO course_enrollments (id, student_id, course_slug, status) VALUES (?, ?, ?, ?)", [
      crypto.randomUUID(),
      profileId,
      courseSlug,
      derived,
    ]);
  } else if (existing.status !== derived) {
    await t.run("UPDATE course_enrollments SET status = ?, updated_at = app_now() WHERE id = ?", [derived, existing.id]);
  }
}

// Creates (or re-activates a CANCELLED) batch enrollment plus the course
// enrollment, atomically. Preconditions (student/course/batch validity,
// batch open) are verified by the caller. Returns
// { ok: true, enrollmentId, reactivated } or { ok: false, reason }.
export async function createEnrollmentTx({ studentUserId, courseSlug, courseBatchIds, batchId }) {
  // The profile row is created (idempotently) outside the transaction so the
  // transaction body only ever deals with rows that exist.
  const profile = await getOrCreateStudentProfile(studentUserId);
  return await db.tx(async (t) => {
    // Serialize everything for this student: two admins enrolling the same
    // student in the same batch at once must not both succeed.
    await t.lock(`enroll:${profile.id}`);
    const existing = await t.get("SELECT id, status FROM batch_enrollments WHERE student_id = ? AND batch_id = ?", [profile.id, batchId]);

    let enrollmentId;
    let reactivated = false;
    if (existing) {
      if (existing.status === "ACTIVE") return { ok: false, reason: "duplicate" };
      if (existing.status === "COMPLETED") return { ok: false, reason: "completed" };
      await t.run("UPDATE batch_enrollments SET status = 'ACTIVE', enrolled_at = app_now(), updated_at = app_now() WHERE id = ?", [existing.id]);
      enrollmentId = existing.id;
      reactivated = true;
    } else {
      enrollmentId = crypto.randomUUID();
      await t.run("INSERT INTO batch_enrollments (id, student_id, batch_id, status) VALUES (?, ?, ?, 'ACTIVE')", [enrollmentId, profile.id, batchId]);
    }
    await syncCourseEnrollment(t, profile.id, courseSlug, courseBatchIds);
    return { ok: true, enrollmentId, reactivated };
  });
}

export async function setEnrollmentStatusTx({ enrollmentId, status, courseSlug, courseBatchIds }) {
  return await db.tx(async (t) => {
    const row = await t.get("SELECT student_id FROM batch_enrollments WHERE id = ?", [enrollmentId]);
    if (!row) return false;
    await t.lock(`enroll:${row.student_id}`);
    await t.run("UPDATE batch_enrollments SET status = ?, updated_at = app_now() WHERE id = ?", [status, enrollmentId]);
    await syncCourseEnrollment(t, row.student_id, courseSlug, courseBatchIds);
    return true;
  });
}
