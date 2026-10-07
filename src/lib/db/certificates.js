import crypto from "node:crypto";
import { db } from "@/lib/db/client";

export const CERTIFICATE_STATUSES = ["ACTIVE", "REVOKED"];

function rowToCertificate(row) {
  if (!row) return null;
  return {
    id: row.id,
    studentId: row.student_id,
    courseSlug: row.course_slug,
    certificateNumber: row.certificate_number,
    issuedAt: row.issued_at,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// `studentId` must always come from the authenticated session (see
// src/lib/student/certificates.js) — never a value a client supplied.
export function listCertificatesForStudent(studentId) {
  return db
    .prepare("SELECT * FROM certificates WHERE student_id = ? ORDER BY issued_at DESC")
    .all(studentId)
    .map(rowToCertificate);
}

// Returns the raw row for any certificate id, regardless of owner —
// ownership is NOT checked here. The caller (getCertificateDetailForStudent
// in src/lib/student/certificates.js) must always compare
// certificate.studentId against the current session's own profile id
// before showing anything; this function exists only so that comparison
// has something to compare against.
export function getCertificateById(id) {
  return rowToCertificate(db.prepare("SELECT * FROM certificates WHERE id = ?").get(id));
}

// Foundation for a future admin/trainer issuance workflow — not wired to
// any UI yet in Phase 8.7. Nothing in this application calls this
// automatically; see the schema.sql note on `certificates` for why.
export function createCertificate({ studentId, courseSlug, certificateNumber, status = "ACTIVE" }) {
  const id = crypto.randomUUID();
  db.prepare(
    `INSERT INTO certificates (id, student_id, course_slug, certificate_number, status)
     VALUES (?, ?, ?, ?, ?)`
  ).run(id, studentId, courseSlug, certificateNumber, status);

  return rowToCertificate(db.prepare("SELECT * FROM certificates WHERE id = ?").get(id));
}
