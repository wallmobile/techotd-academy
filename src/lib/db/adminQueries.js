import { db } from "@/lib/db/client";

// Read/write queries for the Admin area (Phase 10.1). All SQL is
// parameterized; the only interpolated fragments are fixed constants
// chosen from whitelists below (sort order), never client text. No query
// here ever selects password_hash, session token hashes or reset tokens.
// Authorization happens one layer up in src/lib/admin/*.

export const PAGE_SIZE = 20;

const SORTS = {
  newest: "u.created_at DESC, u.id ASC",
  oldest: "u.created_at ASC, u.id ASC",
  name: "u.name COLLATE NOCASE ASC, u.id ASC",
};
export const SORT_KEYS = Object.keys(SORTS);

function likePattern(q) {
  return `%${q.replace(/[\\%_]/g, (c) => `\\${c}`)}%`;
}

function rowToUser(row) {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    phone: row.phone,
    role: row.role,
    status: row.status,
    createdAt: row.created_at,
    activeSessionCount: row.active_sessions ?? 0,
  };
}

const USER_COLUMNS = `u.id, u.name, u.email, u.phone, u.role, u.status, u.created_at,
  (SELECT COUNT(*) FROM sessions s WHERE s.user_id = u.id AND s.expires_at > @now) AS active_sessions`;

// Returns the WHERE clause plus two parameter sets: the one the page query
// uses (includes `now` for the session count) and the one the COUNT query
// uses (better-sqlite3 rejects unused named parameters).
function build({ q, role, searchColumns }) {
  const clauses = [];
  const countParams = {};
  if (role) {
    clauses.push("u.role = @role");
    countParams.role = role;
  }
  if (q) {
    countParams.q = likePattern(q);
    clauses.push(`(${searchColumns.map((c) => `${c} LIKE @q ESCAPE '\\'`).join(" OR ")})`);
  }
  return {
    where: clauses.length ? `WHERE ${clauses.join(" AND ")}` : "",
    countParams,
    pageParams: { ...countParams, now: new Date().toISOString() },
  };
}

// Generic user page. `role` is an exact filter (validated by the caller).
export function listUsersPage({ q = "", role = "", sort = "newest", limit = PAGE_SIZE, offset = 0 }) {
  const { where, countParams, pageParams } = build({ q, role, searchColumns: ["u.name", "u.email"] });
  const order = SORTS[sort] || SORTS.newest;
  const rows = db
    .prepare(`SELECT ${USER_COLUMNS} FROM users u ${where} ORDER BY ${order} LIMIT @limit OFFSET @offset`)
    .all({ ...pageParams, limit, offset });
  const total = db.prepare(`SELECT COUNT(*) AS c FROM users u ${where}`).get(countParams).c;
  return { rows: rows.map(rowToUser), total };
}

// Staff (non-student, non-trainer) accounts for the Super Admin console.
// `roles` is a caller-supplied whitelist of fixed role constants; the values
// are bound as parameters (never interpolated), `role` narrows to one of them.
export function listStaffPage({ roles, q = "", role = "", sort = "newest", limit = PAGE_SIZE, offset = 0 }) {
  const params = {};
  const placeholders = roles.map((r, i) => {
    params[`r${i}`] = r;
    return `@r${i}`;
  });
  const clauses = [`u.role IN (${placeholders.join(", ")})`];
  if (role && roles.includes(role)) {
    clauses.push("u.role = @role");
    params.role = role;
  }
  if (q) {
    params.q = likePattern(q);
    clauses.push("(u.name LIKE @q ESCAPE '\\' OR u.email LIKE @q ESCAPE '\\')");
  }
  const where = `WHERE ${clauses.join(" AND ")}`;
  const order = SORTS[sort] || SORTS.newest;
  const rows = db
    .prepare(`SELECT ${USER_COLUMNS} FROM users u ${where} ORDER BY ${order} LIMIT @limit OFFSET @offset`)
    .all({ ...params, now: new Date().toISOString(), limit, offset });
  const total = db.prepare(`SELECT COUNT(*) AS c FROM users u ${where}`).get(params).c;
  return { rows: rows.map(rowToUser), total };
}

export function listStudentsPage({ q = "", sort = "newest", limit = PAGE_SIZE, offset = 0 }) {
  const { where, countParams, pageParams } = build({
    q,
    role: "STUDENT",
    searchColumns: ["u.name", "u.email", "u.phone", "sp.phone"],
  });
  const order = SORTS[sort] || SORTS.newest;
  const from = "FROM users u LEFT JOIN student_profiles sp ON sp.user_id = u.id";
  const rows = db
    .prepare(
      `SELECT ${USER_COLUMNS}, sp.phone AS profile_phone, sp.city AS city,
         (SELECT COUNT(*) FROM course_enrollments ce WHERE ce.student_id = sp.id AND ce.status != 'CANCELLED') AS enrollment_count
       ${from} ${where} ORDER BY ${order} LIMIT @limit OFFSET @offset`
    )
    .all({ ...pageParams, limit, offset });
  const total = db.prepare(`SELECT COUNT(*) AS c ${from} ${where}`).get(countParams).c;
  return {
    rows: rows.map((r) => ({
      ...rowToUser(r),
      phone: r.phone || r.profile_phone || null,
      city: r.city || null,
      enrollmentCount: r.enrollment_count,
    })),
    total,
  };
}

export function listTrainersPage({ q = "", sort = "newest", limit = PAGE_SIZE, offset = 0 }) {
  const { where, countParams, pageParams } = build({
    q,
    role: "TRAINER",
    searchColumns: ["u.name", "u.email", "u.phone"],
  });
  const order = SORTS[sort] || SORTS.newest;
  const rows = db
    .prepare(
      `SELECT ${USER_COLUMNS},
         (SELECT COUNT(*) FROM trainer_batch_assignments t WHERE t.trainer_user_id = u.id) AS batch_count
       FROM users u ${where} ORDER BY ${order} LIMIT @limit OFFSET @offset`
    )
    .all({ ...pageParams, limit, offset });
  const total = db.prepare(`SELECT COUNT(*) AS c FROM users u ${where}`).get(countParams).c;
  return { rows: rows.map((r) => ({ ...rowToUser(r), batchCount: r.batch_count })), total };
}

export function getUserRow(id) {
  const row = db
    .prepare(`SELECT ${USER_COLUMNS}, u.email_verified_at, u.updated_at FROM users u WHERE u.id = @id`)
    .get({ id, now: new Date().toISOString() });
  if (!row) return null;
  return { ...rowToUser(row), emailVerifiedAt: row.email_verified_at, updatedAt: row.updated_at };
}

export function getStudentProfileRowByUserId(userId) {
  const row = db.prepare("SELECT * FROM student_profiles WHERE user_id = ?").get(userId);
  if (!row) return null;
  return { id: row.id, phone: row.phone, city: row.city, avatarUrl: row.avatar_url, bio: row.bio };
}

export function listSubmissionsForStudent(studentProfileId) {
  return db
    .prepare(
      `SELECT s.id, s.assignment_id, s.status, s.score, s.submitted_at, s.evaluated_at, a.title AS assignment_title
       FROM assignment_submissions s JOIN assignments a ON a.id = s.assignment_id
       WHERE s.student_id = ? ORDER BY s.submitted_at DESC`
    )
    .all(studentProfileId)
    .map((r) => ({
      id: r.id,
      assignmentId: r.assignment_id,
      assignmentTitle: r.assignment_title,
      status: r.status,
      score: r.score,
      submittedAt: r.submitted_at,
      evaluatedAt: r.evaluated_at,
    }));
}

export function listTrainerBatchRows(trainerUserId) {
  return db
    .prepare(
      "SELECT batch_id, created_at FROM trainer_batch_assignments WHERE trainer_user_id = ? ORDER BY created_at ASC, id ASC"
    )
    .all(trainerUserId)
    .map((r) => ({ batchId: r.batch_id, assignedAt: r.created_at }));
}

function inClause(ids) {
  return ids.map(() => "?").join(", ");
}

export function countAttendanceRecordsForBatches(batchIds) {
  if (!batchIds.length) return 0;
  return db
    .prepare(`SELECT COUNT(*) AS c FROM attendance_records WHERE batch_id IN (${inClause(batchIds)})`)
    .get(...batchIds).c;
}

// Assignments authored by this trainer, or scoped to one of their batches.
export function countAssignmentsForTrainer(trainerUserId, batchIds) {
  const batchClause = batchIds.length ? ` OR batch_id IN (${inClause(batchIds)})` : "";
  return db
    .prepare(`SELECT COUNT(*) AS c FROM assignments WHERE created_by = ?${batchClause}`)
    .get(trainerUserId, ...batchIds).c;
}

// --- Dashboard aggregates ---------------------------------------------------
export function countUsersByRole() {
  return Object.fromEntries(
    db
      .prepare("SELECT role, COUNT(*) AS c FROM users GROUP BY role")
      .all()
      .map((r) => [r.role, r.c])
  );
}

export function countUsersByStatus() {
  return Object.fromEntries(
    db
      .prepare("SELECT status, COUNT(*) AS c FROM users GROUP BY status")
      .all()
      .map((r) => [r.status, r.c])
  );
}

// Distinct users holding at least one unexpired session.
export function countUsersWithActiveSession() {
  return db
    .prepare("SELECT COUNT(DISTINCT user_id) AS c FROM sessions WHERE expires_at > ?")
    .get(new Date().toISOString()).c;
}

export function listRecentUsers(limit = 5) {
  return db
    .prepare("SELECT id, name, email, role, created_at FROM users ORDER BY created_at DESC, id ASC LIMIT ?")
    .all(limit)
    .map((r) => ({ id: r.id, name: r.name, email: r.email, role: r.role, createdAt: r.created_at }));
}

export function pingDatabase() {
  return db.prepare("SELECT 1 AS ok").get().ok === 1;
}

// --- Account status -----------------------------------------------------------
export function countActiveUsersWithRole(role) {
  return db.prepare("SELECT COUNT(*) AS c FROM users WHERE role = ? AND status = 'ACTIVE'").get(role).c;
}

export function updateUserStatusRow(userId, status) {
  db.prepare("UPDATE users SET status = ?, updated_at = datetime('now') WHERE id = ?").run(status, userId);
}
