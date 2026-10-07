// Certificate server functions (Phase 8.7). Same pattern as the rest of
// src/lib/student/*: the UI calls this, never src/lib/db/* directly, and
// the student identity always comes from getCurrentUser() — there is no
// studentId parameter anywhere in this file.

import { getCurrentUser } from "@/lib/auth/currentUser";
import { getOrCreateStudentProfile } from "@/lib/db/studentProfiles";
import { listCertificatesForStudent, getCertificateById } from "@/lib/db/certificates";
import { getCourseBySlug } from "@/data/courses";

// Every real certificate this student holds, enriched with its course.
// No certificate is ever created here — see the schema.sql note on
// `certificates` — so an empty result is a real empty state.
export async function getMyCertificates() {
  const user = await getCurrentUser();
  if (!user || user.role !== "STUDENT") return [];

  const profile = getOrCreateStudentProfile(user.id);

  return listCertificatesForStudent(profile.id)
    .map((certificate) => ({ ...certificate, course: getCourseBySlug(certificate.courseSlug) }))
    .filter((certificate) => Boolean(certificate.course));
}

// Certificate detail for /student/certificates/[certificate-id]. Returns
// null whenever this student shouldn't see it — doesn't exist, or belongs
// to a different student — so the caller can respond with the same
// notFound() either way, never confirming that a certificate id exists
// for someone else. `certificateId` is public URL data; ownership is the
// one thing that's never taken on trust from it.
export async function getCertificateDetailForStudent(certificateId) {
  const user = await getCurrentUser();
  if (!user || user.role !== "STUDENT") return null;

  const profile = getOrCreateStudentProfile(user.id);
  const certificate = getCertificateById(certificateId);
  if (!certificate) return null;
  if (certificate.studentId !== profile.id) return null;

  const course = getCourseBySlug(certificate.courseSlug);
  if (!course) return null;

  return { certificate, course, studentName: user.name };
}
