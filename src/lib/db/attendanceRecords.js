import crypto from "node:crypto";
import { db } from "@/lib/db/client";

// Re-exported for backward compatibility (server-only call sites) — the
// values themselves live in src/constants/lmsStatuses.js so a "use
// client" form can read them without pulling this DB module (and
// better-sqlite3) into the browser bundle.
export { ATTENDANCE_STATUSES } from "@/constants/lmsStatuses";

function rowToRecord(row) {
  if (!row) return null;
  return {
    id: row.id,
    studentId: row.student_id,
    batchId: row.batch_id,
    classSessionId: row.class_session_id,
    status: row.status,
    markedAt: row.marked_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// `studentId` must always come from the authenticated session (see
// src/lib/student/attendance.js) — never a value a client supplied.
export function listAttendanceForStudent(studentId) {
  return db
    .prepare("SELECT * FROM attendance_records WHERE student_id = ? ORDER BY marked_at DESC")
    .all(studentId)
    .map(rowToRecord);
}

// Trainer attendance marking (Phase 9.2) — this is exactly the write path
// the Phase 8.7 comment above anticipated. The
// UNIQUE(student_id, class_session_id) constraint in schema.sql means a
// second call for the same student+session updates that row instead of
// creating a duplicate — this is what makes "submitting the same
// attendance form twice" idempotent (spec Step 8), with no extra
// bookkeeping needed here. `studentId`/`batchId`/`classSessionId` must
// already be confirmed as belonging to the caller's own assigned batch
// before this runs — ownership checking happens one layer up in
// src/lib/trainer/attendance.js, same division of responsibility as
// every other src/lib/db/* module.
export function markAttendance({ studentId, batchId, classSessionId, status }) {
  const id = crypto.randomUUID();
  db.prepare(
    `INSERT INTO attendance_records (id, student_id, batch_id, class_session_id, status, marked_at)
     VALUES (?, ?, ?, ?, ?, datetime('now'))
     ON CONFLICT (student_id, class_session_id)
     DO UPDATE SET status = excluded.status, marked_at = datetime('now'), updated_at = datetime('now')`
  ).run(id, studentId, batchId, classSessionId || null, status);

  return rowToRecord(
    db.prepare("SELECT * FROM attendance_records WHERE student_id = ? AND class_session_id IS ?").get(
      studentId,
      classSessionId || null
    )
  );
}

// One call, one transaction, for the whole "Mark All Present" / roster
// bulk-save workflow (spec Step 7) — every record either all save or
// none do, rather than a partial save on a mid-loop failure. `records` is
// an array of { studentId, batchId, classSessionId, status }, already
// filtered by the caller to students genuinely enrolled in this exact
// session's batch. Reuses markAttendance's own idempotent
// INSERT ... ON CONFLICT for each row.
export const markAttendanceBulk = db.transaction((records) => {
  for (const record of records) {
    markAttendance(record);
  }
});

// `classSessionId` must already be confirmed as belonging to one of the
// caller's own assigned batches (src/lib/trainer/attendance.js) — used to
// prefill a roster with each student's existing mark, if any, so a
// trainer reopening a session sees what was previously saved rather than
// a blank form.
export function listAttendanceForClassSession(classSessionId) {
  return db
    .prepare("SELECT * FROM attendance_records WHERE class_session_id = ?")
    .all(classSessionId)
    .map(rowToRecord);
}
