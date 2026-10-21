import crypto from "node:crypto";
import { db } from "@/lib/db/client";

// External-channel delivery outbox for notifications (Phase 10.7). Plain
// state machine over notification_deliveries; see the schema comment for the
// meaning of each status. `last_error` only ever holds short machine codes
// (never provider response bodies, addresses or secrets).

const STALE_SENDING_SECONDS = 600;
const STALE = `-${STALE_SENDING_SECONDS} seconds`;

function rowToDelivery(r) {
  return {
    id: r.id,
    notificationId: r.notification_id,
    channel: r.channel,
    status: r.status,
    attempts: r.attempts,
    maxAttempts: r.max_attempts,
    lastError: r.last_error,
    providerMessageId: r.provider_message_id,
    nextAttemptAt: r.next_attempt_at,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

// Idempotent per (notification, channel).
export async function enqueueDelivery({ notificationId, channel, status = "QUEUED", lastError = null, maxAttempts = 3 }) {
  await db.run(
    `INSERT INTO notification_deliveries (id, notification_id, channel, status, last_error, max_attempts)
     VALUES (?, ?, ?, ?, ?, ?) ON CONFLICT (notification_id, channel) DO NOTHING`,
    [crypto.randomUUID(), notificationId, channel, status, lastError, maxAttempts]
  );
  return rowToDelivery(await db.get("SELECT * FROM notification_deliveries WHERE notification_id = ? AND channel = ?", [notificationId, channel]));
}

// Deliveries ready to send now: QUEUED and due, or SENDING rows that were
// claimed long ago by a worker that never finished.
export async function listDueDeliveries({ limit = 10 } = {}) {
  const rows = await db.all(
    `SELECT d.*, n.title, n.message, n.link, u.email AS user_email, u.status AS user_status, u.email_notifications AS user_email_enabled
     FROM notification_deliveries d
     JOIN notifications n ON n.id = d.notification_id
     JOIN users u ON u.id = n.user_id
     WHERE d.channel = 'EMAIL'
       AND ((d.status = 'QUEUED' AND d.next_attempt_at <= app_now())
         OR (d.status = 'SENDING' AND d.updated_at <= app_now(?)))
     ORDER BY d.next_attempt_at ASC, d.created_at ASC, d.id ASC LIMIT ?`,
    [STALE, limit]
  );
  return rows.map((r) => ({
    ...rowToDelivery(r),
    title: r.title,
    message: r.message,
    link: r.link,
    userEmail: r.user_email,
    userStatus: r.user_status,
    userEmailEnabled: r.user_email_enabled !== 0 && r.user_email_enabled !== false,
  }));
}

// Atomically claim a delivery for sending (counts the attempt up front, so a
// crash can't cause an uncounted retry loop). A single conditional UPDATE, so
// two workers racing for the same row cannot both win. Returns false if
// someone else got it first.
export async function claimDelivery(id) {
  const r = await db.run(
    `UPDATE notification_deliveries SET status = 'SENDING', attempts = attempts + 1, updated_at = app_now()
     WHERE id = ? AND (status = 'QUEUED' OR (status = 'SENDING' AND updated_at <= app_now(?)))`,
    [id, STALE]
  );
  return r.changes === 1;
}

export async function markDeliverySent(id, providerMessageId) {
  await db.run("UPDATE notification_deliveries SET status = 'SENT', provider_message_id = ?, last_error = NULL, updated_at = app_now() WHERE id = ?", [
    providerMessageId || null,
    id,
  ]);
}

export async function markDeliveryFailed(id, code) {
  await db.run("UPDATE notification_deliveries SET status = 'FAILED', last_error = ?, updated_at = app_now() WHERE id = ?", [code, id]);
}

export async function markDeliverySkipped(id, code) {
  await db.run("UPDATE notification_deliveries SET status = 'SKIPPED', last_error = ?, updated_at = app_now() WHERE id = ?", [code, id]);
}

export async function requeueDelivery(id, code, delaySeconds) {
  await db.run(
    `UPDATE notification_deliveries SET status = 'QUEUED', last_error = ?, next_attempt_at = app_now(?), updated_at = app_now()
     WHERE id = ?`,
    [code, `+${Math.max(1, Math.floor(delaySeconds))} seconds`, id]
  );
}

// Operator action: put FAILED rows back in the queue with a fresh attempt budget.
export async function resetFailedDeliveries() {
  return (
    await db.run(
      `UPDATE notification_deliveries SET status = 'QUEUED', attempts = 0, next_attempt_at = app_now(), updated_at = app_now()
       WHERE status = 'FAILED' AND channel = 'EMAIL'`
    )
  ).changes;
}

export async function deliveryStatusCounts() {
  const counts = { QUEUED: 0, SENDING: 0, SENT: 0, FAILED: 0, SKIPPED: 0 };
  for (const r of await db.all("SELECT status, COUNT(*) AS c FROM notification_deliveries GROUP BY status")) counts[r.status] = r.c;
  return counts;
}

export async function listRecentDeliveries(limit = 50) {
  const rows = await db.all(
    `SELECT d.*, n.type, n.title FROM notification_deliveries d JOIN notifications n ON n.id = d.notification_id
     ORDER BY d.updated_at DESC, d.seq DESC LIMIT ?`,
    [limit]
  );
  return rows.map((r) => ({ ...rowToDelivery(r), type: r.type, title: r.title }));
}

export async function getDeliveryForNotification(notificationId, channel) {
  const r = await db.get("SELECT * FROM notification_deliveries WHERE notification_id = ? AND channel = ?", [notificationId, channel]);
  return r ? rowToDelivery(r) : null;
}
