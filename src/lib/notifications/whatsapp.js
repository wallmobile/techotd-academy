// WhatsApp integration BOUNDARY (Phase 10.7).
//
// STATUS: not integrated. No WhatsApp provider, credentials or approved
// message templates exist in this project, so this module can never send a
// message and never reports one as delivered or sent.
//
// What is here, so a real provider can be attached safely later:
//  - E.164 recipient validation;
//  - a registry of the template names the application would use (WhatsApp
//    Business requires pre-approved templates);
//  - an explicit consent gate: a message may only go to a recipient who has
//    opted in. The database has NO WhatsApp opt-in field yet, so
//    hasWhatsAppConsent() is always false — nothing can be sent until opt-in
//    capture is built and a provider (WHATSAPP_PROVIDER, WHATSAPP_API_TOKEN,
//    WHATSAPP_PHONE_NUMBER_ID) is configured and verified.

const E164 = /^\+[1-9]\d{7,14}$/;

export const WHATSAPP_TEMPLATES = Object.freeze({
  enrollment_confirmed: { params: ["course"] },
  payment_recorded: { params: ["course"] },
  certificate_issued: { params: ["course"] },
  application_update: { params: ["job", "status"] },
});

export function isWhatsAppConfigured(env = process.env) {
  return Boolean(env.WHATSAPP_PROVIDER && env.WHATSAPP_API_TOKEN && env.WHATSAPP_PHONE_NUMBER_ID);
}

export function isValidWhatsAppNumber(value) {
  return typeof value === "string" && E164.test(value);
}

// No opt-in storage exists, so consent can never be assumed.
export function hasWhatsAppConsent() {
  return false;
}

export function whatsAppStatus() {
  return {
    configured: isWhatsAppConfigured(),
    available: false,
    reason: isWhatsAppConfigured()
      ? "A provider is configured but no recipient opt-in capture exists, so messages are not sent."
      : "No WhatsApp provider is configured.",
  };
}

/**
 * Never sends. Returns the precise reason so callers and logs stay honest.
 * { ok: false, code } where code is one of: unknown_template,
 * invalid_recipient, provider_not_configured, no_consent.
 */
export async function sendWhatsApp({ to, template, params = {} }) {
  const def = WHATSAPP_TEMPLATES[template];
  if (!def || !def.params.every((p) => typeof params[p] === "string" && params[p].length > 0)) {
    return { ok: false, code: "unknown_template" };
  }
  if (!isValidWhatsAppNumber(to)) return { ok: false, code: "invalid_recipient" };
  if (!isWhatsAppConfigured()) return { ok: false, code: "provider_not_configured" };
  if (!hasWhatsAppConsent()) return { ok: false, code: "no_consent" };
  return { ok: false, code: "provider_not_implemented" };
}
