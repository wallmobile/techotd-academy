import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { SessionCard } from "@/components/student/schedule/SessionCard";

/**
 * Optional dashboard widget (Phase 8.5, spec item 6): shows the single
 * next real class session, or an honest empty state when none has been
 * published yet — never a fabricated date/time.
 */
export function UpcomingClassCard({ session }) {
  return (
    <Card className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-sm font-semibold text-dark">Upcoming Class</h3>
        <Link href="/student/schedule" className="text-xs font-medium text-primary hover:text-primary-hover">
          View schedule
        </Link>
      </div>

      {session ? (
        <ul className="flex flex-col gap-3">
          <SessionCard session={session} />
        </ul>
      ) : (
        <p className="text-sm text-muted">No class schedule has been published yet.</p>
      )}
    </Card>
  );
}
