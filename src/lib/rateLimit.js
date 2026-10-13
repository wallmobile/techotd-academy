// Request throttling helpers (production-readiness hardening).
//
// Backed by the shared SQLite file (src/lib/db/rateLimits.js), so the limit
// holds across every server process on this database — NOT per-process
// memory. It does not span multiple hosts with separate database files; a
// multi-host deployment needs a shared store (Redis etc.) or edge/WAF rate
// limiting in front. The client IP comes from X-Forwarded-For / X-Real-IP,
// which is only trustworthy behind reverse proxies you control (see
// trustedProxyHops below).

import crypto from "node:crypto";
import { headers } from "next/headers";
import { consumeRateLimit } from "@/lib/db/rateLimits";

// How many reverse proxies you operate in front of the app (each appends the
// address it saw to X-Forwarded-For). The client address is the entry that
// many places from the RIGHT: everything to its left was supplied by the
// client and can be forged to dodge the limiter. 0 = the app is exposed
// directly (or you don't trust any proxy): forwarding headers are ignored and
// all callers share one "unknown" bucket (per-account limits still apply).
export function trustedProxyHops(env = process.env) {
  const raw = env.TRUSTED_PROXY_HOPS;
  if (raw === undefined || raw === "") return 1;
  const n = Number(raw);
  return Number.isInteger(n) && n >= 0 && n <= 5 ? n : 1;
}

const IP_PATTERN = /^[0-9a-fA-F:.]{2,45}$/;

export function clientIpFromHeaders(get, hops = trustedProxyHops()) {
  if (hops === 0) return "unknown";
  const chain = String(get("x-forwarded-for") || "")
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);
  const candidate = chain.length ? chain[Math.max(0, chain.length - hops)] : String(get("x-real-ip") || "").trim();
  return IP_PATTERN.test(candidate) ? candidate : "unknown";
}

export async function getClientIp() {
  try {
    const h = await headers();
    return clientIpFromHeaders((name) => h.get(name));
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
