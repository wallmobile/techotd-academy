import { getCurrentUser } from "@/lib/auth/currentUser";
import { TrainerShell } from "@/components/trainer/TrainerShell";
import { Button } from "@/components/ui/Button";

export default async function TrainerStudentNotFound() {
  // Reached only once the (trainer) layout's requireArea("trainer") has
  // already passed. Also covers "this student exists but isn't enrolled
  // in any of my assigned batches" — see getStudentDetailForTrainer() —
  // so the message stays generic rather than confirming a student id
  // exists.
  const user = await getCurrentUser();

  return (
    <TrainerShell user={user} title="Student Not Found">
      <div className="flex flex-col items-center gap-4 rounded-md border border-border bg-white p-10 text-center">
        <h2 className="text-lg font-semibold text-dark">Student Not Found</h2>
        <p className="max-w-md text-sm text-muted">
          This student doesn&apos;t exist or isn&apos;t enrolled in one of your assigned batches.
        </p>
        <Button href="/trainer/students">Back to My Students</Button>
      </div>
    </TrainerShell>
  );
}
