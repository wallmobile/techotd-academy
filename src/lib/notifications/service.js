// Notification service (Phase 10.7): one reusable entry point for every
// business event. It creates the in-app notification (idempotently), and if
// the email provider is configured, queues an email delivery; it never
// throws into the calling business operation.
//
// Callers invoke it only AFTER their own transaction has committed, so a
// rolled-back operation can never notify. Message text must not contain
// amounts, tokens, emails or other sensitive details (callers pass generic
// wording plus a deep link).

import { createNotification } from "@/lib/db/notifications";
import {
  enqueueDelivery,
  listDueDeliveries,
  claimDelivery,
  markDeliverySent,
  markDeliveryFailed,
  markDeliverySkipped,
  requeueDelivery,
} from "@/lib/db/notificationDeliveries";
import { getEmailConfig, buildEmailContent, sendEmail, isValidRecipient } from "@/lib/notifications/email";
import { findUserById, getEmailNotificationsEnabled } from "@/lib/db/users";

const BACKOFF_SECONDS = [60, 300, 900];
const MAX_TITLE = 120;
const MAX_MESSAGE = 400;

export function backoffSeconds(attempt) {
  return BACKOFF_SECONDS[Math.min(Math.max(attempt, 1), BACKOFF_SECONDS.length) - 1];
}

/**
 * Create an in-app notification and queue its email. Idempotent per
 * (userId, eventKey). Returns { created, notificationId, email } where
 * `email` is the delivery status recorded for the email channel
 * (QUEUED | SKIPPED) or null when email was not requested / not created.
 */
export async function notify({ userId, type, title, message, link = null, eventKey, email = true }) {
  if (!userId || !eventKey) throw new Error("notify requires userId and eventKey");
  const { notification, created } = await createNotification({
    userId,
    type,
    title: String(title).slice(0, MAX_TITLE),
    message: String(message).slice(0, MAX_MESSAGE),
    link: typeof link === "string" && link.startsWith("/") ? link : null,
    eventKey,
  });
  if (!created || !email) return { created, notificationId: notification.id, email: null };

  // Decide the email channel state at creation time.
  const user = await findUserById(userId);
  let status = "QUEUED";
  let reason = null;
  if (!getEmailConfig()) {
    status = "SKIPPED";
    reason = "provider_not_configured";
  } else if (!user || user.status !== "ACTIVE") {
    status = "SKIPPED";
    reason = "inactive_user";
  } else if (!isValidRecipient(user.email)) {
    status = "SKIPPED";
    reason = "invalid_recipient";
  } else if (!await getEmailNotificationsEnabled(userId)) {
    status = "SKIPPED";
    reason = "user_opted_out";
  }
  const delivery = await enqueueDelivery({ notificationId: notification.id, channel: "EMAIL", status, lastError: reason });
  return { created, notificationId: notification.id, email: delivery.status };
}

/**
 * Business-facing wrapper: never throws, never blocks the operation on
 * email delivery problems, logs only a short error code. When an email
 * provider is configured, does a small bounded flush of due deliveries.
 */
export async function safeNotify(args) {
  let result = null;
  try {
    result = await notify(args);
    if (result.email === "QUEUED") await processDeliveries({ limit: 3 });
  } catch (error) {
    console.error("[notifications] could not create/deliver a notification:", error?.code || error?.name || "unknown error");
  }
  return result;
}

/**
 * Send due email deliveries with bounded retries. `send` is injectable for
 * tests; production uses the configured provider adapter. Returns counts.
 * Transient failures are re-queued with backoff until max_attempts, then
 * FAILED; permanent failures are FAILED at once. A 'SENT' status means the
 * provider accepted the message — not that it reached an inbox.
 */
export async function processDeliveries({ limit = 10, send = sendEmail } = {}) {
  const summary = { processed: 0, sent: 0, retried: 0, failed: 0, skipped: 0 };
  if (!getEmailConfig()) return summary;

  for (const d of await listDueDeliveries({ limit })) {
    if (!await claimDelivery(d.id)) continue;
    summary.processed += 1;
    const attempt = d.attempts + 1;

    if (d.userStatus !== "ACTIVE") {
      await markDeliverySkipped(d.id, "inactive_user");
      summary.skipped += 1;
      continue;
    }
    // Honour an opt-out made after the email was queued.
    if (!d.userEmailEnabled) {
      await markDeliverySkipped(d.id, "user_opted_out");
      summary.skipped += 1;
      continue;
    }
    if (!isValidRecipient(d.userEmail)) {
      await markDeliverySkipped(d.id, "invalid_recipient");
      summary.skipped += 1;
      continue;
    }

    const content = buildEmailContent({ title: d.title, message: d.message, link: d.link });
    const result = await send({ to: d.userEmail, ...content });

    if (result.ok) {
      await markDeliverySent(d.id, result.providerMessageId);
      summary.sent += 1;
    } else if (result.retryable && attempt < d.maxAttempts) {
      await requeueDelivery(d.id, result.code, backoffSeconds(attempt));
      summary.retried += 1;
    } else {
      await markDeliveryFailed(d.id, result.code);
      summary.failed += 1;
    }
  }
  return summary;
}
