import { getMyManagedCourseOptions } from "@/lib/trainer/assignments";
import { getMyBatchOptions } from "@/lib/trainer/classSessions";
import { getCurrentUser } from "@/lib/auth/currentUser";
import { TrainerShell } from "@/components/trainer/TrainerShell";
import { Card } from "@/components/ui/Card";
import { AssignmentForm } from "@/components/trainer/assignments/AssignmentForm";

export const metadata = {
  title: "New Assignment",
  robots: { index: false, follow: false },
};

export default async function NewAssignmentPage() {
  const [courses, batches, user] = await Promise.all([
    getMyManagedCourseOptions(),
    getMyBatchOptions(),
    getCurrentUser(),
  ]);

  return (
    <TrainerShell user={user} title="New Assignment">
      <div className="flex max-w-xl flex-col gap-6">
        <div>
          <h2 className="text-xl font-semibold tracking-tight text-dark">New Assignment</h2>
          <p className="mt-1 text-sm text-muted">
            New assignments are created as DRAFT and aren&apos;t visible to students until you publish them.
          </p>
        </div>

        {courses.length === 0 ? (
          <Card>
            <p className="text-sm text-muted">
              You have no assigned batches yet, so there&apos;s no course to create an assignment for.
            </p>
          </Card>
        ) : (
          <Card>
            <AssignmentForm mode="create" courses={courses} batches={batches} />
          </Card>
        )}
      </div>
    </TrainerShell>
  );
}
