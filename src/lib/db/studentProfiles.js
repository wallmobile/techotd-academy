import crypto from "node:crypto";
import { db } from "@/lib/db/client";

function rowToProfile(row) {
  if (!row) return null;
  return {
    id: row.id,
    userId: row.user_id,
    phone: row.phone,
    city: row.city,
    avatarUrl: row.avatar_url,
    bio: row.bio,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function getStudentProfileByUserId(userId) {
  const row = db.prepare("SELECT * FROM student_profiles WHERE user_id = ?").get(userId);
  return rowToProfile(row);
}

// Idempotent: returns the existing profile for userId, or creates one on
// first access. The UNIQUE(user_id) constraint in schema.sql is what
// actually guarantees "a user must not have multiple StudentProfile
// records" — even under a race between two requests, only one INSERT can
// win, and the loser just re-reads the row the winner created.
export function getOrCreateStudentProfile(userId) {
  const existing = getStudentProfileByUserId(userId);
  if (existing) return existing;

  const id = crypto.randomUUID();
  try {
    db.prepare("INSERT INTO student_profiles (id, user_id) VALUES (?, ?)").run(id, userId);
  } catch (error) {
    if (!String(error.message).includes("UNIQUE")) throw error;
  }
  return getStudentProfileByUserId(userId);
}

// Profile editing (Phase 8.8): phone/city/avatarUrl/bio are the
// student_profiles-owned fields a student can update themselves — never
// role, status, id, or email, which don't live in this table at all.
// `updates` is a plain object of only the columns to change; omitted keys
// are left untouched (this is a partial update, not a full-row replace).
export function updateStudentProfileFields(profileId, { phone, city, avatarUrl, bio }) {
  db.prepare(
    `UPDATE student_profiles
     SET phone = ?, city = ?, avatar_url = ?, bio = ?, updated_at = datetime('now')
     WHERE id = ?`
  ).run(phone || null, city || null, avatarUrl || null, bio || null, profileId);

  return rowToProfile(db.prepare("SELECT * FROM student_profiles WHERE id = ?").get(profileId));
}
