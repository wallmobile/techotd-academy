/**
 * Lead/enquiry submission boundary.
 *
 * Since Phase 10.2 this is real: every public form calls submitEnquiry(),
 * which invokes a Server Action that re-validates the payload on the server
 * and stores a lead in the database (see src/lib/crm/submit.js):
 *
 *   Form -> submitEnquiry() -> submitEnquiryAction -> submitLead -> leads table -> Admin CRM
 *
 * `ok: true` is returned only after the database write succeeded (or the
 * request was an accidental duplicate of one that already did). It never
 * claims a counsellor was notified or any message was sent — no email/SMS
 * integration exists.
 */

import { KNOWN_SOURCES } from "@/constants/enquirySources";
import { submitEnquiryAction } from "@/lib/enquiryActions";

export { KNOWN_SOURCES };

export function normalizeSource(value) {
  return KNOWN_SOURCES.includes(value) ? value : "direct";
}

/**
 * @param {object} payload
 * @param {"book-demo" | "enquiry" | "quick"} variant which form is submitting
 * @returns {Promise<{ ok: true, receivedAt: string } | { ok: false, error: string }>}
 */
export async function submitEnquiry(payload, variant) {
  try {
    return await submitEnquiryAction(payload, variant);
  } catch {
    return { ok: false, error: "We couldn't submit your request right now. Please try again." };
  }
}
