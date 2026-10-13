import { getCurrentUser } from "@/lib/auth/currentUser";
import { StudentShell } from "@/components/student/StudentShell";
import { Button } from "@/components/ui/Button";

export default async function StudentJobNotFound() {
  const user = await getCurrentUser();

  return (
    <StudentShell user={user} title="Job Not Found">
      <div className="flex flex-col items-center gap-4 rounded-md border border-border bg-white p-10 text-center">
        <h2 className="text-lg font-semibold text-dark">Job Not Found</h2>
        <p className="max-w-md text-sm text-muted">This job doesn&apos;t exist or is no longer available.</p>
        <Button href="/student/jobs">Back to Jobs</Button>
      </div>
    </StudentShell>
  );
}
