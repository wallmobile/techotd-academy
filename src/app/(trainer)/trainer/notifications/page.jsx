import { requireArea } from "@/lib/auth/guards";
import { getMyFeed } from "@/lib/notifications/feed";
import { TrainerShell } from "@/components/trainer/TrainerShell";
import { NotificationFeed } from "@/components/shared/NotificationFeed";
import { EmailPreferenceForm } from "@/components/shared/EmailPreferenceForm";
import { getEmailNotificationsEnabled } from "@/lib/db/users";

export const metadata = {
  title: "Notifications",
  robots: { index: false, follow: false },
};

export default async function TrainerNotificationsPage({ searchParams }) {
  const user = await requireArea("trainer");
  const sp = (await searchParams) || {};
  const feed = await getMyFeed({ page: Number.parseInt(String(sp.page ?? "1"), 10) });

  return (
    <TrainerShell user={user} title="Notifications">
      <div className="flex flex-col gap-6">
        <div>
          <h2 className="text-xl font-semibold tracking-tight text-dark">Notifications</h2>
          <p className="mt-1 text-sm text-muted">Updates that concern you.</p>
        </div>
        <EmailPreferenceForm enabled={getEmailNotificationsEnabled(user.id)} />
        <NotificationFeed feed={feed} basePath="/trainer/notifications" />
      </div>
    </TrainerShell>
  );
}
