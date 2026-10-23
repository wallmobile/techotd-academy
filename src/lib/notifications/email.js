// Email provider boundary (Phase 10.7). Server-side only.
//
// Configuration (all server environment variables; nothing is hard-coded):
//   EMAIL_PROVIDER   "resend"            (the only adapter implemented)
//   RESEND_API_KEY   provider API key    (secret — never sent to the browser)
//   EMAIL_FROM       verified sender, e.g. "TechOTD Academy <no-reply@your-domain>"
//
// If any of these is missing the provider is "not configured": nothing is
// sent, in-app notifications continue to work, and each email delivery is
// recorded as SKIPPED with the reason. The Resend adapter below has been
// exercised only against a mocked fetch — it has NOT been verified against
// the real service (no credentials exist in this project).

const RESEND_ENDPOINT = "https://api.resend.com/emails";
const REQUEST_TIMEOUT_MS = 8000;
const EMAIL_PATTERN = /^[^\s@<>()",;:]+@[^\s@<>()",;:]+\.[^\s@<>()",;:]+$/;

export function getEmailConfig(env = process.env) {
  if (env.EMAIL_PROVIDER !== "resend") return null;
  if (!env.RESEND_API_KEY || !env.EMAIL_FROM) return null;
  return { provider: "resend", apiKey: env.RESEND_API_KEY, from: env.EMAIL_FROM };
}

export function isEmailConfigured() {
  return getEmailConfig() !== null;
}

export function isValidRecipient(address) {
  return typeof address === "string" && address.length <= 254 && EMAIL_PATTERN.test(address);
}

export function escapeHtml(text) {
  return String(text).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

// Builds a plain, safe message. All dynamic text is escaped for HTML; the
// link (if any) is an absolute URL only when the site URL is configured.
export function buildEmailContent({ title, message, link }) {
  const base = process.env.NEXT_PUBLIC_SITE_URL ? process.env.NEXT_PUBLIC_SITE_URL.replace(/\/+$/, "") : "";
  const url = link && link.startsWith("/") && base ? `${base}${link}` : null;
  const text = `${message}${url ? `\n\nOpen: ${url}` : ""}\n\n— TechOTD Academy`;
  const html =
    `<p>${escapeHtml(message)}</p>` +
    (url ? `<p><a href="${escapeHtml(url)}">Open in TechOTD Academy</a></p>` : "") +
    `<p style="color:#64748b">— TechOTD Academy</p>`;
  return { subject: String(title).slice(0, 200), text, html };
}

/**
 * Sends one email. Never throws. Returns
 *   { ok: true, providerMessageId }
 *   { ok: false, retryable: boolean, code }   // code is a short machine code
 * `replyTo` is optional and dropped unless it is a valid address.
 * `fetchImpl` is injectable for tests.
 */
export async function sendEmail({ to, subject, text, html, replyTo }, { config = getEmailConfig(), fetchImpl = globalThis.fetch } = {}) {
  if (!config) return { ok: false, retryable: false, code: "provider_not_configured" };
  if (!isValidRecipient(to)) return { ok: false, retryable: false, code: "invalid_recipient" };

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const response = await fetchImpl(RESEND_ENDPOINT, {
      method: "POST",
      headers: { Authorization: `Bearer ${config.apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: config.from,
        to: [to],
        subject,
        text,
        html,
        ...(isValidRecipient(replyTo) ? { reply_to: replyTo } : {}),
      }),
      signal: controller.signal,
    });
    if (response.ok) {
      let id = null;
      try {
        id = (await response.json())?.id ?? null;
      } catch {
        id = null;
      }
      return { ok: true, providerMessageId: typeof id === "string" ? id.slice(0, 100) : null };
    }
    // 429 and 5xx are transient; other 4xx (bad key, rejected sender or
    // recipient) won't succeed on retry. The response body is never kept.
    const transient = response.status === 429 || response.status >= 500;
    return { ok: false, retryable: transient, code: `http_${response.status}` };
  } catch (error) {
    return { ok: false, retryable: true, code: error?.name === "AbortError" ? "timeout" : "network_error" };
  } finally {
    clearTimeout(timer);
  }
}
