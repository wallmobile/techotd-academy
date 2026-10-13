import Link from "next/link";
import { requireArea } from "@/lib/auth/guards";
import { getMyFeed } from "@/lib/notifications/feed";
import { AdminShell } from "@/components/admin/AdminShell";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { NotificationFeed } from "@/components/shared/NotificationFeed";
import { ADMIN_MANAGEMENT_ROLES } from "@/constants/roles";

export const metadata = {
  title: "Notifications",
  robots: { index: false, follow: false },
};

export default async function AdminNotificationsPage({ searchParams }) {
  // Any staff role; the feed is always the signed-in user's own.
  const user = await requireArea("admin");
  const sp = (await searchParams) || {};
  const feed = await getMyFeed({ page: Number.parseInt(String(sp.page ?? "1"), 10) });

  return (
    <AdminShell user={user} title="Notifications">
      <div className="flex flex-col gap-6">
        <AdminPageHeader title="Notifications" description="Updates that concern you.">
          {ADMIN_MANAGEMENT_ROLES.includes(user.role) && (
            <Link href="/admin/notifications/deliveries" className="text-sm font-medium text-primary hover:text-primary-hover">
              Delivery status →
            </Link>
          )}
        </AdminPageHeader>
        <NotificationFeed feed={feed} basePath="/admin/notifications" />
      </div>
    </AdminShell>
  );
}
