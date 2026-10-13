import crypto from "node:crypto";
import { db } from "@/lib/db/client";

// In-app notification persistence. Phase 8.8 introduced the table and the
// student reads; Phase 10.7 adds a deep `link`, an idempotency `event_key`,
// bounded listing, and mark-all-read. Every read/write is scoped by user_id
// in SQL itself — a notification id alone never grants access.

export const NOTIFICATION_TYPES = [
  "GENERAL",
  "COURSE",
  "BATCH",
  "ASSIGNMENT",
  "SYSTEM",
  "ENROLLMENT",
  "FEE",
  "CERTIFICATE",
  "PLACEMENT",
  "CRM",
];

function rowToNotification(row) {
  if (!row) return null;
  return {
    id: row.id,
    userId: row.user_id,
    title: row.title,
    message: row.message,
    type: row.type,
    link: row.link ?? null,
    readAt: row.read_at,
    createdAt: row.created_at,
  };
}

// `userId` must always come from the authenticated session (see
// src/lib/student/notifications.js) — never a value a client supplied.
// Bounded: at most `limit` rows per call.
export function listNotificationsForUser(userId, { limit = 100, offset = 0 } = {}) {
  return db
    .prepare("SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC, rowid DESC LIMIT ? OFFSET ?")
    .all(userId, limit, offset)
    .map(rowToNotification);
}

export function countNotificationsForUser(userId) {
  return db.prepare("SELECT COUNT(*) as c FROM notifications WHERE user_id = ?").get(userId).c;
}

export function countUnreadForUser(userId) {
  return db
    .prepare("SELECT COUNT(*) as c FROM notifications WHERE user_id = ? AND read_at IS NULL")
    .get(userId).c;
}

// Ownership is enforced by the WHERE clause itself: marking a notification
// id that belongs to a different user matches zero rows and does nothing.
// Idempotent — a second call keeps the first read_at (COALESCE).
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

export function markAllNotificationsRead(userId) {
  return db
    .prepare("UPDATE notifications SET read_at = datetime('now') WHERE user_id = ? AND read_at IS NULL")
    .run(userId).changes;
}

// Creates a notification. With an `eventKey`, creation is idempotent per
// (user, eventKey): a retried business event returns the existing row with
// `created: false` instead of a duplicate. Returns { notification, created }.
export function createNotification({ userId, title, message, type = "GENERAL", link = null, eventKey = null }) {
  const id = crypto.randomUUID();
  const result = db
    .prepare(
      `INSERT INTO notifications (id, user_id, title, message, type, link, event_key)
       VALUES (?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT (user_id, event_key) WHERE event_key IS NOT NULL DO NOTHING`
    )
    .run(id, userId, title, message, type, link, eventKey);

  if (result.changes === 1) {
    return { notification: rowToNotification(db.prepare("SELECT * FROM notifications WHERE id = ?").get(id)), created: true };
  }
  const existing = db.prepare("SELECT * FROM notifications WHERE user_id = ? AND event_key = ?").get(userId, eventKey);
  return { notification: rowToNotification(existing), created: false };
}
