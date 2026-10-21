import crypto from "node:crypto";
import { db } from "@/lib/db/client";

// Re-exported for backward compatibility (server-only call sites) — the
// values themselves live in src/constants/lmsStatuses.js so a "use
// client" form can read them without pulling this DB module (and the
// database driver) into the browser bundle.
export { CLASS_SESSION_STATUSES } from "@/constants/lmsStatuses";

function rowToSession(row) {
  if (!row) return null;
  return {
    id: row.id,
    batchId: row.batch_id,
    title: row.title,
    sessionDate: row.session_date,
    startTime: row.start_time,
    endTime: row.end_time,
    meetingUrl: row.meeting_url,
    location: row.location,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// `batchIds` must always be the caller's OWN enrolled batch ids, already
// derived from the authenticated session (see
// src/lib/student/batches.js) — never a batchId taken directly from a
// query parameter. Returns every session for those batches ordered
// chronologically; callers decide what "upcoming" vs "past" means.
export async function listSessionsForBatchIds(batchIds) {
  if (!batchIds || batchIds.length === 0) return [];
  const placeholders = batchIds.map(() => "?").join(", ");
  const rows = await db.all(
    `SELECT * FROM class_sessions WHERE batch_id IN (${placeholders}) ORDER BY session_date ASC, start_time ASC, id ASC`,
    batchIds
  );
  return rows.map(rowToSession);
}

// Used only to enrich an attendance record with its session's date/title
// when it has one (src/lib/student/attendance.js) — classSessionId is
// nullable on attendance_records, so callers must handle a null id
// themselves before calling this.
export async function getClassSessionById(id) {
  return rowToSession(await db.get("SELECT * FROM class_sessions WHERE id = ?", [id]));
}

// Trainer scheduling (Phase 9.2). `batchId` must already be confirmed as
// one of the CALLER'S own assigned batches before this is ever invoked —
// this function itself does no ownership checking (checks happen one
// layer up, in src/lib/trainer/*.js).
export async function createClassSession({ batchId, title, sessionDate, startTime, endTime, meetingUrl, location }) {
  const id = crypto.randomUUID();
  await db.run(
    `INSERT INTO class_sessions (id, batch_id, title, session_date, start_time, end_time, meeting_url, location)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [id, batchId, title, sessionDate, startTime, endTime, meetingUrl || null, location || null]
  );

  return await getClassSessionById(id);
}

// Trainer editing an existing session (Phase 9.2). Ownership must already
// be verified by the caller before this runs.
export async function updateClassSession(id, { title, sessionDate, startTime, endTime, meetingUrl, location, status }) {
  await db.run(
    `UPDATE class_sessions
     SET title = ?, session_date = ?, start_time = ?, end_time = ?, meeting_url = ?, location = ?, status = ?,
         updated_at = app_now()
     WHERE id = ?`,
    [title, sessionDate, startTime, endTime, meetingUrl || null, location || null, status, id]
  );

  return await getClassSessionById(id);
}
