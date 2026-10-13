// Shared guard for every AI-backed feature (Phase 10.9): the caller must be
// a signed-in student, the provider must be configured, and the request must
// fit the per-user limits. The student identity ALWAYS comes from the
// session — no user id is ever accepted from the browser.

import { getCurrentUser } from "@/lib/auth/currentUser";
import { getOrCreateStudentProfile } from "@/lib/db/studentProfiles";
import { listCourseEnrollmentsForStudent } from "@/lib/db/courseEnrollments";
import { countAiCallsToday, recordAiUsage } from "@/lib/db/aiUsage";
import { hitLimit } from "@/lib/rateLimit";
import { isAiConfigured } from "@/lib/ai/provider";

export const DAILY_AI_LIMIT = 50;

// Per-process only: stops one user from stacking parallel provider calls
// within this server process. Cross-process / cross-host protection comes
// from the shared rate limiter and the daily cap below.
const inFlight = new Set();

export async function getAiStudent() {
  const user = await getCurrentUser();
  if (!user || user.role !== "STUDENT") return null;
  const profile = getOrCreateStudentProfile(user.id);
  return { user, profile };
}

// Courses the student is actually (non-cancelled) enrolled in.
export function enrolledCourseSlugs(profileId) {
  return listCourseEnrollmentsForStudent(profileId)
    .filter((e) => e.status !== "CANCELLED")
    .map((e) => e.courseSlug);
}

/**
 * Runs `work()` (the provider call) under the user's limits. Returns
 * { ok: false, reason } without calling the provider when blocked.
 * reasons: not_configured | daily_limit | rate_limited | busy
 */
export async function withAiLimits({ userId, feature, inputChars }, work) {
  if (!isAiConfigured()) return { ok: false, reason: "not_configured" };
  if (countAiCallsToday(userId) >= DAILY_AI_LIMIT) {
    recordAiUsage({ userId, feature, outcome: "blocked", inputChars });
    return { ok: false, reason: "daily_limit" };
  }
  if (!hitLimit("aiAssistant", userId).allowed) {
    recordAiUsage({ userId, feature, outcome: "blocked", inputChars });
    return { ok: false, reason: "rate_limited" };
  }
  if (inFlight.has(userId)) return { ok: false, reason: "busy" };

  inFlight.add(userId);
  try {
    const result = await work();
    recordAiUsage({
      userId,
      feature,
      outcome: result.ok ? "ok" : result.code || "error",
      inputChars,
      outputChars: result.ok ? result.text.length : 0,
      inputTokens: result.inputTokens ?? null,
      outputTokens: result.outputTokens ?? null,
    });
    return { ok: true, result };
  } finally {
    inFlight.delete(userId);
  }
}
