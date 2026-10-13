// AI provider boundary (Phase 10.9). Server-side only.
//
// Configuration — all server environment variables, nothing hard-coded:
//   AI_PROVIDER        "anthropic"      (the only adapter implemented)
//   ANTHROPIC_API_KEY  provider key      (secret — never sent to the browser)
//   AI_MODEL           model identifier  (REQUIRED; there is deliberately no
//                                         default, so the app never points at
//                                         a model you haven't chosen)
// Optional: AI_MAX_OUTPUT_TOKENS (default 600, capped at 1000),
//           AI_TIMEOUT_MS (default 20000, capped at 30000).
//
// If anything required is missing the provider is "not configured" and the
// AI features show a disabled state — they never fabricate an answer. The
// adapter has been exercised only against a mocked fetch; it has NOT been
// verified against the real service (no credentials exist in this project).
// There are no tools / function calling: the model can only return text.
// There are no automatic retries (a failed call is surfaced, not repeated).

const ENDPOINT = "https://api.anthropic.com/v1/messages";
const API_VERSION = "2023-06-01";
export const MAX_OUTPUT_CHARS = 3000;

function clampInt(raw, fallback, min, max) {
  const n = Number.parseInt(String(raw ?? ""), 10);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, n));
}

export function getAiConfig(env = process.env) {
  if (env.AI_PROVIDER !== "anthropic") return null;
  if (!env.ANTHROPIC_API_KEY || !env.AI_MODEL) return null;
  return {
    provider: "anthropic",
    apiKey: env.ANTHROPIC_API_KEY,
    model: env.AI_MODEL,
    maxOutputTokens: clampInt(env.AI_MAX_OUTPUT_TOKENS, 600, 50, 1000),
    timeoutMs: clampInt(env.AI_TIMEOUT_MS, 20000, 1000, 30000),
  };
}

export function isAiConfigured() {
  return getAiConfig() !== null;
}

// Strips control characters and bounds length. The result is always rendered
// as plain text (React-escaped) — never as HTML or markdown.
export function sanitizeAiText(text, maxChars = MAX_OUTPUT_CHARS) {
  return String(text ?? "")
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "")
    .replace(/\n{4,}/g, "\n\n\n")
    .trim()
    .slice(0, maxChars);
}

/**
 * Single-turn text generation. Never throws. Returns
 *   { ok: true, text, inputTokens, outputTokens }
 *   { ok: false, code }  code ∈ not_configured | timeout | network_error |
 *                         provider_error | rate_limited_by_provider |
 *                         malformed_response | empty_response
 * `fetchImpl` / `config` are injectable for tests. The provider's response
 * body is never returned or logged on failure.
 */
export async function generateText({ system, user, maxTokens }, { config = getAiConfig(), fetchImpl = globalThis.fetch } = {}) {
  if (!config) return { ok: false, code: "not_configured" };

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), config.timeoutMs);
  try {
    const response = await fetchImpl(ENDPOINT, {
      method: "POST",
      headers: {
        "x-api-key": config.apiKey,
        "anthropic-version": API_VERSION,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: config.model,
        max_tokens: Math.min(maxTokens || config.maxOutputTokens, config.maxOutputTokens),
        system,
        messages: [{ role: "user", content: user }],
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      return { ok: false, code: response.status === 429 ? "rate_limited_by_provider" : "provider_error" };
    }
    let data;
    try {
      data = await response.json();
    } catch {
      return { ok: false, code: "malformed_response" };
    }
    if (!data || !Array.isArray(data.content)) return { ok: false, code: "malformed_response" };
    const text = data.content
      .filter((block) => block && block.type === "text" && typeof block.text === "string")
      .map((block) => block.text)
      .join("\n");
    const clean = sanitizeAiText(text);
    if (!clean) return { ok: false, code: "empty_response" };
    return {
      ok: true,
      text: clean,
      inputTokens: Number.isFinite(data.usage?.input_tokens) ? data.usage.input_tokens : null,
      outputTokens: Number.isFinite(data.usage?.output_tokens) ? data.usage.output_tokens : null,
    };
  } catch (error) {
    return { ok: false, code: error?.name === "AbortError" ? "timeout" : "network_error" };
  } finally {
    clearTimeout(timer);
  }
}
