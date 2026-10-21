// What the lead page shows about the student a lead was converted into
// (Phase 10.3): real account fields and their real enrollments — nothing
// else (no payment / revenue data exists). Callers have already verified
// the viewer is a CRM manager.

import { getUserForEnrollment, listEnrollmentsForUser } from "@/lib/db/enrollments";
import { getBatch, getCourse } from "@/lib/catalog";

export async function getEnrollmentsForConvertedStudent(userId) {
  const user = await getUserForEnrollment(userId);
  if (!user) return null;
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    enrollments: await Promise.all((await listEnrollmentsForUser(userId)).map(async (e) => {
      const batch = await getBatch(e.batchId);
      return {
        id: e.id,
        status: e.status,
        courseTitle: batch ? (await getCourse(batch.courseSlug))?.title ?? batch.courseSlug : "Unknown course",
        batchLabel: batch ? `${batch.mode} — ${batch.startDate}` : e.batchId,
      };
    })),
  };
}
