// Password-reset email delivery (production readiness, Phase 10.10).
//
// The reset link carries the raw one-time token, so it goes straight to the
// email provider and is deliberately NOT written to the notification outbox
// (the database only ever stores the token's hash). Callers should not await
// this on the request path: the provider round trip would make "account
// exists" measurably slower than "no such account".

import { buildEmailContent, isEmailConfigured, sendEmail } from "@/lib/notifications/email";

export const RESET_EMAIL_SUBJECT = "Reset your TechOTD Academy password";

function siteUrl(env = process.env) {
  return (env.NEXT_PUBLIC_SITE_URL || "").trim();
}

// True only when a reset link can actually reach someone: an email provider
// AND an absolute site URL to build the link from.
export function canDeliverResetEmail(env = process.env) {
  return isEmailConfigured() && siteUrl(env) !== "";
}

/**
 * Sends the reset link. Never throws; resolves to
 * { ok: true } or { ok: false, code } (short machine code, no secrets).
 */
export async function deliverPasswordResetEmail({ to, token }, opts) {
  if (!siteUrl()) return { ok: false, code: "site_url_not_configured" };
  try {
    const { text, html } = buildEmailContent({
      title: RESET_EMAIL_SUBJECT,
      message:
        "We received a request to reset the password for your TechOTD Academy account. The link below is valid for 30 minutes and can be used once. If you didn't ask for this, you can ignore this email.",
      link: `/reset-password?token=${encodeURIComponent(token)}`,
    });
    const result = await sendEmail({ to, subject: RESET_EMAIL_SUBJECT, text, html }, opts);
    return result.ok ? { ok: true } : { ok: false, code: result.code };
  } catch {
    return { ok: false, code: "unexpected_error" };
  }
}
