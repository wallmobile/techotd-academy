// What the lead page shows about the student a lead was converted into
// (Phase 10.3): real account fields and their real enrollments — nothing
// else (no payment / revenue data exists). Callers have already verified
// the viewer is a CRM manager.

import { getUserForEnrollment, listEnrollmentsForUser } from "@/lib/db/enrollments";
import { getBatchById } from "@/data/batches";
import { getCourseBySlug } from "@/data/courses";

export function getEnrollmentsForConvertedStudent(userId) {
  const user = getUserForEnrollment(userId);
  if (!user) return null;
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    enrollments: listEnrollmentsForUser(userId).map((e) => {
      const batch = getBatchById(e.batchId);
      return {
        id: e.id,
        status: e.status,
        courseTitle: batch ? getCourseBySlug(batch.courseSlug)?.title ?? batch.courseSlug : "Unknown course",
        batchLabel: batch ? `${batch.mode} — ${batch.startDate}` : e.batchId,
      };
    }),
  };
}
