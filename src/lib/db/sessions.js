import crypto from "node:crypto";
import { db } from "@/lib/db/client";
import { findUserById } from "@/lib/db/users";

const REMEMBERED_DURATION_MS = 1000 * 60 * 60 * 24 * 14; // 14 days
const DEFAULT_DURATION_MS = 1000 * 60 * 60 * 24; // 1 day

function hashToken(token) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

// Creates a session row and returns the RAW token (this is the only time
// the raw value exists — only its sha256 hash is persisted). The raw token
// is what goes into the HTTP-only cookie.
//
// `remember` controls both how long the server-side session stays valid
// and (via the caller, session.js) whether the cookie itself persists
// across browser restarts — an unchecked "Remember me" still gets a real
// session, just a shorter-lived, non-persistent one.
export function createSession(userId, { remember = false } = {}) {
  const token = crypto.randomBytes(32).toString("base64url");
  const tokenHash = hashToken(token);
  const id = crypto.randomUUID();
  const durationMs = remember ? REMEMBERED_DURATION_MS : DEFAULT_DURATION_MS;
  const expiresAt = new Date(Date.now() + durationMs).toISOString();

  db.prepare(
    `INSERT INTO sessions (id, user_id, token_hash, expires_at)
     VALUES (?, ?, ?, ?)`
  ).run(id, userId, tokenHash, expiresAt);

  return { token, expiresAt, maxAgeSeconds: Math.floor(durationMs / 1000) };
}

// Resolves a raw cookie token to its current user, or null if the session
// doesn't exist / has expired. Expired sessions are opportunistically
// cleaned up here rather than requiring a separate cron job.
export function getUserBySessionToken(token) {
  if (!token) return null;
  const tokenHash = hashToken(token);
  const session = db
    .prepare("SELECT * FROM sessions WHERE token_hash = ?")
    .get(tokenHash);

  if (!session) return null;

  if (new Date(session.expires_at).getTime() <= Date.now()) {
    db.prepare("DELETE FROM sessions WHERE id = ?").run(session.id);
    return null;
  }

  return findUserById(session.user_id);
}

// Whether the session identified by this raw cookie token was created with
// `remember: true` — inferred from its total lifetime (there's no separate
// stored flag; REMEMBERED_DURATION_MS vs DEFAULT_DURATION_MS are far enough
// apart that a midpoint threshold is unambiguous). Used by
// changePasswordAction so a password change doesn't silently downgrade a
// remembered session to a browser-session cookie.
export function isRememberedSessionToken(token) {
  if (!token) return false;
  const tokenHash = hashToken(token);
  const session = db.prepare("SELECT * FROM sessions WHERE token_hash = ?").get(tokenHash);
  if (!session) return false;

  const lifetimeMs = new Date(session.expires_at).getTime() - new Date(session.created_at).getTime();
  return lifetimeMs > (REMEMBERED_DURATION_MS + DEFAULT_DURATION_MS) / 2;
}

// Server-side session invalidation for logout — deleting the row is what
// makes logout real, independent of whatever the client does with its
// cookie afterward.
export function deleteSessionByToken(token) {
  if (!token) return;
  const tokenHash = hashToken(token);
  db.prepare("DELETE FROM sessions WHERE token_hash = ?").run(tokenHash);
}

// Invalidates every session for a user (Phase 8.8: "Invalidate existing
// sessions if appropriate" on password change). Used by changePasswordAction,
// which deletes all of them and then immediately starts a fresh session for
// the browser that just made the change — so a password change effectively
// signs the account out everywhere else while leaving the person who just
// changed it signed in.
export function deleteAllSessionsForUser(userId) {
  db.prepare("DELETE FROM sessions WHERE user_id = ?").run(userId);
}
