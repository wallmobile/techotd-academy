import { getCurrentUser } from "@/lib/auth/currentUser";
import { TrainerShell } from "@/components/trainer/TrainerShell";
import { Button } from "@/components/ui/Button";

export default async function TrainerAttendanceSessionNotFound() {
  const user = await getCurrentUser();

  return (
    <TrainerShell user={user} title="Session Not Found">
      <div className="flex flex-col items-center gap-4 rounded-md border border-border bg-white p-10 text-center">
        <h2 className="text-lg font-semibold text-dark">Session Not Found</h2>
        <p className="max-w-md text-sm text-muted">
          This class session doesn&apos;t exist or isn&apos;t part of one of your assigned batches.
        </p>
        <Button href="/trainer/attendance">Back to Attendance</Button>
      </div>
    </TrainerShell>
  );
}
