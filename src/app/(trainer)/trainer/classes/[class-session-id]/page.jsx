import { notFound } from "next/navigation";
import Link from "next/link";
import { getClassSessionDetailForTrainer } from "@/lib/trainer/classSessions";
import { getCurrentUser } from "@/lib/auth/currentUser";
import { TrainerShell } from "@/components/trainer/TrainerShell";
import { Card } from "@/components/ui/Card";
import { ClassSessionForm } from "@/components/trainer/classes/ClassSessionForm";

export const metadata = {
  title: "Manage Class",
  robots: { index: false, follow: false },
};

export default async function TrainerClassSessionDetailPage({ params }) {
  const { "class-session-id": classSessionId } = await params;

  // getClassSessionDetailForTrainer() returns null both when this session
  // doesn't exist AND when it exists but its batch isn't assigned to this
  // trainer — notFound() either way, so a trainer can't tell the two
  // apart by editing the URL (spec Step 4).
  const [detail, user] = await Promise.all([
    getClassSessionDetailForTrainer(classSessionId),
    getCurrentUser(),
  ]);
  if (!detail) notFound();

  return (
    <TrainerShell user={user} title="Manage Class">
      <div className="flex max-w-xl flex-col gap-6">
        <div>
          <Link href="/trainer/schedule" className="text-xs font-medium text-primary hover:text-primary-hover">
            ← Back to Schedule
          </Link>
          <h2 className="mt-1 text-xl font-semibold tracking-tight text-dark">{detail.session.title}</h2>
          <p className="mt-1 text-sm text-muted">
            {detail.course.title} — {detail.batch.mode}
          </p>
        </div>

        <Card>
          <ClassSessionForm mode="edit" detail={detail} classSessionId={classSessionId} />
        </Card>
      </div>
    </TrainerShell>
  );
}
