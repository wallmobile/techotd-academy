// "My Batches" for a trainer (Phase 9.1). Same pattern as
// src/lib/student/batches.js: UI calls these, never src/lib/db/* directly,
// and the trainer identity always comes from getCurrentUser() via
// getTrainerContext() — there is no trainerId parameter anywhere here.

import { getTrainerContext, enrichAssignedBatches } from "@/lib/trainer/context";
import { countActiveBatchEnrollmentsForBatchIds } from "@/lib/db/batchEnrollments";

export async function getMyAssignedBatches() {
  const ctx = await getTrainerContext();
  if (!ctx) return [];

  const assignedBatches = await enrichAssignedBatches(ctx.batchIds);
  const studentCounts = await countActiveBatchEnrollmentsForBatchIds(ctx.batchIds);

  return assignedBatches.map(({ batch, course }) => ({
    batch,
    course,
    studentCount: studentCounts[batch.id] || 0,
  }));
}
