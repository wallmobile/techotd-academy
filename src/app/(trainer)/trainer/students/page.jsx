import Link from "next/link";
import { getMyStudents } from "@/lib/trainer/students";
import { getCurrentUser } from "@/lib/auth/currentUser";
import { TrainerShell } from "@/components/trainer/TrainerShell";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";

export const metadata = {
  title: "My Students",
  robots: { index: false, follow: false },
};

const STATUS_VARIANT = { ACTIVE: "primary", COMPLETED: "success" };

export default async function TrainerStudentsPage({ searchParams }) {
  // getMyStudents() derives every row through
  // Trainer -> Assigned Batch -> Enrollment -> Student, scoped entirely
  // from the session (see src/lib/trainer/students.js) — a trainer never
  // sees the full student table. `batch` is an optional display filter
  // only (set from the "View Students" link on /trainer/batches); it
  // narrows an already-owned list, it never widens what's queried.
  const resolvedSearchParams = (await searchParams) || {};
  const batchFilter = typeof resolvedSearchParams.batch === "string" ? resolvedSearchParams.batch : "";

  const [allStudents, user] = await Promise.all([getMyStudents(), getCurrentUser()]);
  const students = batchFilter ? allStudents.filter((s) => s.batch.id === batchFilter) : allStudents;
  const filteredBatchLabel = batchFilter ? students[0]?.batch : null;

  return (
    <TrainerShell user={user} title="My Students">
      <div className="flex flex-col gap-6">
        <div>
          <h2 className="text-xl font-semibold tracking-tight text-dark">My Students</h2>
          <p className="mt-1 text-sm text-muted">Students enrolled in your assigned batches.</p>
        </div>

        {batchFilter && (
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <span className="text-muted">
              Filtered to batch: <span className="font-medium text-text">{filteredBatchLabel?.mode || batchFilter}</span>
            </span>
            <Link href="/trainer/students" className="font-medium text-primary hover:text-primary-hover">
              Clear filter
            </Link>
          </div>
        )}

        {students.length === 0 ? (
          <EmptyState
            title={batchFilter ? "No students in this batch yet" : "No students yet"}
            description="Students enrolled in your assigned batches will appear here."
          />
        ) : (
          <ul className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {students.map((student) => (
              <li key={`${student.studentProfileId}-${student.batch.id}`}>
                <Card className="flex h-full flex-col">
                  <div className="flex items-start justify-between gap-3">
                    <Link
                      href={`/trainer/students/${student.studentProfileId}`}
                      className="text-sm font-semibold text-dark hover:text-primary"
                    >
                      {student.name}
                    </Link>
                    <Badge variant={STATUS_VARIANT[student.enrollmentStatus] || "neutral"}>
                      {student.enrollmentStatus}
                    </Badge>
                  </div>
                  <p className="mt-1 text-xs text-muted">{student.email}</p>

                  <dl className="mt-4 flex flex-col gap-1.5 text-xs">
                    <div className="flex justify-between gap-3">
                      <dt className="text-muted">Course</dt>
                      <dd className="font-medium text-text">{student.course.title}</dd>
                    </div>
                    <div className="flex justify-between gap-3">
                      <dt className="text-muted">Batch</dt>
                      <dd className="font-medium text-text">{student.batch.mode}</dd>
                    </div>
                    <div className="flex justify-between gap-3">
                      <dt className="text-muted">Progress</dt>
                      <dd className="font-medium text-text">{student.progressPercent}%</dd>
                    </div>
                  </dl>
                </Card>
              </li>
            ))}
          </ul>
        )}
      </div>
    </TrainerShell>
  );
}
