import crypto from "node:crypto";
import { db } from "@/lib/db/client";

// Re-exported for backward compatibility (server-only call sites) — the
// values themselves live in src/constants/lmsStatuses.js so a "use
// client" form can read them without pulling this DB module (and the
// database driver) into the browser bundle.
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
export async function listAttendanceForStudent(studentId) {
  return (await db.all("SELECT * FROM attendance_records WHERE student_id = ? ORDER BY marked_at DESC, id ASC", [studentId])).map(rowToRecord);
}

// Trainer attendance marking (Phase 9.2). The UNIQUE(student_id,
// class_session_id) constraint means a second call for the same
// student+session updates that row instead of creating a duplicate — this
// is what makes "submitting the same attendance form twice" idempotent.
// `studentId`/`batchId`/`classSessionId` must already be confirmed as
// belonging to the caller's own assigned batch before this runs —
// ownership checking happens one layer up in src/lib/trainer/attendance.js.
//
// `executor` lets markAttendanceBulk run every row inside one transaction.
export async function markAttendance({ studentId, batchId, classSessionId, status }, executor = db) {
  const id = crypto.randomUUID();
  await executor.run(
    `INSERT INTO attendance_records (id, student_id, batch_id, class_session_id, status, marked_at)
     VALUES (?, ?, ?, ?, ?, app_now())
     ON CONFLICT (student_id, class_session_id)
     DO UPDATE SET status = excluded.status, marked_at = app_now(), updated_at = app_now()`,
    [id, studentId, batchId, classSessionId || null, status]
  );

  return rowToRecord(
    await executor.get("SELECT * FROM attendance_records WHERE student_id = ? AND class_session_id IS NOT DISTINCT FROM ?", [
      studentId,
      classSessionId || null,
    ])
  );
}

// One call, one transaction, for the whole "Mark All Present" / roster
// bulk-save workflow — every record either all saves or none do, rather
// than a partial save on a mid-loop failure. `records` is an array of
// { studentId, batchId, classSessionId, status }, already filtered by the
// caller to students genuinely enrolled in this exact session's batch.
export async function markAttendanceBulk(records) {
  await db.tx(async (t) => {
    for (const record of records) {
      await markAttendance(record, t);
    }
  });
}

// `classSessionId` must already be confirmed as belonging to one of the
// caller's own assigned batches (src/lib/trainer/attendance.js) — used to
// prefill a roster with each student's existing mark, if any.
export async function listAttendanceForClassSession(classSessionId) {
  return (await db.all("SELECT * FROM attendance_records WHERE class_session_id = ?", [classSessionId])).map(rowToRecord);
}
