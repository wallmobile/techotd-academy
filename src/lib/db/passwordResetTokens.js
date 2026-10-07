import crypto from "node:crypto";
import { db } from "@/lib/db/client";
import { findUserByEmailInternal } from "@/lib/db/users";

const RESET_TOKEN_DURATION_MS = 1000 * 60 * 30; // 30 minutes — short-lived

function hashToken(token) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

// Creates a single-use, short-lived reset token for the given email if
// (and only if) an account exists for it. Returns the RAW token (only time
// it exists in plaintext) or null when there's no such account — callers
// must still return the same public response either way, to avoid leaking
// which emails are registered (account enumeration).
export function createPasswordResetTokenForEmail(email) {
  const user = findUserByEmailInternal(email);
  if (!user) return null;

  const token = crypto.randomBytes(32).toString("base64url");
  const tokenHash = hashToken(token);
  const id = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + RESET_TOKEN_DURATION_MS).toISOString();

  db.prepare(
    `INSERT INTO password_reset_tokens (id, user_id, token_hash, expires_at)
     VALUES (?, ?, ?, ?)`
  ).run(id, user.id, tokenHash, expiresAt);

  return { token, userId: user.id };
}

// Validates a raw reset token: must exist, be unexpired, and unused.
export function getValidPasswordResetToken(token) {
  if (!token) return null;
  const tokenHash = hashToken(token);
  const row = db
    .prepare("SELECT * FROM password_reset_tokens WHERE token_hash = ?")
    .get(tokenHash);

  if (!row) return null;
  if (row.used_at) return null;
  if (new Date(row.expires_at).getTime() <= Date.now()) return null;

  return { id: row.id, userId: row.user_id };
}

export function markPasswordResetTokenUsed(tokenId) {
  db.prepare(
    "UPDATE password_reset_tokens SET used_at = datetime('now') WHERE id = ?"
  ).run(tokenId);
}

// Completes a reset atomically (Phase 9.4): consumes the token, sets the
// new password hash and revokes EVERY existing session for that user, all
// in one transaction — so a failure part-way can't leave a changed
// password with live old sessions, and two concurrent submissions of the
// same token can't both succeed (the `used_at IS NULL` guard lets only the
// first UPDATE change a row). Any other still-outstanding reset tokens for
// the user are retired too. Returns true on success, false if the token
// was already consumed. The user must sign in again afterwards.
export function completePasswordReset({ tokenId, userId, passwordHash }) {
  const run = db.transaction(() => {
    const consumed = db
      .prepare("UPDATE password_reset_tokens SET used_at = datetime('now') WHERE id = ? AND used_at IS NULL")
      .run(tokenId);
    if (consumed.changes !== 1) return false;

    db.prepare("UPDATE users SET password_hash = ?, updated_at = datetime('now') WHERE id = ?").run(
      passwordHash,
      userId
    );
    db.prepare(
      "UPDATE password_reset_tokens SET used_at = datetime('now') WHERE user_id = ? AND used_at IS NULL"
    ).run(userId);
    db.prepare("DELETE FROM sessions WHERE user_id = ?").run(userId);
    return true;
  });
  return run();
}
