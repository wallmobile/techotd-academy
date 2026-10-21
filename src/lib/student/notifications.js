// Notification server functions (Phase 8.8). Same pattern as the rest of
// src/lib/student/*: the UI calls this, never src/lib/db/* directly, and
// the identity always comes from getCurrentUser() — there is no userId
// parameter anywhere in this file.

import { getCurrentUser } from "@/lib/auth/currentUser";
import { listNotificationsForUser, countUnreadForUser } from "@/lib/db/notifications";

// Every real notification for the signed-in user, most recent first, plus
// the unread count (used both on the notifications page and as the
// header bell badge). Nothing is fabricated — an empty list is a real
// empty state, not padded with sample notifications.
export async function getMyNotifications() {
  const user = await getCurrentUser();
  if (!user) return { notifications: [], unreadCount: 0 };

  return {
    notifications: await listNotificationsForUser(user.id),
    unreadCount: await countUnreadForUser(user.id),
  };
}
