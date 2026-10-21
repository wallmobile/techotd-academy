// Trainer attendance (Phase 9.2). Same pattern as the rest of the trainer
// domain layer: identity from getCurrentUser() via getTrainerContext(),
// ownership re-derived from the database on every call — never from an id
// a caller supplied. Reads/writes the SAME attendance_records table the
// student attendance page reads from (src/lib/student/attendance.js) —
// no separate trainer attendance data.

import { getTrainerContext, enrichAssignedBatches } from "@/lib/trainer/context";
import { listSessionsForBatchIds, getClassSessionById } from "@/lib/db/classSessions";
import { listEnrolledStudentsForBatchIds } from "@/lib/db/batchEnrollments";
import { listAttendanceForClassSession, markAttendanceBulk } from "@/lib/db/attendanceRecords";
import { ATTENDANCE_STATUSES } from "@/lib/db/attendanceRecords";

// Every class session across the trainer's assigned batches, most recent
// first — the picklist for /trainer/attendance. Reuses the same
// class_sessions rows as the schedule; this file doesn't add a second
// query for "which sessions can I take attendance for".
export async function getAttendanceSessionOptions() {
  const ctx = await getTrainerContext();
  if (!ctx) return [];

  const assignedBatches = await enrichAssignedBatches(ctx.batchIds);
  return (await listSessionsForBatchIds(ctx.batchIds))
    .map((session) => {
      const assigned = assignedBatches.find((ab) => ab.batch.id === session.batchId);
      if (!assigned) return null;
      return { ...session, batch: assigned.batch, course: assigned.course };
    })
    .filter(Boolean)
    .sort((a, b) => new Date(`${b.sessionDate}T${b.startTime}`) - new Date(`${a.sessionDate}T${a.startTime}`));
}

// Roster for a single class session's attendance form. Returns null for
// "doesn't exist" AND "exists but its batch isn't assigned to this
// trainer" identically (spec Step 4's ownership chain, same as class
// session management: Class Session -> Batch -> assigned to Trainer).
// Each enrolled student is paired with their EXISTING mark for this
// session if one was already saved, so reopening the form shows what was
// previously recorded rather than a blank slate.
export async function getAttendanceRosterForSession(classSessionId) {
  const ctx = await getTrainerContext();
  if (!ctx) return null;

  const session = await getClassSessionById(classSessionId);
  if (!session) return null;
  if (!ctx.batchIds.includes(session.batchId)) return null;

  const assignedBatches = await enrichAssignedBatches(ctx.batchIds);
  const assigned = assignedBatches.find((ab) => ab.batch.id === session.batchId);
  if (!assigned) return null;

  const enrolledStudents = await listEnrolledStudentsForBatchIds([session.batchId]);
  const existingRecords = await listAttendanceForClassSession(classSessionId);
  const recordByStudentId = new Map(existingRecords.map((r) => [r.studentId, r]));

  const roster = enrolledStudents.map((student) => ({
    studentProfileId: student.studentProfileId,
    name: student.name,
    email: student.email,
    currentStatus: recordByStudentId.get(student.studentProfileId)?.status || null,
  }));

  return { session, batch: assigned.batch, course: assigned.course, roster };
}

// Trainer bulk attendance save. `entries` is [{ studentProfileId, status }],
// exactly what the roster form posts. Ownership is re-verified from the
// database (not trusted from the form), and every student id is checked
// against the batch's REAL enrollment list before anything is written —
// a forged studentProfileId that isn't actually enrolled in this
// session's batch is silently dropped, never written.
export async function saveAttendanceForSession(classSessionId, entries) {
  const ctx = await getTrainerContext();
  if (!ctx) return { ok: false, reason: "not_a_trainer" };

  const session = await getClassSessionById(classSessionId);
  if (!session || !ctx.batchIds.includes(session.batchId)) {
    return { ok: false, reason: "not_owned" };
  }

  const enrolledStudents = await listEnrolledStudentsForBatchIds([session.batchId]);
  const enrolledIds = new Set(enrolledStudents.map((s) => s.studentProfileId));

  const validRecords = entries
    .filter((entry) => enrolledIds.has(entry.studentProfileId) && ATTENDANCE_STATUSES.includes(entry.status))
    .map((entry) => ({
      studentId: entry.studentProfileId,
      batchId: session.batchId,
      classSessionId: session.id,
      status: entry.status,
    }));

  if (validRecords.length === 0) return { ok: false, reason: "no_valid_entries" };

  await markAttendanceBulk(validRecords);
  return { ok: true, count: validRecords.length };
}
