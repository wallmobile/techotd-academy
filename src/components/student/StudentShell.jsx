import { getMyNotifications } from "@/lib/student/notifications";
import { StudentShellClient } from "@/components/student/StudentShellClient";

/**
 * Async Server Component wrapper around StudentShellClient. Its only job
 * beyond forwarding props is fetching the unread notification count
 * (Phase 8.8) once per page load, server-side, ownership-scoped to the
 * signed-in user — so the header bell badge is accurate on every student
 * page without every single page having to fetch it itself.
 */
export async function StudentShell({ user, title, children }) {
  const { unreadCount } = await getMyNotifications();

  return (
    <StudentShellClient user={user} title={title} unreadCount={unreadCount}>
      {children}
    </StudentShellClient>
  );
}
