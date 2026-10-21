// Self-service password change for signed-in STAFF (admin-area roles). Same
// rules as the student profile flow (src/lib/student/profileActions.js):
//  - the CURRENT password is required, not just an active session;
//  - the new password is validated (length, confirmation, differs from current);
//  - on success EVERY session for the user is revoked and a fresh one is
//    started for this browser, so any other signed-in device (or an attacker
//    holding a stolen session) is signed out.
// Extras for privileged accounts: current-password guessing is rate limited per
// user, and the change is audited (who/when only - never any password data).
// Nothing here returns, logs or stores a password.

import { getCurrentUser } from "@/lib/auth/currentUser";
import { STAFF_ROLES } from "@/lib/auth/roles";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { startSession, isCurrentSessionRemembered } from "@/lib/auth/session";
import { updateUserPasswordHash, findUserByIdInternal } from "@/lib/db/users";
import { deleteAllSessionsForUser } from "@/lib/db/sessions";
import { validateChangePasswordForm } from "@/lib/validateAuth";
import { hitLimit } from "@/lib/rateLimit";
import { writeAudit } from "@/lib/db/audit";

export const CHANGE_PASSWORD_MESSAGES = {
  forbidden: "You need to be signed in as a staff member to change your password here.",
  rate_limited: "Too many attempts. Please wait a few minutes and try again.",
  wrong_current: "That current password is incorrect.",
};

/**
 * values: { currentPassword, password, confirmPassword } (untrusted strings).
 * Returns { ok: true } | { ok: false, reason, errors?, message? }.
 */
export async function changeStaffPassword(values) {
  const user = await getCurrentUser();
  if (!user || !STAFF_ROLES.includes(user.role)) return { ok: false, reason: "forbidden", message: CHANGE_PASSWORD_MESSAGES.forbidden };

  const errors = validateChangePasswordForm(values);
  if (Object.keys(errors).length > 0) return { ok: false, reason: "invalid", errors };

  // Counted on every real attempt (including wrong ones) so the current password
  // can't be brute-forced from a hijacked session.
  if (!(await hitLimit("changePassword", user.id)).allowed) return { ok: false, reason: "rate_limited", message: CHANGE_PASSWORD_MESSAGES.rate_limited };

  const internal = await findUserByIdInternal(user.id);
  if (!internal || !(await verifyPassword(values.currentPassword, internal.passwordHash))) {
    return { ok: false, reason: "wrong_current", errors: { currentPassword: CHANGE_PASSWORD_MESSAGES.wrong_current } };
  }

  await updateUserPasswordHash(user.id, await hashPassword(values.password));
  // Read the "remember me" choice before the session row it depends on is deleted.
  const remember = await isCurrentSessionRemembered();
  await deleteAllSessionsForUser(user.id);
  await startSession(user.id, { remember });
  await writeAudit(user.id, "account.password_changed", "user", user.id, { sessionsRevoked: true });
  return { ok: true };
}
