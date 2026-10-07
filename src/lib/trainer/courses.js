// "My Courses" for a trainer (Phase 9.1). A course appears here ONLY when
// the trainer has at least one assigned batch teaching it — this file
// never queries or duplicates the course catalog directly; it always
// derives courses from the trainer's own assigned batches (spec: "Do NOT
// create a duplicate trainer course catalog").

import { getTrainerContext, enrichAssignedBatches } from "@/lib/trainer/context";
import { countActiveBatchEnrollmentsForBatchIds } from "@/lib/db/batchEnrollments";

export async function getMyCourses() {
  const ctx = await getTrainerContext();
  if (!ctx) return [];

  const assignedBatches = enrichAssignedBatches(ctx.batchIds);
  const studentCounts = countActiveBatchEnrollmentsForBatchIds(ctx.batchIds);

  const byCourseSlug = new Map();
  for (const { batch, course } of assignedBatches) {
    const existing = byCourseSlug.get(course.slug);
    const studentCount = studentCounts[batch.id] || 0;
    if (existing) {
      existing.batches.push(batch);
      existing.activeStudentCount += studentCount;
    } else {
      byCourseSlug.set(course.slug, {
        course,
        batches: [batch],
        activeStudentCount: studentCount,
      });
    }
  }

  return [...byCourseSlug.values()].sort((a, b) => a.course.title.localeCompare(b.course.title));
}
