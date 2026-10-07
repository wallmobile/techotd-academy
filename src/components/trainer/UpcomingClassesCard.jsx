import { Card } from "@/components/ui/Card";
import { SessionCard } from "@/components/student/schedule/SessionCard";

/**
 * Dashboard "Upcoming Classes" section (spec Step 4). Reuses the existing
 * SessionCard component (src/components/student/schedule/SessionCard.jsx)
 * rather than a second, duplicate rendering of the same class_sessions
 * shape — the trainer's sessions are the same real class_sessions rows,
 * just scoped by trainer_batch_assignments instead of a student's own
 * enrollments. No fake meeting links: SessionCard already only ever
 * renders "Join Live Class" when meetingUrl is real.
 */
export function UpcomingClassesCard({ sessions }) {
  return (
    <Card className="flex flex-col gap-3">
      <h3 className="text-sm font-semibold text-dark">Upcoming Classes</h3>

      {sessions.length === 0 ? (
        <p className="text-sm text-muted">No upcoming classes.</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {sessions.map((session) => (
            <SessionCard key={session.id} session={session} />
          ))}
        </ul>
      )}
    </Card>
  );
}
