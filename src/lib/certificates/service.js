// Certificate domain layer (Phase 10.5).
//
// Authorization: issuing, revoking, listing and downloading from the admin
// side require an ADMIN or SUPER_ADMIN (getAdminContext — same policy as the
// rest of the Admin area). Students only ever reach their own certificates
// (src/lib/student/certificates.js). Public verification is separate
// (verify.js) and discloses the minimum.
//
// Eligibility is explicit and computed only from data the LMS can prove:
//   1. the enrollment exists and is not CANCELLED;
//   2. the enrollment has been marked COMPLETED by staff;
//   3. every lesson of the course is completed (lesson_progress).
// All three => AUTO_COMPLETE issuance. Attendance and assignment counts are
// shown for context but are NOT part of the rule (no thresholds are
// defined, so none are invented). Staff may issue outside the rule via an
// explicit MANUAL_APPROVAL with a written reason; that is stored and shown
// as a manual approval, never as automatic completion.

import { getAdminContext } from "@/lib/admin/context";
import {
  getEnrollmentForCertificate,
  getLearningEvidence,
  getActiveCertificateFor,
  getCertificateById,
  listCertificates,
  countCertificatesByStatus,
  searchEnrollmentsForCertificate,
  issueCertificateTx,
  revokeCertificateTx,
  listCertificateAudit,
} from "@/lib/db/certificates";
import { computeCourseProgress } from "@/lib/student/progress";
import { buildCertificatePdf } from "@/lib/certificates/pdf";
import { getBatchById } from "@/data/batches";
import { getCourseBySlug } from "@/data/courses";
import { CERTIFICATES_PAGE_SIZE, APPROVAL_NOTE_MIN, NOTE_MAX_LENGTH } from "@/constants/certificates";

const MESSAGES = {
  forbidden: "You don't have permission to do that.",
  enrollment_invalid: "Please choose a valid enrollment.",
  enrollment_cancelled: "A cancelled enrollment can't receive a certificate.",
  not_eligible: "This student has not met the completion requirements. Use manual approval with a reason if staff have confirmed completion.",
  already_issued: "This student already holds an active certificate for this course.",
  note_required: `A manual approval needs a reason of at least ${APPROVAL_NOTE_MIN} characters.`,
  note_long: `Reasons can be at most ${NOTE_MAX_LENGTH} characters.`,
  not_found: "Certificate not found.",
  already_revoked: "This certificate is already revoked.",
  reason_required: "Please give a reason for revoking.",
  revoked: "A revoked certificate can't be downloaded.",
};
export const certificateMessage = (reason) => MESSAGES[reason] || "Something went wrong.";
const fail = (reason, extra = {}) => ({ ok: false, reason, message: certificateMessage(reason), ...extra });

export function verificationUrl(token) {
  const base = (process.env.NEXT_PUBLIC_SITE_URL || "https://academy.techotd.com").replace(/\/+$/, "");
  return `${base}/verify-certificate/${token}`;
}

function courseOf(enrollment) {
  const batch = getBatchById(enrollment.batchId);
  const course = batch ? getCourseBySlug(batch.courseSlug) : null;
  return { batch, course };
}

// Pure read of the eligibility facts for one enrollment. Does not require
// the caller to be staff (the student view never calls this); the admin
// functions below guard it.
function evaluate(enrollmentId) {
  const enrollment = getEnrollmentForCertificate(enrollmentId);
  if (!enrollment) return null;
  const { batch, course } = courseOf(enrollment);
  if (!batch || !course) return null;

  const progress = computeCourseProgress(enrollment.profileId, course);
  const checks = [
    {
      key: "enrollment_active",
      label: "Enrollment is not cancelled",
      passed: enrollment.status !== "CANCELLED",
      detail: `Status: ${enrollment.status}`,
    },
    {
      key: "enrollment_completed",
      label: "Enrollment marked completed by staff",
      passed: enrollment.status === "COMPLETED",
      detail: `Status: ${enrollment.status}`,
    },
    {
      key: "lessons_completed",
      label: "All course lessons completed",
      passed: progress.isComplete,
      detail: `${progress.completedCount} of ${progress.totalCount} lessons`,
    },
  ];
  const existing = getActiveCertificateFor(enrollment.profileId, course.slug);
  return {
    enrollment,
    course,
    batch,
    checks,
    autoEligible: checks.every((c) => c.passed),
    existingCertificateId: existing?.id ?? null,
    evidence: getLearningEvidence(enrollment.profileId, batch.id),
  };
}

export async function getEligibility(enrollmentId) {
  if (!(await getAdminContext())) return null;
  const e = evaluate(enrollmentId);
  if (!e) return null;
  return {
    studentName: e.enrollment.studentName,
    studentEmail: e.enrollment.studentEmail,
    courseSlug: e.course.slug,
    courseTitle: e.course.title,
    batchLabel: `${e.batch.mode} — ${e.batch.startDate}`,
    enrollmentStatus: e.enrollment.status,
    checks: e.checks,
    autoEligible: e.autoEligible,
    existingCertificateId: e.existingCertificateId,
    evidence: e.evidence,
  };
}

export async function getCertificateFormData({ enrollmentId, query }) {
  if (!(await getAdminContext())) return null;
  const eligibility = enrollmentId ? await getEligibility(enrollmentId) : null;
  const usable = eligibility && eligibility.enrollmentStatus !== "CANCELLED" ? eligibility : null;
  return {
    enrollmentId: usable ? enrollmentId : null,
    eligibility: usable,
    candidates: usable
      ? []
      : searchEnrollmentsForCertificate(query || "", (batchId) => getBatchById(batchId)?.courseSlug ?? null).map((c) => {
          const batch = getBatchById(c.batchId);
          return { ...c, courseTitle: batch ? getCourseBySlug(batch.courseSlug)?.title ?? batch.courseSlug : c.batchId };
        }),
  };
}

// mode: "AUTO" (requires full eligibility) | "MANUAL" (requires a reason).
export async function issueCertificate({ enrollmentId, mode, approvalNote }) {
  const ctx = await getAdminContext();
  if (!ctx) return fail("forbidden");

  const e = typeof enrollmentId === "string" ? evaluate(enrollmentId) : null;
  if (!e) return fail("enrollment_invalid");
  if (e.enrollment.status === "CANCELLED") return fail("enrollment_cancelled");

  let basis;
  let note = null;
  if (mode === "AUTO") {
    if (!e.autoEligible) return fail("not_eligible");
    basis = "AUTO_COMPLETE";
  } else if (mode === "MANUAL") {
    note = typeof approvalNote === "string" ? approvalNote.trim() : "";
    if (note.length < APPROVAL_NOTE_MIN) return fail("note_required");
    if (note.length > NOTE_MAX_LENGTH) return fail("note_long");
    basis = "MANUAL_APPROVAL";
  } else {
    return fail("not_eligible");
  }

  const result = issueCertificateTx({
    profileId: e.enrollment.profileId,
    courseSlug: e.course.slug,
    enrollmentId: e.enrollment.id,
    basis,
    approvalNote: note,
    actorUserId: ctx.user.id,
  });
  if (!result.ok) return fail(result.reason, { certificateId: result.certificateId });
  return { ok: true, certificateId: result.certificateId, certificateNumber: result.certificateNumber, studentUserId: e.enrollment.userId };
}

export async function revokeCertificate({ certificateId, reason }) {
  const ctx = await getAdminContext();
  if (!ctx) return fail("forbidden");
  const text = typeof reason === "string" ? reason.trim() : "";
  if (!text) return fail("reason_required");
  if (text.length > NOTE_MAX_LENGTH) return fail("note_long");
  const result = revokeCertificateTx({ certificateId, reason: text, actorUserId: ctx.user.id });
  return result.ok ? { ok: true, certificateId } : fail(result.reason);
}

function describe(cert) {
  return { ...cert, courseTitle: getCourseBySlug(cert.courseSlug)?.title ?? cert.courseSlug };
}

export async function getCertificatesPage({ q, status, course, sort, page }) {
  if (!(await getAdminContext())) return { rows: [], page: 1, totalPages: 1, pageSize: CERTIFICATES_PAGE_SIZE, total: 0 };
  const probe = listCertificates({ q, status, course, sort, limit: 1, offset: 0 });
  const totalPages = Math.max(1, Math.ceil(probe.total / CERTIFICATES_PAGE_SIZE));
  const current = Math.min(Math.max(1, page || 1), totalPages);
  const { rows, total } = listCertificates({ q, status, course, sort, limit: CERTIFICATES_PAGE_SIZE, offset: (current - 1) * CERTIFICATES_PAGE_SIZE });
  return { rows: rows.map(describe), page: current, totalPages, pageSize: CERTIFICATES_PAGE_SIZE, total };
}

export async function getCertificateDetail(certificateId) {
  if (!(await getAdminContext())) return null;
  const cert = getCertificateById(certificateId);
  if (!cert) return null;
  return {
    certificate: describe(cert),
    verifyUrl: cert.verificationToken ? verificationUrl(cert.verificationToken) : null,
    history: listCertificateAudit(cert.id),
  };
}

export async function getCertificateSummary() {
  if (!(await getAdminContext())) return null;
  return countCertificatesByStatus();
}

// Builds the PDF for an ACTIVE certificate. Revoked / unknown -> reason.
export function renderCertificatePdf(cert) {
  if (!cert) return { ok: false, reason: "not_found" };
  if (cert.status !== "ACTIVE") return { ok: false, reason: "revoked" };
  const course = getCourseBySlug(cert.courseSlug);
  const pdf = buildCertificatePdf({
    studentName: cert.studentName,
    courseTitle: course?.title ?? cert.courseSlug,
    certificateNumber: cert.certificateNumber,
    issuedAt: cert.issuedAt,
    verifyUrl: cert.verificationToken ? verificationUrl(cert.verificationToken) : "",
  });
  return { ok: true, pdf, filename: `${cert.certificateNumber}.pdf` };
}

export async function getCertificatePdfForAdmin(certificateId) {
  if (!(await getAdminContext())) return { ok: false, reason: "forbidden" };
  return renderCertificatePdf(getCertificateById(certificateId));
}
