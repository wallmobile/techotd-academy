import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";

const STATUS_VARIANT = { SCHEDULED: "primary", COMPLETED: "success", CANCELLED: "neutral" };

function formatSessionDate(sessionDate) {
  const date = new Date(`${sessionDate}T00:00:00`);
  if (Number.isNaN(date.getTime())) return sessionDate;
  return date.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" });
}

function formatSessionTime(time) {
  const [hourStr, minuteStr] = (time || "").split(":");
  const hour = Number(hourStr);
  if (Number.isNaN(hour)) return time;
  const period = hour >= 12 ? "PM" : "AM";
  const displayHour = hour % 12 === 0 ? 12 : hour % 12;
  return `${displayHour}:${minuteStr} ${period}`;
}

/**
 * A single scheduled class session — real data only. `meetingUrl` is
 * either a real link stored on the session or null; this component never
 * invents one. Rendered as a semantic <li> so callers can place it inside
 * an accessible <ul> list (spec: "semantic lists"). `actions` is an
 * optional extra node (e.g. a trainer's "Manage" link, Phase 9.2) shown
 * next to the status badge — undefined by default, so the existing
 * student schedule rendering is unchanged.
 */
export function SessionCard({ session, actions }) {
  const { title, batch, course, sessionDate, startTime, endTime, meetingUrl, location, status } = session;
  const dateLabel = formatSessionDate(sessionDate);
  const timeLabel = `${formatSessionTime(startTime)} – ${formatSessionTime(endTime)}`;

  return (
    <li className="rounded-md border border-border bg-white p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-dark">{title}</p>
          <p className="mt-0.5 text-xs text-muted">
            {course?.title}
            {batch?.mode ? ` • ${batch.mode}` : ""}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant={STATUS_VARIANT[status] || "neutral"}>{status}</Badge>
          {actions}
        </div>
      </div>

      <dl className="mt-3 flex flex-col gap-1.5 text-xs sm:flex-row sm:flex-wrap sm:gap-x-6 sm:gap-y-1">
        <div className="flex gap-1.5">
          <dt className="text-muted">Date</dt>
          <dd className="font-medium text-text">{dateLabel}</dd>
        </div>
        <div className="flex gap-1.5">
          <dt className="text-muted">Time</dt>
          <dd className="font-medium text-text">{timeLabel}</dd>
        </div>
        {(location || batch?.location) && (
          <div className="flex gap-1.5">
            <dt className="text-muted">Location</dt>
            <dd className="font-medium text-text">{location || batch.location}</dd>
          </div>
        )}
      </dl>

      <div className="mt-3">
        {meetingUrl ? (
          <Button
            href={meetingUrl}
            target="_blank"
            rel="noopener noreferrer"
            size="sm"
            aria-label={`Join live class: ${title}`}
          >
            Join Live Class
          </Button>
        ) : (
          <p className="text-xs font-medium text-muted">Meeting link not available yet.</p>
        )}
      </div>
    </li>
  );
}
