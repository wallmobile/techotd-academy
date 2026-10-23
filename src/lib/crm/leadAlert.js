// New-lead alert email. Server-side only.
//
// When LEAD_ALERT_EMAIL is set (and the email provider is configured, see
// src/lib/notifications/email.js), every newly stored lead is also emailed
// to that address so the team hears about it without polling /admin/leads.
// The lead itself is always saved first; this alert is best-effort, never
// throws, and a failure only logs a short code (no personal data).
//
// Reply-To is set to the visitor's address, so answering the alert email
// replies to the person who submitted the form.

import { escapeHtml, isEmailConfigured, isValidRecipient, sendEmail } from "@/lib/notifications/email";
import { getCourse } from "@/lib/catalog";

export function getLeadAlertRecipient(env = process.env) {
  const to = (env.LEAD_ALERT_EMAIL || "").trim();
  return isValidRecipient(to) ? to : null;
}

export function canSendLeadAlert(env = process.env) {
  return isEmailConfigured() && getLeadAlertRecipient(env) !== null;
}

function siteBase(env = process.env) {
  return (env.NEXT_PUBLIC_SITE_URL || "").trim().replace(/\/+$/, "");
}

export function buildLeadAlertEmail(lead, { courseTitle = null } = {}) {
  const kind = lead.source === "BOOK_DEMO" ? "Book Demo request" : "Enquiry";
  const rows = [
    ["Name", lead.name],
    ["Phone", lead.phone],
    ["Email", lead.email],
    ["Course", courseTitle || lead.courseSlug],
    ["Mode", lead.mode],
    ["Batch", lead.batchId],
    ["Organization", lead.organization],
    ["City", lead.city],
    ["Experience", lead.experienceLevel],
    ["Message", lead.message],
    ["Form", `${kind}${lead.origin ? ` (from ${lead.origin})` : ""}`],
  ].filter(([, value]) => value);

  const base = siteBase();
  const url = base && lead.id ? `${base}/admin/leads/${encodeURIComponent(lead.id)}` : null;

  const subject = `New ${kind}: ${lead.name}`.slice(0, 200);
  const text =
    rows.map(([label, value]) => `${label}: ${value}`).join("\n") +
    (url ? `\n\nOpen in admin: ${url}` : "") +
    "\n\n— TechOTD Academy";
  const html =
    `<p>A new ${escapeHtml(kind.toLowerCase())} was submitted on the website.</p>` +
    `<table cellpadding="6" style="border-collapse:collapse">` +
    rows
      .map(
        ([label, value]) =>
          `<tr><td style="color:#64748b;vertical-align:top">${escapeHtml(label)}</td>` +
          `<td style="white-space:pre-wrap">${escapeHtml(value)}</td></tr>`
      )
      .join("") +
    `</table>` +
    (url ? `<p><a href="${escapeHtml(url)}">Open this lead in TechOTD Academy</a></p>` : "") +
    `<p style="color:#64748b">— TechOTD Academy</p>`;
  return { subject, text, html };
}

/**
 * Emails a newly created lead to LEAD_ALERT_EMAIL. Never throws; resolves to
 * { ok: true } or { ok: false, code } (short machine code, no personal data).
 */
export async function sendLeadAlert(lead, opts) {
  const to = getLeadAlertRecipient();
  if (!to) return { ok: false, code: "recipient_not_configured" };
  try {
    let courseTitle = null;
    if (lead.courseSlug) {
      try {
        courseTitle = (await getCourse(lead.courseSlug))?.title ?? null;
      } catch {
        courseTitle = null;
      }
    }
    const content = buildLeadAlertEmail(lead, { courseTitle });
    const result = await sendEmail({ to, replyTo: lead.email, ...content }, opts);
    return result.ok ? { ok: true } : { ok: false, code: result.code };
  } catch {
    return { ok: false, code: "unexpected_error" };
  }
}
