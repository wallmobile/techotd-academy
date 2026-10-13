// Public certificate verification (Phase 10.5). No authentication — this is
// meant to be opened by an employer or institution holding a certificate.
// It discloses the MINIMUM: validity, certificate number, course title,
// issue date, the holder's name and the issuing organization. Never email,
// phone, internal ids, enrollment data or the revocation reason. The lookup
// key is an unguessable random token (not the sequential-looking number);
// an unknown, malformed or oversized token returns null so the route can
// answer with an identical "not found" and reveal nothing.

import { getCertificateByToken } from "@/lib/db/certificates";
import { getCourseBySlug } from "@/data/courses";

const TOKEN_PATTERN = /^[A-Za-z0-9_-]{16,64}$/;

export function getPublicVerification(token) {
  if (typeof token !== "string" || !TOKEN_PATTERN.test(token)) return null;
  const cert = getCertificateByToken(token);
  if (!cert) return null;
  return {
    valid: cert.status === "ACTIVE",
    status: cert.status === "ACTIVE" ? "VALID" : "REVOKED",
    certificateNumber: cert.certificateNumber,
    courseTitle: getCourseBySlug(cert.courseSlug)?.title ?? cert.courseSlug,
    issuedAt: cert.issuedAt,
    holderName: cert.studentName,
    issuer: "TechOTD Academy",
  };
}
