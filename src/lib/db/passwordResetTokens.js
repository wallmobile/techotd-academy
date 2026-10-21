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
export async function createPasswordResetTokenForEmail(email) {
  const user = await findUserByEmailInternal(email);
  if (!user) return null;

  const token = crypto.randomBytes(32).toString("base64url");
  const tokenHash = hashToken(token);
  const id = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + RESET_TOKEN_DURATION_MS).toISOString();

  await db.run(
    `INSERT INTO password_reset_tokens (id, user_id, token_hash, expires_at)
     VALUES (?, ?, ?, ?)`,
    [id, user.id, tokenHash, expiresAt]
  );

  return { token, userId: user.id };
}

// Validates a raw reset token: must exist, be unexpired, and unused.
export async function getValidPasswordResetToken(token) {
  if (!token) return null;
  const tokenHash = hashToken(token);
  const row = await db.get("SELECT * FROM password_reset_tokens WHERE token_hash = ?", [tokenHash]);

  if (!row) return null;
  if (row.used_at) return null;
  if (new Date(row.expires_at).getTime() <= Date.now()) return null;

  return { id: row.id, userId: row.user_id };
}

export async function markPasswordResetTokenUsed(tokenId) {
  await db.run("UPDATE password_reset_tokens SET used_at = app_now() WHERE id = ?", [tokenId]);
}

// Completes a reset atomically (Phase 9.4): consumes the token, sets the
// new password hash and revokes EVERY existing session for that user, all
// in one transaction — so a failure part-way can't leave a changed
// password with live old sessions, and two concurrent submissions of the
// same token can't both succeed (the `used_at IS NULL` guard lets only the
// first UPDATE change a row). Any other still-outstanding reset tokens for
// the user are retired too. Returns true on success, false if the token
// was already consumed. The user must sign in again afterwards.
export async function completePasswordReset({ tokenId, userId, passwordHash }) {
  return await db.tx(async (t) => {
    // Row-level: a concurrent second submission blocks on this UPDATE and then sees used_at set.
    const consumed = await t.run("UPDATE password_reset_tokens SET used_at = app_now() WHERE id = ? AND used_at IS NULL", [tokenId]);
    if (consumed.changes !== 1) return false;

    await t.run("UPDATE users SET password_hash = ?, updated_at = app_now() WHERE id = ?", [passwordHash, userId]);
    await t.run("UPDATE password_reset_tokens SET used_at = app_now() WHERE user_id = ? AND used_at IS NULL", [userId]);
    await t.run("DELETE FROM sessions WHERE user_id = ?", [userId]);
    return true;
  });
}
