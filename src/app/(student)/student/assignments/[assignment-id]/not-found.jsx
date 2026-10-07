import { getCurrentUser } from "@/lib/auth/currentUser";
import { StudentShell } from "@/components/student/StudentShell";
import { Button } from "@/components/ui/Button";

export default async function StudentAssignmentNotFound() {
  // Reached only once the (student) layout's requireArea("student") has
  // already passed, so a real user is available here. This same page also
  // covers "this assignment exists but isn't visible to you" (DRAFT
  // status, wrong course, wrong batch) — see the comment on
  // getAssignmentDetailForStudent() — so the message stays generic rather
  // than confirming an assignment id exists.
  const user = await getCurrentUser();

  return (
    <StudentShell user={user} title="Assignment Not Found">
      <div className="flex flex-col items-center gap-4 rounded-md border border-border bg-white p-10 text-center">
        <h2 className="text-lg font-semibold text-dark">Assignment Not Found</h2>
        <p className="max-w-md text-sm text-muted">
          This assignment doesn&apos;t exist or isn&apos;t available to you.
        </p>
        <Button href="/student/assignments">Back to Assignments</Button>
      </div>
    </StudentShell>
  );
}
