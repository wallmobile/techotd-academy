import { getMyNotifications } from "@/lib/student/notifications";
import { getCurrentUser } from "@/lib/auth/currentUser";
import { StudentShell } from "@/components/student/StudentShell";
import { EmptyState } from "@/components/ui/EmptyState";
import { NotificationsList } from "@/components/student/notifications/NotificationsList";

export const metadata = {
  title: "Notifications",
  robots: { index: false, follow: false },
};

export default async function StudentNotificationsPage() {
  // getMyNotifications() derives the user from the session itself — there
  // is no id anywhere in this route to spoof another user's notifications.
  const [{ notifications }, user] = await Promise.all([getMyNotifications(), getCurrentUser()]);

  return (
    <StudentShell user={user} title="Notifications">
      <div className="flex flex-col gap-6">
        <p className="text-sm text-muted">Updates about your courses, batches and assignments.</p>

        {notifications.length === 0 ? (
          <EmptyState
            title="No notifications yet"
            description="Updates about your courses, batches and assignments will show up here."
          />
        ) : (
          <NotificationsList initialNotifications={notifications} />
        )}
      </div>
    </StudentShell>
  );
}
