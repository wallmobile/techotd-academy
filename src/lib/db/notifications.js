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
export async function listNotificationsForUser(userId, { limit = 100, offset = 0 } = {}) {
  const rows = await db.all("SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC, seq DESC LIMIT ? OFFSET ?", [userId, limit, offset]);
  return rows.map(rowToNotification);
}

export async function countNotificationsForUser(userId) {
  return (await db.get("SELECT COUNT(*) AS c FROM notifications WHERE user_id = ?", [userId])).c;
}

export async function countUnreadForUser(userId) {
  return (await db.get("SELECT COUNT(*) AS c FROM notifications WHERE user_id = ? AND read_at IS NULL", [userId])).c;
}

// Ownership is enforced by the WHERE clause itself: marking a notification
// id that belongs to a different user matches zero rows and does nothing.
// Idempotent — a second call keeps the first read_at (COALESCE).
export async function markNotificationRead(userId, notificationId) {
  await db.run(
    `UPDATE notifications
     SET read_at = COALESCE(read_at, app_now())
     WHERE id = ? AND user_id = ?`,
    [notificationId, userId]
  );

  return rowToNotification(await db.get("SELECT * FROM notifications WHERE id = ? AND user_id = ?", [notificationId, userId]));
}

export async function markAllNotificationsRead(userId) {
  return (await db.run("UPDATE notifications SET read_at = app_now() WHERE user_id = ? AND read_at IS NULL", [userId])).changes;
}

// Creates a notification. With an `eventKey`, creation is idempotent per
// (user, eventKey): a retried business event returns the existing row with
// `created: false` instead of a duplicate. Returns { notification, created }.
export async function createNotification({ userId, title, message, type = "GENERAL", link = null, eventKey = null }) {
  const id = crypto.randomUUID();
  const result = await db.run(
    `INSERT INTO notifications (id, user_id, title, message, type, link, event_key)
     VALUES (?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT (user_id, event_key) WHERE event_key IS NOT NULL DO NOTHING`,
    [id, userId, title, message, type, link, eventKey]
  );

  if (result.changes === 1) {
    return { notification: rowToNotification(await db.get("SELECT * FROM notifications WHERE id = ?", [id])), created: true };
  }
  const existing = await db.get("SELECT * FROM notifications WHERE user_id = ? AND event_key = ?", [userId, eventKey]);
  return { notification: rowToNotification(existing), created: false };
}
