"use server";

// Server Action behind the public enquiry forms (Phase 10.2). Thin wrapper:
// all validation and persistence lives in src/lib/crm/submit.js.

import { submitLead } from "@/lib/crm/submit";
import { getClientIp, hitLimit } from "@/lib/rateLimit";

export async function submitEnquiryAction(payload, variant) {
  // Basic abuse control: bounded submissions per client IP.
  const ip = await getClientIp();
  if (!hitLimit("enquiry", ip).allowed) {
    return { ok: false, error: "You have sent several requests recently. Please wait a few minutes and try again." };
  }
  return submitLead(payload, variant);
}
