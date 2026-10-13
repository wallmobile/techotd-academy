// Request throttling helpers (production-readiness hardening).
//
// Backed by the shared SQLite file (src/lib/db/rateLimits.js), so the limit
// holds across every server process on this database — NOT per-process
// memory. It does not span multiple hosts with separate database files; a
// multi-host deployment needs a shared store (Redis etc.) or edge/WAF rate
// limiting in front. The client IP comes from X-Forwarded-For / X-Real-IP,
// which is only trustworthy when a reverse proxy you control sets it.

import crypto from "node:crypto";
import { headers } from "next/headers";
import { consumeRateLimit } from "@/lib/db/rateLimits";

export async function getClientIp() {
  try {
    const h = await headers();
    const forwarded = h.get("x-forwarded-for");
    const ip = (forwarded ? forwarded.split(",")[0] : h.get("x-real-ip")) || "";
    return ip.trim().slice(0, 64) || "unknown";
  } catch {
    return "unknown";
  }
}

// Hash identifiers (emails, ips) so the table never stores them in clear.
function bucket(parts) {
  return crypto.createHash("sha256").update(parts.join("|")).digest("hex").slice(0, 32);
}

export const LIMITS = {
  login: { limit: 10, windowSeconds: 15 * 60 },
  loginIp: { limit: 60, windowSeconds: 15 * 60 },
  forgotPassword: { limit: 5, windowSeconds: 15 * 60 },
  enquiry: { limit: 10, windowSeconds: 10 * 60 },
  verifyCertificate: { limit: 60, windowSeconds: 60 },
  aiAssistant: { limit: 20, windowSeconds: 10 * 60 },
};

// Returns { allowed, remaining, retryAfterSeconds }. Every named limiter is
// keyed by a hash of (name, ...identity parts).
export function hitLimit(name, ...identity) {
  const cfg = LIMITS[name];
  if (!cfg) throw new Error(`Unknown rate limiter: ${name}`);
  return consumeRateLimit(`${name}:${bucket([name, ...identity])}`, cfg);
}
