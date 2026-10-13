import crypto from "node:crypto";
import { db } from "@/lib/db/client";

// Minimal AI usage metadata (Phase 10.9): who, which feature, outcome and
// sizes — NEVER the prompt or the answer. Used for the per-user daily cap and
// for operators to see usage.

export function recordAiUsage({ userId, feature, outcome, inputChars = 0, outputChars = 0, inputTokens = null, outputTokens = null }) {
  db.prepare(
    `INSERT INTO ai_usage (id, user_id, feature, outcome, input_chars, output_chars, input_tokens, output_tokens)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(crypto.randomUUID(), userId, feature, outcome, inputChars, outputChars, inputTokens, outputTokens);
}

// Provider calls this user has made since the start of the current UTC day.
export function countAiCallsToday(userId) {
  return db
    .prepare("SELECT COUNT(*) AS c FROM ai_usage WHERE user_id = ? AND outcome != 'blocked' AND created_at >= date('now')")
    .get(userId).c;
}

export function aiUsageSummary() {
  return db
    .prepare(
      `SELECT feature, outcome, COUNT(*) AS c FROM ai_usage WHERE created_at >= datetime('now', '-30 days') GROUP BY feature, outcome`
    )
    .all();
}
