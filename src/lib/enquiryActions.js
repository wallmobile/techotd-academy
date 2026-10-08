"use server";

// Server Action behind the public enquiry forms (Phase 10.2). Thin wrapper:
// all validation and persistence lives in src/lib/crm/submit.js.

import { submitLead } from "@/lib/crm/submit";

export async function submitEnquiryAction(payload, variant) {
  return submitLead(payload, variant);
}
