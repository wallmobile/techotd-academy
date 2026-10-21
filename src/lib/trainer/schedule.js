// Trainer schedule (Phase 9.2). Same pattern as
// src/lib/student/batches.js's getMySchedule(): every class_sessions row
// belonging to a batch this trainer is actually assigned to — the SAME
// table the student schedule reads from, never a duplicate. Security is
// scoped entirely from the session via getTrainerContext(), never from a
// batchId a caller could supply.

import { getTrainerContext, enrichAssignedBatches } from "@/lib/trainer/context";
import { listSessionsForBatchIds } from "@/lib/db/classSessions";

function sessionDateTime(session) {
  return new Date(`${session.sessionDate}T${session.startTime}:00`);
}

function enrichSession(session, assignedBatches) {
  const assigned = assignedBatches.find((ab) => ab.batch.id === session.batchId);
  return { ...session, batch: assigned?.batch || null, course: assigned?.course || null };
}

export async function getMySchedule() {
  const ctx = await getTrainerContext();
  if (!ctx) return { upcoming: [], past: [], nextSession: null };

  const assignedBatches = await enrichAssignedBatches(ctx.batchIds);
  const sessions = (await listSessionsForBatchIds(ctx.batchIds)).map((s) => enrichSession(s, assignedBatches));

  const now = new Date();
  const upcoming = sessions
    .filter((s) => s.status !== "CANCELLED" && sessionDateTime(s) >= now)
    .sort((a, b) => sessionDateTime(a) - sessionDateTime(b));
  const past = sessions
    .filter((s) => s.status === "CANCELLED" || sessionDateTime(s) < now)
    .sort((a, b) => sessionDateTime(b) - sessionDateTime(a));

  return { upcoming, past, nextSession: upcoming[0] || null };
}
