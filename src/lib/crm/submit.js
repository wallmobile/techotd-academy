// Public lead capture (Phase 10.2): server-side validation + persistence
// for the Book Demo / Enquiry / homepage quick-enquiry forms. Replaces the
// old simulated submitEnquiry(). Kept free of "use server" so it can be
// unit-tested directly; the Server Action wrapper is src/lib/enquiryActions.js.
//
// Everything arriving here is untrusted browser input: client-side
// validation is UX only, so the same rules (validateEnquiryForm) re-run
// here, course/mode/batch are checked against the live catalog, and
// status/assignment are never read from the payload at all (a new lead is
// always NEW and unassigned).

import { createLead, findRecentDuplicateLead } from "@/lib/db/leads";
import { validateEnquiryForm } from "@/lib/validateEnquiry";
import { KNOWN_SOURCES } from "@/constants/enquirySources";
import { getCourseBySlug } from "@/data/courses";
import { getBatchById } from "@/data/batches";
import { trainingModes } from "@/data/trainingModes";
import { LEVELS } from "@/data/courseFilters";

const VARIANTS = ["book-demo", "enquiry", "quick"];
const INVALID_MESSAGE = "Please check the details you entered and try again.";
export const SUBMIT_FAILED_MESSAGE = "We couldn't submit your request right now. Please try again.";

function str(value, max) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

export async function submitLead(payload, variant) {
  if (!payload || typeof payload !== "object" || !VARIANTS.includes(variant)) {
    return { ok: false, error: INVALID_MESSAGE };
  }

  // Over-long values are rejected by the shared validator (name/message) or
  // capped here; never trust the client's maxLength.
  const raw = {
    name: typeof payload.name === "string" ? payload.name : "",
    phone: typeof payload.phone === "string" ? payload.phone : "",
    email: typeof payload.email === "string" ? payload.email : "",
    message: typeof payload.message === "string" ? payload.message : "",
    organization: typeof payload.organization === "string" ? payload.organization : "",
    mode: typeof payload.preferredMode === "string" ? payload.preferredMode : "",
    consent: payload.consent === true,
  };
  const errors = validateEnquiryForm(raw, variant);
  if (Object.keys(errors).length > 0) return { ok: false, error: INVALID_MESSAGE, errors };
  if (raw.phone.length > 30 || raw.email.length > 254 || raw.organization.length > 120) {
    return { ok: false, error: INVALID_MESSAGE };
  }

  // Catalog references: present-but-unknown means tampering (the UI only
  // offers real values), so reject instead of storing a dangling reference.
  const courseSlug = str(payload.interestedCourse, 100);
  if (courseSlug && !getCourseBySlug(courseSlug)) return { ok: false, error: INVALID_MESSAGE };

  const mode = str(payload.preferredMode, 40);
  if (mode && !trainingModes.some((m) => m.slug === mode)) return { ok: false, error: INVALID_MESSAGE };

  const batchId = str(payload.preferredBatch, 100);
  if (batchId) {
    const batch = getBatchById(batchId);
    if (!batch || (courseSlug && batch.courseSlug !== courseSlug)) return { ok: false, error: INVALID_MESSAGE };
  }

  const experienceLevel = str(payload.experienceLevel, 20);
  if (experienceLevel && !LEVELS.includes(experienceLevel)) return { ok: false, error: INVALID_MESSAGE };

  const origin = KNOWN_SOURCES.includes(payload.source) ? payload.source : "direct";

  const lead = {
    name: raw.name.trim(),
    phone: raw.phone.trim(),
    email: raw.email.trim().toLowerCase(),
    organization: mode === "corporate" ? raw.organization.trim() || null : null,
    city: str(payload.city, 80) || null,
    experienceLevel: experienceLevel || null,
    courseSlug: courseSlug || null,
    mode: mode || null,
    batchId: batchId || null,
    message: raw.message.trim() || null,
    source: variant === "book-demo" ? "BOOK_DEMO" : "ENQUIRY",
    origin,
    // The compact hero widget shows a static consent line instead of a
    // checkbox (see validateEnquiry.js); every other form requires it.
    consent: variant === "quick" ? true : raw.consent,
  };

  try {
    // Collapse an accidental double-submit (identical request within a
    // minute) into the lead already stored; a genuine later enquiry is
    // always a new lead.
    if (!findRecentDuplicateLead(lead)) createLead(lead);
    return { ok: true, receivedAt: new Date().toISOString() };
  } catch (error) {
    // Safe diagnostics only: no SQL text, paths, or submitted personal data.
    console.error("[leads] could not persist lead:", error?.code || error?.name || "unknown error");
    return { ok: false, error: SUBMIT_FAILED_MESSAGE };
  }
}
