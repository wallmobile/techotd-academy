import { countUnreadForUser } from "@/lib/db/notifications";
import { AdminShellClient } from "@/components/admin/AdminShellClient";

/**
 * Async Server Component wrapper (same pattern as StudentShell): fetches the
 * signed-in user's unread notification count server-side — scoped by their
 * own id — so the header bell is accurate on every admin page without each
 * page having to fetch it.
 */
export async function AdminShell({ user, title, navItems, brand, children }) {
  const unreadCount = user?.id ? countUnreadForUser(user.id) : 0;
  return (
    <AdminShellClient user={user} title={title} unreadCount={unreadCount} navItems={navItems} brand={brand}>
      {children}
    </AdminShellClient>
  );
}
