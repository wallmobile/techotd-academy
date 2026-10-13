import crypto from "node:crypto";
import { db } from "@/lib/db/client";
import { writeAudit } from "@/lib/db/fees";

export const CERTIFICATE_STATUSES = ["ACTIVE", "REVOKED"];
export const ISSUANCE_BASES = ["AUTO_COMPLETE", "MANUAL_APPROVAL"];

// Certificate persistence. Phase 8.7 introduced the read helpers; Phase 10.5
// adds issuance, verification and revocation. Issuance and revocation are
// single transactions that also write an audit_log row. Authorization and
// eligibility are decided one layer up (src/lib/certificates/service.js);
// the invariants that must never break — one ACTIVE certificate per student
// + course, unique number and token — are re-checked / enforced here.

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
    enrollmentId: row.enrollment_id ?? null,
    verificationToken: row.verification_token ?? null,
    issuedBy: row.issued_by ?? null,
    issuedByName: row.issued_by_name ?? null,
    issuanceBasis: row.issuance_basis ?? null,
    approvalNote: row.approval_note ?? null,
    revokedAt: row.revoked_at ?? null,
    revokedReason: row.revoked_reason ?? null,
    studentUserId: row.student_user_id ?? null,
    studentName: row.student_name ?? null,
    studentEmail: row.student_email ?? null,
  };
}

const SELECT = `SELECT c.*, u.id AS student_user_id, u.name AS student_name, u.email AS student_email, iu.name AS issued_by_name
  FROM certificates c
  JOIN student_profiles sp ON sp.id = c.student_id
  JOIN users u ON u.id = sp.user_id
  LEFT JOIN users iu ON iu.id = c.issued_by`;

// `studentId` must always come from the authenticated session (see
// src/lib/student/certificates.js) — never a value a client supplied.
export function listCertificatesForStudent(studentId) {
  return db
    .prepare(`${SELECT} WHERE c.student_id = ? ORDER BY c.issued_at DESC, c.id ASC`)
    .all(studentId)
    .map(rowToCertificate);
}

// Returns the row for any certificate id, regardless of owner — ownership is
// NOT checked here; callers compare studentId (or use staff authorization).
export function getCertificateById(id) {
  if (!id || typeof id !== "string") return null;
  return rowToCertificate(db.prepare(`${SELECT} WHERE c.id = ?`).get(id));
}

export function getCertificateByToken(token) {
  if (!token || typeof token !== "string" || token.length > 100) return null;
  return rowToCertificate(db.prepare(`${SELECT} WHERE c.verification_token = ?`).get(token));
}

export function getActiveCertificateFor(studentProfileId, courseSlug) {
  return rowToCertificate(
    db.prepare(`${SELECT} WHERE c.student_id = ? AND c.course_slug = ? AND c.status = 'ACTIVE'`).get(studentProfileId, courseSlug)
  );
}

function likePattern(q) {
  return `%${q.replace(/[\\%_]/g, (c) => `\\${c}`)}%`;
}

const SORTS = {
  newest: "c.issued_at DESC, c.id ASC",
  oldest: "c.issued_at ASC, c.id ASC",
  name: "u.name COLLATE NOCASE ASC, c.id ASC",
};
export const CERTIFICATE_SORT_KEYS = Object.keys(SORTS);

export function listCertificates({ q = "", status = "", course = "", sort = "newest", limit = 20, offset = 0 }) {
  const clauses = [];
  const params = {};
  if (status) {
    clauses.push("c.status = @status");
    params.status = status;
  }
  if (course) {
    clauses.push("c.course_slug = @course");
    params.course = course;
  }
  if (q) {
    clauses.push("(u.name LIKE @q ESCAPE '\\' OR u.email LIKE @q ESCAPE '\\' OR c.certificate_number LIKE @q ESCAPE '\\')");
    params.q = likePattern(q);
  }
  const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
  const rows = db
    .prepare(`${SELECT} ${where} ORDER BY ${SORTS[sort] || SORTS.newest} LIMIT @limit OFFSET @offset`)
    .all({ ...params, limit, offset });
  const total = db
    .prepare(
      `SELECT COUNT(*) AS c FROM certificates c JOIN student_profiles sp ON sp.id = c.student_id JOIN users u ON u.id = sp.user_id ${where}`
    )
    .get(params).c;
  return { rows: rows.map(rowToCertificate), total };
}

export function countCertificatesByStatus() {
  const counts = { ACTIVE: 0, REVOKED: 0 };
  for (const r of db.prepare("SELECT status, COUNT(*) AS c FROM certificates GROUP BY status").all()) counts[r.status] = r.c;
  return counts;
}

// Enrollments the picker can offer: not cancelled, whose student has no
// ACTIVE certificate for that course yet. Search only, capped.
export function searchEnrollmentsForCertificate(q, courseBatchLookup, limit = 20) {
  const where = q ? "AND (u.name LIKE @q ESCAPE '\\' OR u.email LIKE @q ESCAPE '\\')" : "";
  const params = q ? { q: likePattern(q), limit: limit * 3 } : { limit: limit * 3 };
  const rows = db
    .prepare(
      `SELECT be.id, be.batch_id, be.status, u.name AS student_name, u.email AS student_email, sp.id AS profile_id
       FROM batch_enrollments be
       JOIN student_profiles sp ON sp.id = be.student_id
       JOIN users u ON u.id = sp.user_id
       WHERE be.status != 'CANCELLED' ${where}
       ORDER BY (be.status = 'COMPLETED') DESC, u.name COLLATE NOCASE ASC LIMIT @limit`
    )
    .all(params);
  return rows
    .filter((r) => {
      const courseSlug = courseBatchLookup(r.batch_id);
      return courseSlug && !getActiveCertificateFor(r.profile_id, courseSlug);
    })
    .slice(0, limit)
    .map((r) => ({ id: r.id, batchId: r.batch_id, status: r.status, studentName: r.student_name, studentEmail: r.student_email }));
}

// Enrollment + owner, for eligibility checks and issuance.
export function getEnrollmentForCertificate(enrollmentId) {
  if (!enrollmentId || typeof enrollmentId !== "string") return null;
  const r = db
    .prepare(
      `SELECT be.id, be.batch_id, be.status, be.student_id AS profile_id, u.id AS user_id, u.name AS student_name,
              u.email AS student_email, u.status AS user_status
       FROM batch_enrollments be
       JOIN student_profiles sp ON sp.id = be.student_id
       JOIN users u ON u.id = sp.user_id
       WHERE be.id = ?`
    )
    .get(enrollmentId);
  if (!r) return null;
  return {
    id: r.id,
    batchId: r.batch_id,
    status: r.status,
    profileId: r.profile_id,
    userId: r.user_id,
    studentName: r.student_name,
    studentEmail: r.student_email,
    userStatus: r.user_status,
  };
}

// Informational LMS evidence shown beside the eligibility result (it is not
// part of the automatic rule — no thresholds are defined for these).
export function getLearningEvidence(profileId, batchId) {
  const attendance = db
    .prepare(
      `SELECT COUNT(*) AS total, COALESCE(SUM(status = 'PRESENT'), 0) AS present FROM attendance_records
       WHERE student_id = ? AND batch_id = ?`
    )
    .get(profileId, batchId);
  const submissions = db
    .prepare("SELECT COUNT(*) AS c FROM assignment_submissions WHERE student_id = ?")
    .get(profileId).c;
  return { attendanceTotal: attendance.total, attendancePresent: attendance.present, submissions };
}

function newCertificateNumber() {
  const suffix = crypto.randomBytes(5).toString("hex").toUpperCase();
  return `TOA-${new Date().getUTCFullYear()}-${suffix}`;
}

// Issues a certificate atomically. Returns { ok, certificateId, ... } or
// { ok: false, reason }. `basis` AUTO_COMPLETE | MANUAL_APPROVAL.
export function issueCertificateTx({ profileId, courseSlug, enrollmentId, basis, approvalNote, actorUserId }) {
  const run = db.transaction(() => {
    const existing = db
      .prepare("SELECT id FROM certificates WHERE student_id = ? AND course_slug = ? AND status = 'ACTIVE'")
      .get(profileId, courseSlug);
    if (existing) return { ok: false, reason: "already_issued", certificateId: existing.id };

    const id = crypto.randomUUID();
    const token = crypto.randomBytes(18).toString("base64url");
    let number = newCertificateNumber();
    for (let attempt = 0; attempt < 5 && db.prepare("SELECT 1 FROM certificates WHERE certificate_number = ?").get(number); attempt += 1) {
      number = newCertificateNumber();
    }
    db.prepare(
      `INSERT INTO certificates (id, student_id, course_slug, certificate_number, status, enrollment_id,
         verification_token, issued_by, issuance_basis, approval_note)
       VALUES (?, ?, ?, ?, 'ACTIVE', ?, ?, ?, ?, ?)`
    ).run(id, profileId, courseSlug, number, enrollmentId, token, actorUserId, basis, approvalNote || null);
    writeAudit({
      actorUserId,
      action: "CERTIFICATE_ISSUED",
      entityType: "certificate",
      entityId: id,
      detail: { certificateNumber: number, courseSlug, enrollmentId, basis, approvalNote: approvalNote || null },
    });
    return { ok: true, certificateId: id, certificateNumber: number, verificationToken: token };
  });
  return run.immediate();
}

export function revokeCertificateTx({ certificateId, reason, actorUserId }) {
  const run = db.transaction(() => {
    const cert = db.prepare("SELECT status, certificate_number FROM certificates WHERE id = ?").get(certificateId);
    if (!cert) return { ok: false, reason: "not_found" };
    if (cert.status === "REVOKED") return { ok: false, reason: "already_revoked" };
    db.prepare(
      `UPDATE certificates SET status = 'REVOKED', revoked_at = datetime('now'), revoked_reason = ?, revoked_by = ?,
         updated_at = datetime('now') WHERE id = ?`
    ).run(reason, actorUserId, certificateId);
    writeAudit({
      actorUserId,
      action: "CERTIFICATE_REVOKED",
      entityType: "certificate",
      entityId: certificateId,
      detail: { certificateNumber: cert.certificate_number, reason },
    });
    return { ok: true };
  });
  return run.immediate();
}

export function listCertificateAudit(certificateId) {
  return db
    .prepare(
      `SELECT a.action, a.detail, a.created_at, u.name AS actor_name FROM audit_log a
       LEFT JOIN users u ON u.id = a.actor_user_id
       WHERE a.entity_type = 'certificate' AND a.entity_id = ? ORDER BY a.created_at DESC, a.rowid DESC`
    )
    .all(certificateId)
    .map((r) => ({ action: r.action, detail: r.detail ? JSON.parse(r.detail) : null, at: r.created_at, actorName: r.actor_name }));
}

// Retained from Phase 8.7 (a low-level foundation helper; the real issuance
// path is issueCertificateTx). New rows always get a verification token.
export function createCertificate({ studentId, courseSlug, certificateNumber, status = "ACTIVE" }) {
  const id = crypto.randomUUID();
  db.prepare(
    `INSERT INTO certificates (id, student_id, course_slug, certificate_number, status, verification_token)
     VALUES (?, ?, ?, ?, ?, ?)`
  ).run(id, studentId, courseSlug, certificateNumber, status, crypto.randomBytes(18).toString("base64url"));
  return getCertificateById(id);
}
