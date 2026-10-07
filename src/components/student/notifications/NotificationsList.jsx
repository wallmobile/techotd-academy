"use client";

import { useState, useTransition } from "react";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { markNotificationReadAction } from "@/lib/student/notificationActions";
import { useUnreadCount } from "@/components/student/UnreadCountContext";

const TYPE_VARIANT = { GENERAL: "neutral", COURSE: "primary", BATCH: "primary", ASSIGNMENT: "warning", SYSTEM: "neutral" };

function formatCreatedAt(createdAt) {
  const date = new Date(createdAt.replace(" ", "T") + "Z");
  if (Number.isNaN(date.getTime())) return createdAt;
  return date.toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" });
}

function NotificationItem({ notification, onMarkRead }) {
  const [isPending, startTransition] = useTransition();
  const isRead = Boolean(notification.readAt);

  function handleMarkRead() {
    startTransition(async () => {
      await onMarkRead(notification.id);
    });
  }

  return (
    <li>
      <Card className={`flex flex-col gap-2 ${isRead ? "" : "border-primary/40 bg-primary/5"}`}>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              {!isRead && (
                <span aria-hidden="true" className="h-2 w-2 shrink-0 rounded-full bg-primary" />
              )}
              <p className="text-sm font-semibold text-dark">{notification.title}</p>
              <Badge variant={TYPE_VARIANT[notification.type] || "neutral"}>{notification.type}</Badge>
            </div>
            <p className="mt-1 text-sm text-muted">{notification.message}</p>
            <p className="mt-1 text-xs text-muted">{formatCreatedAt(notification.createdAt)}</p>
          </div>
          <span className="text-xs font-medium text-muted" aria-live="polite">
            {isRead ? "Read" : "Unread"}
          </span>
        </div>
        {!isRead && (
          <Button
            variant="outline"
            size="sm"
            className="self-start"
            onClick={handleMarkRead}
            disabled={isPending}
            loading={isPending}
            aria-label={`Mark "${notification.title}" as read`}
          >
            Mark as Read
          </Button>
        )}
      </Card>
    </li>
  );
}

/**
 * Client component so each notification can be marked read in place
 * (markNotificationReadAction is a real Server Action, re-verified and
 * ownership-scoped server-side — see src/lib/student/notificationActions.js)
 * without a full page reload. Initial data comes from the server; local
 * state is only ever updated from what the action confirms actually saved.
 */
export function NotificationsList({ initialNotifications }) {
  const [notifications, setNotifications] = useState(initialNotifications);
  const { unreadCount, setUnreadCount } = useUnreadCount();

  async function handleMarkRead(notificationId) {
    const result = await markNotificationReadAction(notificationId);
    if (result?.ok) {
      setNotifications((prev) =>
        prev.map((n) => (n.id === notificationId ? { ...n, readAt: n.readAt || new Date().toISOString() } : n))
      );
      // Comes from the action's own DB count, not a client-side guess, so
      // this stays correct even if unread state ever drifts (e.g. another
      // tab already marked the same notification read).
      if (typeof result.unreadCount === "number") setUnreadCount(result.unreadCount);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="self-end text-sm font-medium text-dark" aria-live="polite">
        {unreadCount} unread
      </p>
      <ul className="flex flex-col gap-3">
        {notifications.map((notification) => (
          <NotificationItem key={notification.id} notification={notification} onMarkRead={handleMarkRead} />
        ))}
      </ul>
    </div>
  );
}
