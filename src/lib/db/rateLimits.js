import { db } from "@/lib/db/client";

// Fixed-window counter shared by EVERY process and instance using this database.
// Consumes one unit for `key` and reports whether the call is within `limit` per
// `windowSeconds`. It is ONE atomic statement: INSERT ... ON CONFLICT DO UPDATE
// takes the row lock, so concurrent requests are serialized on the key and cannot
// both slip under the limit (checked with a concurrency test). The `allowed`
// column records the outcome of the last attempt so the same statement can report it.
export async function consumeRateLimit(key, { limit, windowSeconds }) {
  const nowSec = Math.floor(Date.now() / 1000);
  const row = await db.get(
    `INSERT INTO rate_limits AS r (key, window_start, count, allowed)
     VALUES (@key, @now, 1, TRUE)
     ON CONFLICT (key) DO UPDATE SET
       window_start = CASE WHEN @now - r.window_start >= @window THEN @now ELSE r.window_start END,
       count = CASE WHEN @now - r.window_start >= @window THEN 1
                    WHEN r.count >= @limit THEN r.count
                    ELSE r.count + 1 END,
       allowed = CASE WHEN @now - r.window_start >= @window THEN TRUE
                      WHEN r.count >= @limit THEN FALSE
                      ELSE TRUE END
     RETURNING window_start, count, allowed`,
    { key, now: nowSec, window: windowSeconds, limit }
  );

  // Opportunistic cleanup of long-expired windows (bounded, cheap).
  if (Math.random() < 0.02) {
    await db.run("DELETE FROM rate_limits WHERE window_start < ?", [nowSec - 86400]);
  }

  if (row.allowed) return { allowed: true, remaining: Math.max(0, limit - row.count), retryAfterSeconds: 0 };
  return { allowed: false, remaining: 0, retryAfterSeconds: Math.max(1, windowSeconds - (nowSec - row.window_start)) };
}
