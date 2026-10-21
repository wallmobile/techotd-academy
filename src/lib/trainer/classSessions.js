// Trainer class-session detail + ownership (Phase 9.2). Same pattern as
// the rest of the trainer domain layer: identity from getCurrentUser()
// via getTrainerContext(), never a trainerId/batchId a caller supplied.

import { getTrainerContext, enrichAssignedBatches } from "@/lib/trainer/context";
import { getClassSessionById } from "@/lib/db/classSessions";

// Session detail for /trainer/classes/[class-session-id]. Returns null
// for "doesn't exist" AND "exists but its batch isn't assigned to this
// trainer" identically — Class Session -> belongs to a Batch -> Batch is
// assigned to current Trainer (spec Step 4) is the ONE check every
// caller (view, edit, delete-in-future) goes through.
export async function getClassSessionDetailForTrainer(classSessionId) {
  const ctx = await getTrainerContext();
  if (!ctx) return null;

  const session = await getClassSessionById(classSessionId);
  if (!session) return null;
  if (!ctx.batchIds.includes(session.batchId)) return null;

  const assignedBatches = await enrichAssignedBatches(ctx.batchIds);
  const assigned = assignedBatches.find((ab) => ab.batch.id === session.batchId);
  if (!assigned) return null;

  return { session, batch: assigned.batch, course: assigned.course };
}

// The trainer's own assigned batches, for the "which batch is this
// session for" <select> on the create/edit form — never the full batch
// catalog.
export async function getMyBatchOptions() {
  const ctx = await getTrainerContext();
  if (!ctx) return [];
  return await enrichAssignedBatches(ctx.batchIds);
}
