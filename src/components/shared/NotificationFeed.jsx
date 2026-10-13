import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { markReadFormAction, markAllReadFormAction } from "@/lib/notifications/actions";
import { formatDbDate } from "@/lib/utils";

/**
 * Server-rendered feed shared by the admin and trainer notification pages.
 * Reading the page never marks anything read — only the explicit "Mark as
 * read" / "Mark all as read" forms do.
 */
export function NotificationFeed({ feed, basePath }) {
  const { notifications, unreadCount, page, totalPages } = feed;

  if (notifications.length === 0) {
    return <EmptyState title="No notifications yet" description="Updates that concern you will appear here." />;
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p role="status" className="text-sm text-muted">
          {unreadCount > 0 ? `${unreadCount} unread` : "You're all caught up"}
        </p>
        {unreadCount > 0 && (
          <form action={markAllReadFormAction}>
            <Button type="submit" variant="outline" size="sm">
              Mark all as read
            </Button>
          </form>
        )}
      </div>

      <ul className="flex flex-col gap-3">
        {notifications.map((n) => {
          const isRead = Boolean(n.readAt);
          return (
            <li key={n.id}>
              <Card className={isRead ? "" : "border-primary/40 bg-primary/5"}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      {!isRead && <span aria-hidden="true" className="h-2 w-2 shrink-0 rounded-full bg-primary" />}
                      <p className="text-sm font-semibold text-dark">{n.title}</p>
                      <Badge variant="neutral">{n.type}</Badge>
                    </div>
                    <p className="mt-1 text-sm text-muted">{n.message}</p>
                    <p className="mt-1 text-xs text-muted">{formatDbDate(n.createdAt)}</p>
                    {n.link && (
                      <Link href={n.link} className="mt-1 inline-block text-xs font-medium text-primary hover:text-primary-hover">
                        View →
                      </Link>
                    )}
                  </div>
                  {!isRead && (
                    <form action={markReadFormAction}>
                      <input type="hidden" name="notificationId" value={n.id} />
                      <Button type="submit" variant="outline" size="sm" aria-label={`Mark "${n.title}" as read`}>
                        Mark as read
                      </Button>
                    </form>
                  )}
                </div>
              </Card>
            </li>
          );
        })}
      </ul>

      {totalPages > 1 && (
        <nav aria-label="Pagination" className="flex items-center justify-between gap-3 text-sm">
          {page > 1 ? (
            <Link href={`${basePath}?page=${page - 1}`} className="font-medium text-primary hover:text-primary-hover">
              ← Newer
            </Link>
          ) : (
            <span className="text-muted/60">← Newer</span>
          )}
          <span className="text-muted">
            Page {page} of {totalPages}
          </span>
          {page < totalPages ? (
            <Link href={`${basePath}?page=${page + 1}`} className="font-medium text-primary hover:text-primary-hover">
              Older →
            </Link>
          ) : (
            <span className="text-muted/60">Older →</span>
          )}
        </nav>
      )}
    </div>
  );
}
