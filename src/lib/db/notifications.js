import crypto from "node:crypto";
import { db } from "@/lib/db/client";

export const NOTIFICATION_TYPES = ["GENERAL", "COURSE", "BATCH", "ASSIGNMENT", "SYSTEM"];

function rowToNotification(row) {
  if (!row) return null;
  return {
    id: row.id,
    userId: row.user_id,
    title: row.title,
    message: row.message,
    type: row.type,
    readAt: row.read_at,
    createdAt: row.created_at,
  };
}

// `userId` must always come from the authenticated session (see
// src/lib/student/notifications.js) — never a value a client supplied.
export function listNotificationsForUser(userId) {
  return db
    .prepare("SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC")
    .all(userId)
    .map(rowToNotification);
}

export function countUnreadForUser(userId) {
  return db
    .prepare("SELECT COUNT(*) as c FROM notifications WHERE user_id = ? AND read_at IS NULL")
    .get(userId).c;
}

// Ownership is enforced by the WHERE clause itself, not by a separate
// check the caller has to remember: marking a notification id that
// belongs to a different user matches zero rows and silently does
// nothing, rather than trusting the id alone. Idempotent — a second call
// on an already-read notification leaves read_at as its first value
// (COALESCE), so repeated clicks can't be used to infer anything about
// timing.
export function markNotificationRead(userId, notificationId) {
  db.prepare(
    `UPDATE notifications
     SET read_at = COALESCE(read_at, datetime('now'))
     WHERE id = ? AND user_id = ?`
  ).run(notificationId, userId);

  return rowToNotification(
    db.prepare("SELECT * FROM notifications WHERE id = ? AND user_id = ?").get(notificationId, userId)
  );
}

// Foundation for a future authoring/automation phase — not wired to any
// UI yet in Phase 8.8 (explicitly out of scope: "Do not build
// notification automation").
export function createNotification({ userId, title, message, type = "GENERAL" }) {
  const id = crypto.randomUUID();
  db.prepare(
    `INSERT INTO notifications (id, user_id, title, message, type)
     VALUES (?, ?, ?, ?, ?)`
  ).run(id, userId, title, message, type);

  return rowToNotification(db.prepare("SELECT * FROM notifications WHERE id = ?").get(id));
}
