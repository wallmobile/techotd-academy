import { getMyBatchOptions } from "@/lib/trainer/classSessions";
import { getCurrentUser } from "@/lib/auth/currentUser";
import { TrainerShell } from "@/components/trainer/TrainerShell";
import { Card } from "@/components/ui/Card";
import { ClassSessionForm } from "@/components/trainer/classes/ClassSessionForm";

export const metadata = {
  title: "Schedule a Class",
  robots: { index: false, follow: false },
};

export default async function NewClassSessionPage() {
  const [batches, user] = await Promise.all([getMyBatchOptions(), getCurrentUser()]);

  return (
    <TrainerShell user={user} title="Schedule a Class">
      <div className="flex max-w-xl flex-col gap-6">
        <div>
          <h2 className="text-xl font-semibold tracking-tight text-dark">Schedule a Class</h2>
          <p className="mt-1 text-sm text-muted">Only your own assigned batches are offered below.</p>
        </div>

        {batches.length === 0 ? (
          <Card>
            <p className="text-sm text-muted">
              You have no assigned batches yet, so there&apos;s nothing to schedule a class for.
            </p>
          </Card>
        ) : (
          <Card>
            <ClassSessionForm mode="create" batches={batches} />
          </Card>
        )}
      </div>
    </TrainerShell>
  );
}
