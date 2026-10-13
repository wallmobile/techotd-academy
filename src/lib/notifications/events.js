// Business events -> notifications (Phase 10.7). One function per event with
// a clear recipient and user value. Wording is deliberately generic: no
// amounts, payment references, emails or tokens ever appear in a
// notification (it is also what an email would contain). Each event has a
// stable event key so a retried operation can't notify twice.

import { safeNotify } from "@/lib/notifications/service";

const ENROLLMENT_STATUS_COPY = {
  ACTIVE: ["Enrollment reactivated", "Your enrollment in {course} is active."],
  COMPLETED: ["Course marked completed", "Your enrollment in {course} has been marked as completed."],
  CANCELLED: ["Enrollment cancelled", "Your enrollment in {course} has been cancelled."],
};

const fill = (text, vars) => text.replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? "");

export function notifyEnrolled({ userId, enrollmentId, courseTitle, stamp = "" }) {
  return safeNotify({
    userId,
    type: "ENROLLMENT",
    title: "You've been enrolled",
    message: `You have been enrolled in ${courseTitle}.`,
    link: "/student/batches",
    eventKey: `enrollment:${enrollmentId}:enrolled:${stamp}`,
  });
}

export function notifyEnrollmentStatus({ userId, enrollmentId, status, courseTitle, stamp = "" }) {
  const copy = ENROLLMENT_STATUS_COPY[status];
  if (!copy) return null;
  return safeNotify({
    userId,
    type: "ENROLLMENT",
    title: copy[0],
    message: fill(copy[1], { course: courseTitle }),
    link: "/student/batches",
    eventKey: `enrollment:${enrollmentId}:status:${status}:${stamp}`,
  });
}

export function notifyFeeAssigned({ userId, feePlanId, courseTitle }) {
  return safeNotify({
    userId,
    type: "FEE",
    title: "A fee has been assigned",
    message: `A fee has been assigned for ${courseTitle}. You can review it on your Fees page.`,
    link: "/student/fees",
    eventKey: `fee:${feePlanId}:assigned`,
  });
}

export function notifyPaymentRecorded({ userId, paymentId }) {
  return safeNotify({
    userId,
    type: "FEE",
    title: "Payment recorded",
    message: "A payment was recorded against your fee. Your receipt is available on your Fees page.",
    link: "/student/fees",
    eventKey: `payment:${paymentId}:recorded`,
  });
}

export function notifyPaymentVoided({ userId, paymentId }) {
  return safeNotify({
    userId,
    type: "FEE",
    title: "A payment entry was voided",
    message: "A payment entry on your fee was voided by the academy. Please check your Fees page.",
    link: "/student/fees",
    eventKey: `payment:${paymentId}:voided`,
  });
}

export function notifyCertificateIssued({ userId, certificateId, courseTitle }) {
  return safeNotify({
    userId,
    type: "CERTIFICATE",
    title: "Your certificate is ready",
    message: `Your certificate for ${courseTitle} has been issued.`,
    link: `/student/certificates/${certificateId}`,
    eventKey: `certificate:${certificateId}:issued`,
  });
}

export function notifyCertificateRevoked({ userId, certificateId, courseTitle }) {
  return safeNotify({
    userId,
    type: "CERTIFICATE",
    title: "A certificate was revoked",
    message: `Your certificate for ${courseTitle} has been revoked.`,
    link: `/student/certificates/${certificateId}`,
    eventKey: `certificate:${certificateId}:revoked`,
  });
}

export function notifyApplicationStatus({ userId, applicationId, jobTitle, statusLabel, status }) {
  return safeNotify({
    userId,
    type: "PLACEMENT",
    title: "Application update",
    message: `Your application for ${jobTitle} is now: ${statusLabel}.`,
    link: "/student/jobs/applications",
    eventKey: `application:${applicationId}:status:${status}`,
  });
}

export function notifyPlacementConfirmed({ userId, applicationId, jobTitle }) {
  return safeNotify({
    userId,
    type: "PLACEMENT",
    title: "Placement confirmed",
    message: `Congratulations — your placement for ${jobTitle} has been confirmed.`,
    link: "/student/jobs/applications",
    eventKey: `application:${applicationId}:placement`,
  });
}

export function notifyLeadAssigned({ userId, leadId, stamp = "" }) {
  return safeNotify({
    userId,
    type: "CRM",
    title: "A lead was assigned to you",
    message: "A new lead has been assigned to you. Open it to follow up.",
    link: `/admin/leads/${leadId}`,
    eventKey: `lead:${leadId}:assigned:${stamp}`,
  });
}
