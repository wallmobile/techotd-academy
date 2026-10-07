import Link from "next/link";
import { getAttendanceSessionOptions } from "@/lib/trainer/attendance";
import { getCurrentUser } from "@/lib/auth/currentUser";
import { TrainerShell } from "@/components/trainer/TrainerShell";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";

export const metadata = {
  title: "Attendance",
  robots: { index: false, follow: false },
};

const STATUS_VARIANT = { SCHEDULED: "primary", COMPLETED: "success", CANCELLED: "neutral" };

function formatSessionDate(sessionDate) {
  const date = new Date(`${sessionDate}T00:00:00`);
  if (Number.isNaN(date.getTime())) return sessionDate;
  return date.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" });
}

export default async function TrainerAttendancePage() {
  // getAttendanceSessionOptions() only ever returns class sessions
  // belonging to this trainer's own assigned batches.
  const [sessions, user] = await Promise.all([getAttendanceSessionOptions(), getCurrentUser()]);

  return (
    <TrainerShell user={user} title="Attendance">
      <div className="flex flex-col gap-6">
        <div>
          <h2 className="text-xl font-semibold tracking-tight text-dark">Attendance</h2>
          <p className="mt-1 text-sm text-muted">Select a class session to take or review attendance.</p>
        </div>

        {sessions.length === 0 ? (
          <EmptyState
            title="No class sessions yet"
            description="Schedule a class for one of your batches to start taking attendance."
            actionLabel="Schedule a Class"
            actionHref="/trainer/classes/new"
          />
        ) : (
          <ul className="flex flex-col gap-3">
            {sessions.map((session) => (
              <li key={session.id}>
                <Link href={`/trainer/attendance/${session.id}`}>
                  <Card hoverable className="flex flex-wrap items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-dark">{session.title}</p>
                      <p className="mt-0.5 text-xs text-muted">
                        {session.course.title} • {session.batch.mode} • {formatSessionDate(session.sessionDate)}
                      </p>
                    </div>
                    <Badge variant={STATUS_VARIANT[session.status] || "neutral"}>{session.status}</Badge>
                  </Card>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </TrainerShell>
  );
}
