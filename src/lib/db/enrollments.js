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
  name: "u.name COLLATE NOCASE ASC, be.id ASC",
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
    if (batchIds.length === 0) clauses.push("0");
    else {
      clauses.push(`be.batch_id IN (${batchIds.map((_, i) => `@b${i}`).join(", ")})`);
      batchIds.forEach((id, i) => {
        params[`b${i}`] = id;
      });
    }
  }
  if (q) {
    clauses.push("(u.name LIKE @q ESCAPE '\\' OR u.email LIKE @q ESCAPE '\\' OR u.phone LIKE @q ESCAPE '\\' OR sp.phone LIKE @q ESCAPE '\\')");
    params.q = likePattern(q);
  }
  return { where: clauses.length ? `WHERE ${clauses.join(" AND ")}` : "", params };
}

export function listEnrollments({ sort = "newest", limit = 20, offset = 0, ...filters }) {
  const { where, params } = buildWhere(filters);
  const order = SORTS[sort] || SORTS.newest;
  const rows = db
    .prepare(`${SELECT} ${where} ORDER BY ${order} LIMIT @limit OFFSET @offset`)
    .all({ ...params, limit, offset });
  const total = db
    .prepare(
      `SELECT COUNT(*) AS c FROM batch_enrollments be
       JOIN student_profiles sp ON sp.id = be.student_id JOIN users u ON u.id = sp.user_id ${where}`
    )
    .get(params).c;
  return { rows: rows.map(rowToEnrollment), total };
}

export function getEnrollmentById(id) {
  if (!id || typeof id !== "string") return null;
  const row = db.prepare(`${SELECT} WHERE be.id = ?`).get(id);
  return row ? rowToEnrollment(row) : null;
}

// Every enrollment (any status) of one student USER, newest first.
export function listEnrollmentsForUser(userId) {
  return db
    .prepare(`${SELECT} WHERE u.id = ? ORDER BY be.enrolled_at DESC, be.id ASC`)
    .all(userId)
    .map(rowToEnrollment);
}

export function countEnrollmentsByStatus() {
  const counts = { ACTIVE: 0, COMPLETED: 0, CANCELLED: 0 };
  for (const r of db.prepare("SELECT status, COUNT(*) AS c FROM batch_enrollments GROUP BY status").all()) {
    counts[r.status] = r.c;
  }
  return counts;
}

// Active students for the enrollment form's student picker. Search only —
// capped, never the whole student table.
export function searchActiveStudents(q, limit = 20) {
  const where = q ? "AND (u.name LIKE @q ESCAPE '\\' OR u.email LIKE @q ESCAPE '\\' OR u.phone LIKE @q ESCAPE '\\')" : "";
  const params = q ? { q: likePattern(q), limit } : { limit };
  return db
    .prepare(
      `SELECT u.id, u.name, u.email FROM users u
       WHERE u.role = 'STUDENT' AND u.status = 'ACTIVE' ${where}
       ORDER BY u.name COLLATE NOCASE ASC LIMIT @limit`
    )
    .all(params);
}

export function getUserForEnrollment(userId) {
  if (!userId || typeof userId !== "string") return null;
  return db.prepare("SELECT id, name, email, role, status FROM users WHERE id = ?").get(userId) ?? null;
}

// Course status is DERIVED from the student's batch enrollments in that
// course: any ACTIVE -> ACTIVE, else any COMPLETED -> COMPLETED, else
// CANCELLED. `courseBatchIds` are the catalog batch ids of the course.
function syncCourseEnrollment(profileId, courseSlug, courseBatchIds) {
  const placeholders = courseBatchIds.map(() => "?").join(", ");
  const statuses = db
    .prepare(`SELECT status FROM batch_enrollments WHERE student_id = ? AND batch_id IN (${placeholders})`)
    .all(profileId, ...courseBatchIds)
    .map((r) => r.status);
  if (statuses.length === 0) return;
  const derived = statuses.includes("ACTIVE") ? "ACTIVE" : statuses.includes("COMPLETED") ? "COMPLETED" : "CANCELLED";

  const existing = db
    .prepare("SELECT id, status FROM course_enrollments WHERE student_id = ? AND course_slug = ?")
    .get(profileId, courseSlug);
  if (!existing) {
    db.prepare("INSERT INTO course_enrollments (id, student_id, course_slug, status) VALUES (?, ?, ?, ?)").run(
      crypto.randomUUID(),
      profileId,
      courseSlug,
      derived
    );
  } else if (existing.status !== derived) {
    db.prepare("UPDATE course_enrollments SET status = ?, updated_at = datetime('now') WHERE id = ?").run(derived, existing.id);
  }
}

// Creates (or re-activates a CANCELLED) batch enrollment plus the course
// enrollment, atomically. Preconditions (student/course/batch validity,
// batch open) are verified by the caller. Returns
// { ok: true, enrollmentId, reactivated } or { ok: false, reason }.
export function createEnrollmentTx({ studentUserId, courseSlug, courseBatchIds, batchId }) {
  const run = db.transaction(() => {
    const profile = getOrCreateStudentProfile(studentUserId);
    const existing = db
      .prepare("SELECT id, status FROM batch_enrollments WHERE student_id = ? AND batch_id = ?")
      .get(profile.id, batchId);

    let enrollmentId;
    let reactivated = false;
    if (existing) {
      if (existing.status === "ACTIVE") return { ok: false, reason: "duplicate" };
      if (existing.status === "COMPLETED") return { ok: false, reason: "completed" };
      db.prepare(
        "UPDATE batch_enrollments SET status = 'ACTIVE', enrolled_at = datetime('now'), updated_at = datetime('now') WHERE id = ?"
      ).run(existing.id);
      enrollmentId = existing.id;
      reactivated = true;
    } else {
      enrollmentId = crypto.randomUUID();
      db.prepare("INSERT INTO batch_enrollments (id, student_id, batch_id, status) VALUES (?, ?, ?, 'ACTIVE')").run(
        enrollmentId,
        profile.id,
        batchId
      );
    }
    syncCourseEnrollment(profile.id, courseSlug, courseBatchIds);
    return { ok: true, enrollmentId, reactivated };
  });
  return run();
}

export function setEnrollmentStatusTx({ enrollmentId, status, courseSlug, courseBatchIds }) {
  const run = db.transaction(() => {
    const row = db.prepare("SELECT student_id FROM batch_enrollments WHERE id = ?").get(enrollmentId);
    if (!row) return false;
    db.prepare("UPDATE batch_enrollments SET status = ?, updated_at = datetime('now') WHERE id = ?").run(status, enrollmentId);
    syncCourseEnrollment(row.student_id, courseSlug, courseBatchIds);
    return true;
  });
  return run();
}
