// Certificate server functions (Phase 8.7, extended in 10.5). Same pattern
// as the rest of src/lib/student/*: the UI calls this, never src/lib/db/*
// directly, and the student identity always comes from getCurrentUser() —
// there is no studentId parameter anywhere in this file.

import { getCurrentUser } from "@/lib/auth/currentUser";
import { getOrCreateStudentProfile } from "@/lib/db/studentProfiles";
import { listCertificatesForStudent, getCertificateById } from "@/lib/db/certificates";
import { getCourse } from "@/lib/catalog";
import { renderCertificatePdf, verificationUrl } from "@/lib/certificates/service";

// Only what a student needs: staff-side fields (issuer, approval note,
// revocation reason, enrollment link) are not passed to the page.
function publicView(certificate) {
  return {
    id: certificate.id,
    certificateNumber: certificate.certificateNumber,
    courseSlug: certificate.courseSlug,
    issuedAt: certificate.issuedAt,
    status: certificate.status,
    revokedAt: certificate.revokedAt,
    verifyUrl: certificate.verificationToken ? verificationUrl(certificate.verificationToken) : null,
  };
}

// Every real certificate this student holds (including revoked ones, shown
// as revoked), enriched with its course. Nothing is created here — an empty
// result is a real empty state.
export async function getMyCertificates() {
  const user = await getCurrentUser();
  if (!user || user.role !== "STUDENT") return [];

  const profile = getOrCreateStudentProfile(user.id);

  return listCertificatesForStudent(profile.id)
    .map((certificate) => ({ ...publicView(certificate), course: getCourse(certificate.courseSlug) }))
    .filter((certificate) => Boolean(certificate.course));
}

// Certificate detail for /student/certificates/[certificate-id]. Returns
// null whenever this student shouldn't see it — doesn't exist, or belongs
// to a different student — so the caller responds with the same notFound()
// either way.
export async function getCertificateDetailForStudent(certificateId) {
  const user = await getCurrentUser();
  if (!user || user.role !== "STUDENT") return null;

  const profile = getOrCreateStudentProfile(user.id);
  const certificate = getCertificateById(certificateId);
  if (!certificate) return null;
  if (certificate.studentId !== profile.id) return null;

  const course = getCourse(certificate.courseSlug);
  if (!course) return null;

  return { certificate: publicView(certificate), course, studentName: user.name };
}

// The student's own certificate as a PDF. Only ACTIVE certificates render.
export async function getMyCertificatePdf(certificateId) {
  const user = await getCurrentUser();
  if (!user || user.role !== "STUDENT") return { ok: false, reason: "not_found" };
  const profile = getOrCreateStudentProfile(user.id);
  const certificate = getCertificateById(certificateId);
  if (!certificate || certificate.studentId !== profile.id) return { ok: false, reason: "not_found" };
  return renderCertificatePdf(certificate);
}
