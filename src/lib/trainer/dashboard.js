// Trainer dashboard aggregation (Phase 9.1). Real data only — every
// figure here is computed from actual DB rows, never fabricated. A metric
// that can't currently be calculated reliably (trainer performance
// analytics, ratings, etc.) is simply not shown, per the spec.

import { getTrainerContext, enrichAssignedBatches } from "@/lib/trainer/context";
import { countActiveBatchEnrollmentsForBatchIds, listEnrolledStudentsForBatchIds } from "@/lib/db/batchEnrollments";
import { listSessionsForBatchIds } from "@/lib/db/classSessions";
import { getMyPendingReviewCount } from "@/lib/trainer/assignments";

function sessionDateTime(session) {
  return new Date(`${session.sessionDate}T${session.startTime}:00`);
}

export async function getTrainerDashboardData() {
  const ctx = await getTrainerContext();
  if (!ctx) return null;

  const { user, batchIds } = ctx;
  const assignedBatches = await enrichAssignedBatches(batchIds);

  const studentCounts = await countActiveBatchEnrollmentsForBatchIds(batchIds);
  const enrolledStudents = await listEnrolledStudentsForBatchIds(batchIds);
  const activeStudentCount = new Set(enrolledStudents.map((s) => s.userId)).size;

  const sessions = (await listSessionsForBatchIds(batchIds)).filter((s) => s.status !== "CANCELLED");
  const now = new Date();
  const upcomingSessions = sessions
    .filter((s) => sessionDateTime(s) >= now)
    .sort((a, b) => sessionDateTime(a) - sessionDateTime(b));

  // Scoped to this trainer's own students (Phase 9.4) — see
  // src/lib/trainer/assignments.js for the ownership model.
  const pendingAssignmentReviews = await getMyPendingReviewCount();

  const batches = assignedBatches.map(({ batch, course }) => ({
    batch,
    course,
    studentCount: studentCounts[batch.id] || 0,
  }));

  return {
    user,
    stats: {
      assignedBatchesCount: assignedBatches.length,
      activeStudentCount,
      pendingAssignmentReviews,
    },
    batches,
    upcomingSessions: upcomingSessions.slice(0, 5).map((session) => {
      const assigned = assignedBatches.find((ab) => ab.batch.id === session.batchId);
      return { ...session, batch: assigned?.batch, course: assigned?.course };
    }),
    nextSession: upcomingSessions[0]
      ? {
          ...upcomingSessions[0],
          batch: assignedBatches.find((ab) => ab.batch.id === upcomingSessions[0].batchId)?.batch,
          course: assignedBatches.find((ab) => ab.batch.id === upcomingSessions[0].batchId)?.course,
        }
      : null,
  };
}
