// Email provider boundary (Phase 10.7). Server-side only.
//
// Configuration (all server environment variables; nothing is hard-coded):
//
//   EMAIL_PROVIDER   "resend" or "smtp"
//
//   Resend:
//     RESEND_API_KEY provider API key    (secret — never sent to the browser)
//     EMAIL_FROM     verified sender, e.g. "TechOTD Academy <no-reply@your-domain>"
//
//   SMTP (any mailbox: Gmail / Google Workspace with an App Password, Zoho, Brevo, ...):
//     SMTP_HOST      e.g. smtp.gmail.com
//     SMTP_PORT      optional, default 587 (STARTTLS); 465 uses implicit TLS
//     SMTP_USER      the mailbox login
//     SMTP_PASS      its password / app password (secret)
//     EMAIL_FROM     optional; defaults to "TechOTD Academy <SMTP_USER>"
//
// If anything required is missing the provider is "not configured": nothing is
// sent, in-app notifications continue to work, and each email delivery is
// recorded as SKIPPED with the reason.

const RESEND_ENDPOINT = "https://api.resend.com/emails";
const REQUEST_TIMEOUT_MS = 8000;
const SMTP_TIMEOUT_MS = 15000;
const EMAIL_PATTERN = /^[^\s@<>()",;:]+@[^\s@<>()",;:]+\.[^\s@<>()",;:]+$/;

export function getEmailConfig(env = process.env) {
  if (env.EMAIL_PROVIDER === "smtp") {
    if (!env.SMTP_HOST || !env.SMTP_USER || !env.SMTP_PASS) return null;
    const port = Number(env.SMTP_PORT || 587);
    if (!Number.isInteger(port) || port <= 0 || port > 65535) return null;
    return {
      provider: "smtp",
      host: env.SMTP_HOST,
      port,
      user: env.SMTP_USER,
      // Google shows App Passwords as "abcd efgh ijkl mnop"; the spaces aren't part of it.
      pass: /^[a-z]{4}( [a-z]{4}){3}$/i.test(env.SMTP_PASS.trim()) ? env.SMTP_PASS.replace(/\s+/g, "") : env.SMTP_PASS,
      from: env.EMAIL_FROM || `TechOTD Academy <${env.SMTP_USER}>`,
    };
  }
  if (env.EMAIL_PROVIDER !== "resend") return null;
  if (!env.RESEND_API_KEY || !env.EMAIL_FROM) return null;
  return { provider: "resend", apiKey: env.RESEND_API_KEY, from: env.EMAIL_FROM };
}

// SMTP error codes worth retrying: 4xx replies are temporary by definition,
// connection-level failures usually are too. Auth failures (535) and 5xx
// rejections are permanent until the configuration changes.
function smtpFailure(error) {
  const status = Number(error?.responseCode);
  if (status >= 400 && status < 500) return { ok: false, retryable: true, code: `smtp_${status}` };
  if (status >= 500) return { ok: false, retryable: false, code: `smtp_${status}` };
  if (error?.code === "EAUTH") return { ok: false, retryable: false, code: "smtp_auth" };
  if (error?.code === "ETIMEDOUT") return { ok: false, retryable: true, code: "timeout" };
  return { ok: false, retryable: true, code: "network_error" };
}

let cachedTransport = null;
async function getSmtpTransport(config) {
  const key = `${config.host}:${config.port}:${config.user}`;
  if (cachedTransport?.key === key) return cachedTransport.transport;
  const { default: nodemailer } = await import("nodemailer");
  const transport = nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.port === 465,
    requireTLS: config.port !== 465,
    auth: { user: config.user, pass: config.pass },
    connectionTimeout: SMTP_TIMEOUT_MS,
    greetingTimeout: SMTP_TIMEOUT_MS,
    socketTimeout: SMTP_TIMEOUT_MS,
  });
  cachedTransport = { key, transport };
  return transport;
}

async function sendViaSmtp({ to, subject, text, html, replyTo }, config, transportImpl) {
  try {
    const transport = transportImpl ?? (await getSmtpTransport(config));
    const info = await transport.sendMail({
      from: config.from,
      to,
      subject,
      text,
      html,
      ...(isValidRecipient(replyTo) ? { replyTo } : {}),
    });
    const id = typeof info?.messageId === "string" ? info.messageId.slice(0, 100) : null;
    return { ok: true, providerMessageId: id };
  } catch (error) {
    return smtpFailure(error);
  }
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
 * `fetchImpl` (Resend) and `transportImpl` (SMTP) are injectable for tests.
 */
export async function sendEmail(
  { to, subject, text, html, replyTo },
  { config = getEmailConfig(), fetchImpl = globalThis.fetch, transportImpl } = {},
) {
  if (!config) return { ok: false, retryable: false, code: "provider_not_configured" };
  if (!isValidRecipient(to)) return { ok: false, retryable: false, code: "invalid_recipient" };
  if (config.provider === "smtp") return sendViaSmtp({ to, subject, text, html, replyTo }, config, transportImpl);

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
