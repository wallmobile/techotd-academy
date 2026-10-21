import crypto from "node:crypto";
import { db } from "@/lib/db/client";

// All authentication-relevant role values. Centralized here (and re-exported
// from src/lib/auth/roles.js) so no role string is ever hand-typed at a call
// site — see section 18/22 of the Phase 7 spec ("Do not scatter role
// strings throughout the application").
export const ROLES = [
  "SUPER_ADMIN",
  "ADMIN",
  "COUNSELLOR",
  "TRAINER",
  "ACCOUNTANT",
  "CONTENT_MANAGER",
  "PLACEMENT_MANAGER",
  "STUDENT",
];

export const USER_STATUSES = ["ACTIVE", "INACTIVE", "SUSPENDED"];

function rowToSafeUser(row) {
  if (!row) return null;
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    phone: row.phone,
    role: row.role,
    status: row.status,
    emailVerifiedAt: row.email_verified_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// Internal-only shape that includes the password hash. Never exported
// beyond this module / the password-verification step in the auth service.
function rowToInternalUser(row) {
  if (!row) return null;
  return { ...rowToSafeUser(row), passwordHash: row.password_hash };
}

export async function findUserByEmailInternal(email, x = db) {
  const row = await x.get("SELECT * FROM users WHERE email = ?", [email.trim().toLowerCase()]);
  return rowToInternalUser(row);
}

export async function findUserById(id, x = db) {
  const row = await x.get("SELECT * FROM users WHERE id = ?", [id]);
  return rowToSafeUser(row);
}

// Internal-only shape (includes passwordHash) keyed by id rather than
// email. Used only by the change-password flow (Phase 8.8), which already
// has an authenticated user id from the session and needs to re-verify
// their current password before allowing a new one — never exported
// beyond that verification step.
export async function findUserByIdInternal(id) {
  const row = await db.get("SELECT * FROM users WHERE id = ?", [id]);
  return rowToInternalUser(row);
}

export async function createUser({ name, email, phone, passwordHash, role = "STUDENT" }, x = db) {
  const id = crypto.randomUUID();
  const normalizedEmail = email.trim().toLowerCase();

  await x.run(
    `INSERT INTO users (id, name, email, phone, password_hash, role, status)
     VALUES (@id, @name, @email, @phone, @passwordHash, @role, 'ACTIVE')`,
    {
      id,
      name: name.trim(),
      email: normalizedEmail,
      phone: phone ? phone.trim() : null,
      passwordHash,
      role,
    }
  );

  return await findUserById(id, x);
}

export async function updateUserPasswordHash(userId, passwordHash) {
  await db.run("UPDATE users SET password_hash = ?, updated_at = app_now() WHERE id = ?", [passwordHash, userId]);
}

// Profile editing (Phase 8.8): name is the one users-table field a
// student is allowed to change themselves. Role, status, id and email are
// deliberately not updatable here — see src/lib/student/profileActions.js,
// which never even reads those fields from the submitted form.
export async function updateUserName(userId, name) {
  await db.run("UPDATE users SET name = ?, updated_at = app_now() WHERE id = ?", [name.trim(), userId]);
  return await findUserById(userId);
}

// Email-notification preference (Phase 10.10). Defaults to ON; turning it off
// only stops EMAIL deliveries — in-app notifications always continue.
export async function getEmailNotificationsEnabled(userId) {
  const row = await db.get("SELECT email_notifications AS e FROM users WHERE id = ?", [userId]);
  return row ? row.e !== 0 : true;
}

export async function setEmailNotificationsEnabled(userId, enabled) {
  return (await db.run("UPDATE users SET email_notifications = ? WHERE id = ?", [enabled ? 1 : 0, userId])).changes === 1;
}
