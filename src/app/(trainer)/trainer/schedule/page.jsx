import Link from "next/link";
import { getMySchedule } from "@/lib/trainer/schedule";
import { getCurrentUser } from "@/lib/auth/currentUser";
import { TrainerShell } from "@/components/trainer/TrainerShell";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { SessionCard } from "@/components/student/schedule/SessionCard";

export const metadata = {
  title: "Schedule",
  robots: { index: false, follow: false },
};

export default async function TrainerSchedulePage() {
  // getMySchedule() reads the SAME class_sessions table the student
  // schedule reads from, scoped to this trainer's own assigned batches —
  // no duplicate schedule data anywhere.
  const [{ upcoming, past }, user] = await Promise.all([getMySchedule(), getCurrentUser()]);

  return (
    <TrainerShell user={user} title="Schedule">
      <div className="flex flex-col gap-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold tracking-tight text-dark">Schedule</h2>
            <p className="mt-1 text-sm text-muted">Class sessions across your assigned batches.</p>
          </div>
          <Button href="/trainer/classes/new" size="sm">
            Schedule a Class
          </Button>
        </div>

        <div>
          <h3 className="text-sm font-semibold text-dark">Upcoming</h3>
          {upcoming.length === 0 ? (
            <EmptyState
              className="mt-3"
              title="No upcoming classes"
              description="Schedule a class for one of your batches to see it here."
              actionLabel="Schedule a Class"
              actionHref="/trainer/classes/new"
            />
          ) : (
            <ul className="mt-3 flex flex-col gap-3">
              {upcoming.map((session) => (
                <SessionCard
                  key={session.id}
                  session={session}
                  actions={
                    <Link
                      href={`/trainer/classes/${session.id}`}
                      className="text-xs font-medium text-primary hover:text-primary-hover"
                    >
                      Manage
                    </Link>
                  }
                />
              ))}
            </ul>
          )}
        </div>

        {past.length > 0 && (
          <div>
            <h3 className="text-sm font-semibold text-dark">Past</h3>
            <ul className="mt-3 flex flex-col gap-3">
              {past.slice(0, 10).map((session) => (
                <SessionCard
                  key={session.id}
                  session={session}
                  actions={
                    <Link
                      href={`/trainer/classes/${session.id}`}
                      className="text-xs font-medium text-primary hover:text-primary-hover"
                    >
                      Manage
                    </Link>
                  }
                />
              ))}
            </ul>
          </div>
        )}
      </div>
    </TrainerShell>
  );
}
