import { db } from "@/lib/db/client";

// Fixed-window counter shared by every process using this database file.
// Consumes one unit for `key` and reports whether the call is within
// `limit` per `windowSeconds`. The read-modify-write runs in an IMMEDIATE
// transaction, so concurrent requests can't both slip under the limit.
export function consumeRateLimit(key, { limit, windowSeconds }) {
  const nowSec = Math.floor(Date.now() / 1000);
  const run = db.transaction(() => {
    const row = db.prepare("SELECT window_start, count FROM rate_limits WHERE key = ?").get(key);
    if (!row || nowSec - row.window_start >= windowSeconds) {
      db.prepare(
        "INSERT INTO rate_limits (key, window_start, count) VALUES (?, ?, 1) ON CONFLICT(key) DO UPDATE SET window_start = excluded.window_start, count = 1"
      ).run(key, nowSec);
      return { allowed: true, remaining: limit - 1, retryAfterSeconds: 0 };
    }
    if (row.count >= limit) {
      return { allowed: false, remaining: 0, retryAfterSeconds: Math.max(1, windowSeconds - (nowSec - row.window_start)) };
    }
    db.prepare("UPDATE rate_limits SET count = count + 1 WHERE key = ?").run(key);
    return { allowed: true, remaining: limit - row.count - 1, retryAfterSeconds: 0 };
  });
  const result = run.immediate();

  // Opportunistic cleanup of long-expired windows (bounded, cheap).
  if (Math.random() < 0.02) {
    db.prepare("DELETE FROM rate_limits WHERE window_start < ?").run(nowSec - 86400);
  }
  return result;
}
