/**
 * Lead/enquiry submission boundary.
 *
 * Phase 6 has no backend, API or database — there is nowhere for a
 * lead to actually be persisted yet. `submitEnquiry` is the single
 * place the UI calls to "submit" a form, so that boundary is easy to
 * swap for a real API call later without touching any form component:
 *
 *   Frontend → submitEnquiry() → (future) API → Lead Service → DB/CRM
 *
 * For now it only validates shape, simulates a brief round trip, and
 * returns a result the UI can show — it never claims the lead was
 * saved, a counsellor was notified, or any message was sent.
 */

export const KNOWN_SOURCES = [
  "homepage",
  "course-detail",
  "training",
  "batches",
  "navbar",
  "trainers",
  "career",
  "resources",
  "about",
  "direct",
];

export function normalizeSource(value) {
  return KNOWN_SOURCES.includes(value) ? value : "direct";
}

/**
 * @param {object} payload
 * @returns {Promise<{ ok: true, receivedAt: string } | { ok: false, error: string }>}
 */
export async function submitEnquiry(payload) {
  if (!payload || typeof payload !== "object") {
    return { ok: false, error: "Invalid submission." };
  }

  // Simulate a brief round trip so the submit state feels real without
  // pretending there's a live backend behind it.
  await new Promise((resolve) => setTimeout(resolve, 400));

  // Phase 6: no server call happens here yet. This is where a future
  // phase would POST `payload` to a real API route.
  return { ok: true, receivedAt: new Date().toISOString() };
}
