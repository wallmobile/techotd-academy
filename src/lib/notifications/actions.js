"use server";

// Notification Server Actions (Phase 10.7) for the admin / trainer feeds.
// Every action derives the user from the session; a notification id is only
// a target that the SQL scopes to that user (zero rows otherwise). The
// operator actions (process queue / retry failed) additionally require
// ADMIN or SUPER_ADMIN.

import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/auth/currentUser";
import { getAdminContext } from "@/lib/admin/context";
import { markNotificationRead, markAllNotificationsRead } from "@/lib/db/notifications";
import { resetFailedDeliveries } from "@/lib/db/notificationDeliveries";
import { processDeliveries } from "@/lib/notifications/service";
import { setEmailNotificationsEnabled } from "@/lib/db/users";

function revalidateFeeds() {
  revalidatePath("/admin/notifications");
  revalidatePath("/trainer/notifications");
  revalidatePath("/student/notifications");
}

export async function markReadFormAction(formData) {
  const user = await getCurrentUser();
  if (!user) return;
  const id = formData.get("notificationId");
  if (typeof id === "string") markNotificationRead(user.id, id);
  revalidateFeeds();
}

export async function markAllReadFormAction() {
  const user = await getCurrentUser();
  if (!user) return;
  markAllNotificationsRead(user.id);
  revalidateFeeds();
}

export async function processQueueAction() {
  if (!(await getAdminContext())) return;
  await processDeliveries({ limit: 25 });
  revalidatePath("/admin/notifications/deliveries");
}

export async function retryFailedAction() {
  if (!(await getAdminContext())) return;
  resetFailedDeliveries();
  await processDeliveries({ limit: 25 });
  revalidatePath("/admin/notifications/deliveries");
}

// The signed-in user's own email preference. The target is always the session
// user; the form only supplies the on/off value.
export async function setEmailPreferenceAction(formData) {
  const user = await getCurrentUser();
  if (!user) return;
  setEmailNotificationsEnabled(user.id, formData.get("emailNotifications") === "on");
  revalidateFeeds();
}
