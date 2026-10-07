// Shared trainer-identity context (Phase 9.1). Same pattern as
// src/lib/student/*.js's getEnrollmentContext(): every trainer server
// function calls this first, and it derives "who is asking" exclusively
// from getCurrentUser() — there is no trainerId parameter anywhere in the
// trainer domain layer for that reason. A trainer can never see another
// trainer's data by supplying a different id, because no function here
// ever accepts one.

import { getCurrentUser } from "@/lib/auth/currentUser";
import { listBatchIdsForTrainer, isBatchAssignedToTrainer } from "@/lib/db/trainerBatchAssignments";
import { getBatchById } from "@/data/batches";
import { getCourseBySlug } from "@/data/courses";

// Returns null for anyone who isn't a signed-in TRAINER — every caller
// treats that identically to "nothing to show", never a distinct error
// state that would leak whether a resource exists.
export async function getTrainerContext() {
  const user = await getCurrentUser();
  if (!user || user.role !== "TRAINER") return null;

  const batchIds = listBatchIdsForTrainer(user.id);

  return { user, batchIds };
}

// The trainer's assigned batches, enriched with their real batch
// (src/data/batches.js) and course (src/data/courses.js) records. An
// assignment row whose batch id no longer exists in the catalog is
// dropped rather than shown with missing details — same discipline as
// src/lib/student/batches.js's getMyBatchEnrollments().
export function enrichAssignedBatches(batchIds) {
  return batchIds
    .map((batchId) => {
      const batch = getBatchById(batchId);
      if (!batch) return null;
      const course = getCourseBySlug(batch.courseSlug);
      if (!course) return null;
      return { batch, course };
    })
    .filter(Boolean);
}

// Server-side ownership check for a single batch id path segment (e.g.
// /trainer/students/[student-id] needs to know a specific batch belongs
// to this trainer before trusting anything else about it). Never trust a
// batchId supplied by the caller without this.
export async function requireTrainerBatchOwnership(batchId) {
  const ctx = await getTrainerContext();
  if (!ctx) return null;
  if (!isBatchAssignedToTrainer(ctx.user.id, batchId)) return null;
  return ctx;
}
