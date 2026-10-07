"use server";

// Server Action for marking a notification read (Phase 8.8).

import { getCurrentUser } from "@/lib/auth/currentUser";
import { markNotificationRead, countUnreadForUser } from "@/lib/db/notifications";

// Ownership is enforced inside markNotificationRead()'s own WHERE clause
// (id AND user_id together) — this action never trusts the notification
// id alone, and a request for someone else's notification id simply
// updates zero rows rather than needing a separate "is this mine" check
// that could be forgotten.
export async function markNotificationReadAction(notificationId) {
  const user = await getCurrentUser();
  if (!user) return { ok: false };

  markNotificationRead(user.id, notificationId);
  return { ok: true, unreadCount: countUnreadForUser(user.id) };
}
