import crypto from "node:crypto";
import { processDeliveries } from "@/lib/notifications/service";

// Queue-processing endpoint for an external scheduler (cron / platform
// scheduler). Disabled (404) unless CRON_SECRET is set, and requires the
// secret in the `x-cron-secret` header, compared in constant time. A wrong
// or missing secret also answers 404 so the endpoint reveals nothing.
// Bounded: at most 25 deliveries per call.
function secretMatches(provided, expected) {
  const a = crypto.createHash("sha256").update(String(provided ?? "")).digest();
  const b = crypto.createHash("sha256").update(expected).digest();
  return crypto.timingSafeEqual(a, b);
}

export async function POST(request) {
  const expected = process.env.CRON_SECRET;
  if (!expected || !secretMatches(request.headers.get("x-cron-secret"), expected)) {
    return new Response("Not found", { status: 404 });
  }
  const summary = await processDeliveries({ limit: 25 });
  return Response.json(summary, { headers: { "Cache-Control": "no-store" } });
}
