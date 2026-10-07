import { redirect } from "next/navigation";
import { getTrainerDashboardData } from "@/lib/trainer/dashboard";
import { TrainerShell } from "@/components/trainer/TrainerShell";
import { TrainerWelcomeSection } from "@/components/trainer/TrainerWelcomeSection";
import { TrainerStatsGrid } from "@/components/trainer/TrainerStatsGrid";
import { AssignedBatchesCard } from "@/components/trainer/AssignedBatchesCard";
import { UpcomingClassesCard } from "@/components/trainer/UpcomingClassesCard";

export const metadata = {
  title: "Trainer Dashboard",
  robots: { index: false, follow: false },
};

export default async function TrainerDashboardPage() {
  // The (trainer) layout already calls requireArea("trainer"), so we only
  // reach here as an authenticated TRAINER. getTrainerDashboardData()
  // derives identity from the session itself — there is nothing to spoof
  // even if this page were reached some other way.
  const data = await getTrainerDashboardData();
  if (!data) redirect("/login");

  const { user, stats, batches, upcomingSessions } = data;

  return (
    <TrainerShell user={user} title="Dashboard">
      <div className="flex flex-col gap-6">
        <TrainerWelcomeSection name={user.name} />

        <TrainerStatsGrid stats={stats} />

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <AssignedBatchesCard batches={batches} />
          <UpcomingClassesCard sessions={upcomingSessions} />
        </div>
      </div>
    </TrainerShell>
  );
}
