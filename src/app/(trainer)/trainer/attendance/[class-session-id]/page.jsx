import { notFound } from "next/navigation";
import Link from "next/link";
import { getAttendanceRosterForSession } from "@/lib/trainer/attendance";
import { getCurrentUser } from "@/lib/auth/currentUser";
import { TrainerShell } from "@/components/trainer/TrainerShell";
import { Card } from "@/components/ui/Card";
import { AttendanceRosterForm } from "@/components/trainer/attendance/AttendanceRosterForm";

export const metadata = {
  title: "Take Attendance",
  robots: { index: false, follow: false },
};

export default async function TrainerAttendanceSessionPage({ params }) {
  const { "class-session-id": classSessionId } = await params;

  // getAttendanceRosterForSession() returns null both when this session
  // doesn't exist AND when its batch isn't assigned to this trainer —
  // notFound() either way (spec Step 4's ownership chain).
  const [detail, user] = await Promise.all([
    getAttendanceRosterForSession(classSessionId),
    getCurrentUser(),
  ]);
  if (!detail) notFound();

  return (
    <TrainerShell user={user} title="Take Attendance">
      <div className="flex max-w-2xl flex-col gap-6">
        <div>
          <Link href="/trainer/attendance" className="text-xs font-medium text-primary hover:text-primary-hover">
            ← Back to Attendance
          </Link>
          <h2 className="mt-1 text-xl font-semibold tracking-tight text-dark">{detail.session.title}</h2>
          <p className="mt-1 text-sm text-muted">
            {detail.course.title} — {detail.batch.mode}
          </p>
        </div>

        <Card>
          <AttendanceRosterForm classSessionId={classSessionId} roster={detail.roster} />
        </Card>
      </div>
    </TrainerShell>
  );
}
