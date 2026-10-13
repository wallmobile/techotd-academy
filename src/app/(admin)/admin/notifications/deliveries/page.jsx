import { requireAdminContext } from "@/lib/admin/context";
import { deliveryStatusCounts, listRecentDeliveries } from "@/lib/db/notificationDeliveries";
import { isEmailConfigured } from "@/lib/notifications/email";
import { whatsAppStatus } from "@/lib/notifications/whatsapp";
import { processQueueAction, retryFailedAction } from "@/lib/notifications/actions";
import { AdminShell } from "@/components/admin/AdminShell";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { AdminStatsGrid } from "@/components/admin/AdminStatsGrid";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { formatDbDate } from "@/lib/utils";

export const metadata = {
  title: "Notification Delivery",
  robots: { index: false, follow: false },
};

const STATUS_VARIANT = { QUEUED: "warning", SENDING: "warning", SENT: "success", FAILED: "danger", SKIPPED: "neutral" };

export default async function AdminDeliveriesPage() {
  // ADMIN / SUPER_ADMIN only (operator view of outbound delivery).
  const { user } = await requireAdminContext();
  const counts = deliveryStatusCounts();
  const recent = listRecentDeliveries(50);
  const emailOn = isEmailConfigured();
  const wa = whatsAppStatus();

  return (
    <AdminShell user={user} title="Notifications">
      <div className="flex flex-col gap-6">
        <AdminPageHeader
          title="Notification delivery"
          description="Email outbox status. In-app notifications are always created; external channels depend on configuration."
          backHref="/admin/notifications"
          backLabel="Back to Notifications"
        />

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Card>
            <h2 className="text-sm font-semibold text-dark">Email</h2>
            <p className="mt-2 text-sm text-text">
              {emailOn ? (
                <>
                  <Badge variant="success">Provider configured</Badge> “Sent” means the provider accepted the message; inbox delivery is not confirmed.
                </>
              ) : (
                <>
                  <Badge variant="neutral">Not configured</Badge> No email is being sent. Set EMAIL_PROVIDER, RESEND_API_KEY and EMAIL_FROM on the server.
                </>
              )}
            </p>
          </Card>
          <Card>
            <h2 className="text-sm font-semibold text-dark">WhatsApp</h2>
            <p className="mt-2 text-sm text-text">
              <Badge variant="neutral">Not available</Badge> {wa.reason}
            </p>
          </Card>
        </div>

        <AdminStatsGrid
          stats={[
            { label: "Queued", value: counts.QUEUED + counts.SENDING },
            { label: "Sent", value: counts.SENT, hint: "Accepted by provider" },
            { label: "Failed", value: counts.FAILED },
            { label: "Skipped", value: counts.SKIPPED, hint: "Not sent (see reason)" },
          ]}
        />

        {emailOn && (
          <div className="flex flex-wrap gap-3">
            <form action={processQueueAction}>
              <Button type="submit" variant="outline">
                Process queue now
              </Button>
            </form>
            <form action={retryFailedAction}>
              <Button type="submit" variant="outline">
                Retry failed
              </Button>
            </form>
          </div>
        )}

        <Card>
          <h2 className="text-sm font-semibold text-dark">Recent deliveries</h2>
          {recent.length === 0 ? (
            <p className="mt-3 text-sm text-muted">Nothing has been queued yet.</p>
          ) : (
            <ul className="mt-3 divide-y divide-border text-sm">
              {recent.map((d) => (
                <li key={d.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5">
                  <span className="min-w-0 text-text">
                    {d.title} <span className="text-xs text-muted">({d.type})</span>
                  </span>
                  <span className="flex items-center gap-2 text-xs text-muted">
                    {d.lastError && <code>{d.lastError}</code>}
                    <span>
                      {d.attempts}/{d.maxAttempts}
                    </span>
                    <Badge variant={STATUS_VARIANT[d.status]}>{d.status}</Badge>
                    <span>{formatDbDate(d.updatedAt)}</span>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </AdminShell>
  );
}
