import { getMySchedule } from "@/lib/student/batches";
import { getCurrentUser } from "@/lib/auth/currentUser";
import { StudentShell } from "@/components/student/StudentShell";
import { SessionCard } from "@/components/student/schedule/SessionCard";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";

export const metadata = {
  title: "Schedule",
  robots: { index: false, follow: false },
};

export default async function StudentSchedulePage() {
  // getMySchedule() only ever returns class_sessions rows for batches this
  // student is actually (non-cancelled) enrolled in — scoped from the
  // session, never from a batchId a caller could supply.
  const [{ upcoming, past }, user] = await Promise.all([getMySchedule(), getCurrentUser()]);

  const hasAnySessions = upcoming.length > 0 || past.length > 0;

  return (
    <StudentShell user={user} title="Schedule">
      <div className="flex flex-col gap-6">
        <div>
          <h2 className="text-xl font-semibold tracking-tight text-dark">Schedule</h2>
          <p className="mt-1 text-sm text-muted">Live classes for the batches you&apos;re enrolled in.</p>
        </div>

        {!hasAnySessions ? (
          <EmptyState
            title="No class schedule yet"
            description="Your trainer hasn't published any classes for your batch yet. Check back soon."
          />
        ) : (
          <>
            <section aria-labelledby="upcoming-classes-heading" className="flex flex-col gap-3">
              <h3 id="upcoming-classes-heading" className="text-sm font-semibold text-dark">
                Upcoming Classes
              </h3>
              {upcoming.length === 0 ? (
                <Card>
                  <p className="text-sm text-muted">No upcoming classes scheduled right now.</p>
                </Card>
              ) : (
                <ul className="flex flex-col gap-3">
                  {upcoming.map((session) => (
                    <SessionCard key={session.id} session={session} />
                  ))}
                </ul>
              )}
            </section>

            {past.length > 0 && (
              <section aria-labelledby="past-classes-heading" className="flex flex-col gap-3">
                <h3 id="past-classes-heading" className="text-sm font-semibold text-dark">
                  Past Classes
                </h3>
                <ul className="flex flex-col gap-3">
                  {past.map((session) => (
                    <SessionCard key={session.id} session={session} />
                  ))}
                </ul>
              </section>
            )}
          </>
        )}
      </div>
    </StudentShell>
  );
}
