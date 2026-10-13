import { countUnreadForUser } from "@/lib/db/notifications";
import { TrainerShellClient } from "@/components/trainer/TrainerShellClient";

/** Async Server Component wrapper: supplies the signed-in trainer's own unread notification count. */
export async function TrainerShell({ user, title, children }) {
  const unreadCount = user?.id ? countUnreadForUser(user.id) : 0;
  return (
    <TrainerShellClient user={user} title={title} unreadCount={unreadCount}>
      {children}
    </TrainerShellClient>
  );
}
