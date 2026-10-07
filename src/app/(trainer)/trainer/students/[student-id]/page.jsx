import { notFound } from "next/navigation";
import { getStudentDetailForTrainer } from "@/lib/trainer/students";
import { getCurrentUser } from "@/lib/auth/currentUser";
import { TrainerShell } from "@/components/trainer/TrainerShell";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";

export const metadata = {
  title: "Student Detail",
  robots: { index: false, follow: false },
};

const STATUS_VARIANT = { ACTIVE: "primary", COMPLETED: "success" };

export default async function TrainerStudentDetailPage({ params }) {
  const { "student-id": studentProfileId } = await params;

  // getStudentDetailForTrainer() returns null both when this student
  // doesn't exist AND when they exist but aren't enrolled in any of this
  // trainer's assigned batches — notFound() is the same response either
  // way, so a trainer can't tell the two apart by changing the URL (spec
  // Step 8: "A trainer changing the URL manually must still receive a
  // protected response").
  const [detail, user] = await Promise.all([
    getStudentDetailForTrainer(studentProfileId),
    getCurrentUser(),
  ]);
  if (!detail) notFound();

  const { name, email, enrollments } = detail;

  return (
    <TrainerShell user={user} title="Student Detail">
      <div className="flex flex-col gap-6">
        <Card>
          <h2 className="text-lg font-semibold text-dark">{name}</h2>
          <p className="mt-1 text-sm text-muted">{email}</p>
        </Card>

        <div>
          <h3 className="text-sm font-semibold text-dark">Enrollments in your batches</h3>
          <ul className="mt-3 grid grid-cols-1 gap-4 md:grid-cols-2">
            {enrollments.map((enrollment) => (
              <li key={`${enrollment.course.slug}-${enrollment.batch.id}`}>
                <Card className="flex h-full flex-col">
                  <div className="flex items-start justify-between gap-3">
                    <p className="text-sm font-semibold text-dark">{enrollment.course.title}</p>
                    <Badge variant={STATUS_VARIANT[enrollment.enrollmentStatus] || "neutral"}>
                      {enrollment.enrollmentStatus}
                    </Badge>
                  </div>

                  <dl className="mt-4 flex flex-col gap-1.5 text-xs">
                    <div className="flex justify-between gap-3">
                      <dt className="text-muted">Batch</dt>
                      <dd className="font-medium text-text">{enrollment.batch.mode}</dd>
                    </div>
                    <div className="flex justify-between gap-3">
                      <dt className="text-muted">Schedule</dt>
                      <dd className="font-medium text-text">{enrollment.batch.schedule}</dd>
                    </div>
                    <div className="flex justify-between gap-3">
                      <dt className="text-muted">Progress</dt>
                      <dd className="font-medium text-text">{enrollment.progressPercent}%</dd>
                    </div>
                  </dl>
                </Card>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </TrainerShell>
  );
}
