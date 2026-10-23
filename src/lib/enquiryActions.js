"use server";

// Server Action behind the public enquiry forms (Phase 10.2). Thin wrapper:
// all validation and persistence lives in src/lib/crm/submit.js.

import { after } from "next/server";
import { submitLead } from "@/lib/crm/submit";
import { canSendLeadAlert, sendLeadAlert } from "@/lib/crm/leadAlert";
import { getClientIp, hitLimit } from "@/lib/rateLimit";

function runAfterResponse(task) {
  try {
    after(task);
  } catch {
    void task().catch(() => {});
  }
}

// The alert email goes out after the response is sent, so the visitor never
// waits on the email provider. after() keeps the work alive on serverless hosts.
function scheduleLeadAlert(lead) {
  if (!canSendLeadAlert()) return;
  runAfterResponse(async () => {
    const r = await sendLeadAlert(lead);
    if (!r.ok) console.warn(`[leads] new-lead alert email not sent: ${r.code}`);
  });
}

export async function submitEnquiryAction(payload, variant) {
  // Basic abuse control: bounded submissions per client IP.
  const ip = await getClientIp();
  if (!(await hitLimit("enquiry", ip)).allowed) {
    return { ok: false, error: "You have sent several requests recently. Please wait a few minutes and try again." };
  }
  return await submitLead(payload, variant, { onCreated: scheduleLeadAlert });
}
