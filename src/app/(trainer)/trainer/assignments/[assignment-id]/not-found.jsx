import { getCurrentUser } from "@/lib/auth/currentUser";
import { TrainerShell } from "@/components/trainer/TrainerShell";
import { Button } from "@/components/ui/Button";

export default async function TrainerAssignmentNotFound() {
  const user = await getCurrentUser();

  return (
    <TrainerShell user={user} title="Assignment Not Found">
      <div className="flex flex-col items-center gap-4 rounded-md border border-border bg-white p-10 text-center">
        <h2 className="text-lg font-semibold text-dark">Assignment Not Found</h2>
        <p className="max-w-md text-sm text-muted">
          This assignment doesn&apos;t exist or isn&apos;t one of your own.
        </p>
        <Button href="/trainer/assignments">Back to Assignments</Button>
      </div>
    </TrainerShell>
  );
}
