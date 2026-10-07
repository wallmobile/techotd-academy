import { getMyCourses } from "@/lib/trainer/courses";
import { getCurrentUser } from "@/lib/auth/currentUser";
import { TrainerShell } from "@/components/trainer/TrainerShell";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";

export const metadata = {
  title: "My Courses",
  robots: { index: false, follow: false },
};

const STATUS_VARIANT = { Open: "primary", Upcoming: "warning", Closed: "neutral" };

export default async function TrainerCoursesPage() {
  // getMyCourses() derives the trainer from the session itself — there is
  // no id anywhere in this route to spoof another trainer's courses.
  const [courses, user] = await Promise.all([getMyCourses(), getCurrentUser()]);

  return (
    <TrainerShell user={user} title="My Courses">
      <div className="flex flex-col gap-6">
        <div>
          <h2 className="text-xl font-semibold tracking-tight text-dark">My Courses</h2>
          <p className="mt-1 text-sm text-muted">
            Courses you currently teach, based on your assigned batches.
          </p>
        </div>

        {courses.length === 0 ? (
          <EmptyState
            title="No courses assigned yet"
            description="Courses you teach are derived from your assigned batches — they'll appear here automatically."
          />
        ) : (
          <ul className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {courses.map(({ course, batches, activeStudentCount }) => (
              <li key={course.slug}>
                <Card className="flex h-full flex-col">
                  <div className="flex items-start justify-between gap-3">
                    <p className="text-sm font-semibold text-dark">{course.title}</p>
                    <Badge variant="neutral">{course.category}</Badge>
                  </div>
                  <p className="mt-1 text-xs text-muted">{course.slug}</p>

                  <dl className="mt-4 flex flex-col gap-1.5 text-xs">
                    <div className="flex justify-between gap-3">
                      <dt className="text-muted">Assigned Batches</dt>
                      <dd className="font-medium text-text">{batches.length}</dd>
                    </div>
                    <div className="flex justify-between gap-3">
                      <dt className="text-muted">Active Students</dt>
                      <dd className="font-medium text-text">{activeStudentCount}</dd>
                    </div>
                  </dl>

                  <ul className="mt-4 flex flex-wrap gap-1.5">
                    {batches.map((batch) => (
                      <li key={batch.id}>
                        <Badge variant={STATUS_VARIANT[batch.status] || "neutral"}>{batch.status}</Badge>
                      </li>
                    ))}
                  </ul>
                </Card>
              </li>
            ))}
          </ul>
        )}
      </div>
    </TrainerShell>
  );
}
