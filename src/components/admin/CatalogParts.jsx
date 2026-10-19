import { Badge } from "@/components/ui/Badge";
import { COURSE_STATUS_LABELS } from "@/constants/catalog";
import { formatDbDate } from "@/lib/utils";

export function CourseStatusBadge({ status }) {
  return <Badge variant={status === "PUBLISHED" ? "success" : "neutral"}>{COURSE_STATUS_LABELS[status] ?? status}</Badge>;
}

const BATCH_VARIANT = { Open: "success", Upcoming: "primary", Closed: "warning", Completed: "neutral", Archived: "neutral" };

export function BatchStatusBadge({ status }) {
  return <Badge variant={BATCH_VARIANT[status] ?? "neutral"}>{status}</Badge>;
}

const ACTION_LABELS = {
  "course.created": "Course created",
  "course.updated": "Course edited",
  "course.published": "Course published",
  "course.unpublished": "Course unpublished",
  "batch.created": "Batch created",
  "batch.updated": "Batch edited",
  "batch.trainer_assigned": "Trainer assigned",
  "batch.trainer_removed": "Trainer removed",
};

const FIELD_LABELS = {
  title: "title",
  shortDescription: "summary",
  description: "description",
  categorySlug: "category",
  level: "level",
  duration: "duration",
  durationBand: "duration band",
  modes: "modes",
  technologies: "technologies",
  prerequisites: "prerequisites",
  outcomes: "outcomes",
  mode: "mode",
  schedule: "schedule",
  startsOn: "start date",
  endsOn: "end date",
  status: "status",
  location: "location",
};

/** Newest-first change history from audit_log (who, what, when — never field contents). */
export function AuditList({ rows }) {
  if (rows.length === 0) return <p className="text-sm text-muted">No changes recorded yet.</p>;
  return (
    <ul className="flex flex-col divide-y divide-border text-sm">
      {rows.map((row, index) => (
        <li key={index} className="flex flex-col gap-0.5 py-2.5">
          <span className="font-medium text-dark">
            {ACTION_LABELS[row.action] ?? row.action}
            {Array.isArray(row.detail?.changed) && row.detail.changed.length > 0 && (
              <span className="font-normal text-muted"> — {row.detail.changed.map((k) => FIELD_LABELS[k] ?? k).join(", ")}</span>
            )}
          </span>
          <span className="text-xs text-muted">
            {row.actorName ?? "Unknown"} · {formatDbDate(row.createdAt)}
          </span>
        </li>
      ))}
    </ul>
  );
}

export function DetailRow({ label, children }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <dt className="text-muted">{label}</dt>
      <dd className="min-w-0 break-words text-right font-medium text-text">{children}</dd>
    </div>
  );
}

export function enrollmentLabel(counts) {
  return `${counts.active ?? counts.ACTIVE ?? 0} active / ${counts.total ?? 0} total`;
}
