import { getCurrentUser } from "@/lib/auth/currentUser";
import { StudentShell } from "@/components/student/StudentShell";
import { Button } from "@/components/ui/Button";

export default async function StudentCourseNotFound() {
  // Reached only once the (student) layout's requireArea("student") has
  // already passed, so a real user is available here.
  const user = await getCurrentUser();

  return (
    <StudentShell user={user} title="Course Not Found">
      <div className="flex flex-col items-center gap-4 rounded-md border border-border bg-white p-10 text-center">
        <h2 className="text-lg font-semibold text-dark">Course Not Found</h2>
        <p className="max-w-md text-sm text-muted">
          The course you&apos;re looking for doesn&apos;t exist or may have moved.
        </p>
        <Button href="/student/courses">Back to My Courses</Button>
      </div>
    </StudentShell>
  );
}
