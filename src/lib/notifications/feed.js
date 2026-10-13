// Notification feed for the signed-in user (Phase 10.7) — used by the admin
// and trainer notification pages. Identity is the session user only; the
// result is bounded (20 per page).

import { getCurrentUser } from "@/lib/auth/currentUser";
import { listNotificationsForUser, countNotificationsForUser, countUnreadForUser } from "@/lib/db/notifications";

export const FEED_PAGE_SIZE = 20;

export async function getMyFeed({ page = 1 } = {}) {
  const user = await getCurrentUser();
  const empty = { notifications: [], unreadCount: 0, page: 1, totalPages: 1, total: 0, pageSize: FEED_PAGE_SIZE };
  if (!user) return empty;
  const total = countNotificationsForUser(user.id);
  const totalPages = Math.max(1, Math.ceil(total / FEED_PAGE_SIZE));
  const current = Math.min(Math.max(1, Number(page) || 1), totalPages);
  return {
    notifications: listNotificationsForUser(user.id, { limit: FEED_PAGE_SIZE, offset: (current - 1) * FEED_PAGE_SIZE }),
    unreadCount: countUnreadForUser(user.id),
    page: current,
    totalPages,
    total,
    pageSize: FEED_PAGE_SIZE,
  };
}
