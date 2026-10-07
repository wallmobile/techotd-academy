import { Button } from "@/components/ui/Button";
import { ArrowLink } from "@/components/shared/ArrowLink";
import { getCourseBySlug, displayDuration } from "@/data/courses";
import { cn } from "@/lib/utils";

const svgProps = {
  viewBox: "0 0 20 20",
  width: 18,
  height: 18,
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.6,
  strokeLinecap: "round",
  strokeLinejoin: "round",
  "aria-hidden": true,
};

const modeIcons = {
  "Live Online": (
    <svg {...svgProps}>
      <rect x="2.5" y="3.5" width="15" height="10" rx="2" />
      <path d="M7 17h6M10 13.5V17" />
    </svg>
  ),
  Classroom: (
    <svg {...svgProps}>
      <path d="M3 17V7l7-4 7 4v10M3 17h14M8 17v-4h4v4" />
    </svg>
  ),
};

const statusStyles = {
  Open: { pill: "bg-success/10 text-success", dot: "bg-success", pulse: true },
  Upcoming: { pill: "bg-primary/10 text-primary", dot: "bg-primary", pulse: false },
  Filling: { pill: "bg-warning/10 text-warning", dot: "bg-warning", pulse: true },
};

function StatusPill({ status, onGradient }) {
  const style = statusStyles[status] ?? statusStyles.Upcoming;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-wider",
        onGradient ? "bg-white text-primary" : style.pill
      )}
    >
      <span className="relative flex h-2 w-2">
        {style.pulse && <span className={cn("animate-ping-soft absolute inline-flex h-full w-full rounded-full", style.dot)} />}
        <span className={cn("relative inline-flex h-2 w-2 rounded-full", onGradient ? "bg-success" : style.dot)} />
      </span>
      {status}
    </span>
  );
}

/** ISO "2026-10-19" -> { month: "OCT", day: "19", weekday: "Mon" } (UTC, so it never shifts by timezone) */
function parseStart(startsOn) {
  if (!startsOn) return null;
  const date = new Date(`${startsOn}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) return null;
  const part = (options) => date.toLocaleDateString("en-US", { timeZone: "UTC", ...options });
  return {
    month: part({ month: "short" }).toUpperCase(),
    day: part({ day: "2-digit" }),
    weekday: part({ weekday: "short" }),
  };
}

function DateChip({ start, onGradient }) {
  return (
    <div
      className={cn(
        "flex w-14 shrink-0 flex-col items-center overflow-hidden rounded-2xl text-center shadow-soft",
        onGradient ? "bg-white" : "bg-white ring-1 ring-border"
      )}
      aria-hidden="true"
    >
      <span className="w-full bg-linear-to-r from-primary to-secondary py-0.5 text-[10px] font-bold tracking-widest text-white">
        {start.month}
      </span>
      <span className="py-1 text-2xl font-bold leading-none text-dark">{start.day}</span>
    </div>
  );
}

/** "Mon – Fri • 7:00 PM" -> { days, time } */
function splitSchedule(schedule) {
  const [days, time] = schedule.split("•").map((part) => part.trim());
  return { days, time: time ?? "" };
}

function Tile({ label, value, onGradient }) {
  return (
    <div className={cn("min-w-0 rounded-2xl px-4 py-3", onGradient ? "bg-white/15 backdrop-blur-sm" : "bg-surface")}>
      <dt className={cn("text-[10px] font-semibold uppercase tracking-wider", onGradient ? "text-white/70" : "text-muted")}>
        {label}
      </dt>
      <dd className={cn("mt-1 text-sm font-semibold leading-snug", onGradient ? "text-white" : "text-dark")} title={value}>
        {value}
      </dd>
    </div>
  );
}

export function BatchCard({ batch, delay = 0, spotlight = false }) {
  const course = getCourseBySlug(batch.courseSlug);

  // If the referenced course is missing, skip rendering rather than
  // showing a batch with broken/undefined course information.
  if (!course) return null;

  const { days, time } = splitSchedule(batch.schedule);
  const start = parseStart(batch.startsOn);
  const duration = displayDuration(course);
  const enquireHref = `/book-demo?course=${course.slug}&batch=${batch.id}&source=batches`;
  const style = { animationDelay: `${delay}ms` };

  if (spotlight) {
    return (
      <article
        className="animate-fade-up-in group relative flex flex-col justify-center overflow-hidden rounded-3xl bg-linear-to-br from-primary via-primary to-secondary p-8 text-white shadow-elevated sm:p-10 md:col-span-2"
        style={style}
      >
        <span aria-hidden="true" className="animate-drift pointer-events-none absolute -right-16 -top-20 h-72 w-72 rounded-full bg-white/10" />
        <span aria-hidden="true" className="animate-drift-slow pointer-events-none absolute -bottom-24 left-1/3 h-60 w-60 rounded-full bg-white/10" />
        <span aria-hidden="true" className="animate-shine pointer-events-none absolute inset-y-0 left-0 w-1/5 bg-linear-to-r from-transparent via-white/20 to-transparent" />

        <div className="relative grid gap-8 lg:grid-cols-[1.1fr_1fr] lg:items-center">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <StatusPill status={batch.status} onGradient />
              <span className="rounded-full bg-white/15 px-3 py-1 text-[11px] font-bold uppercase tracking-wider">
                ★ Next up
              </span>
            </div>
            <p className="mt-5 text-[11px] font-semibold uppercase tracking-[0.18em] text-white/75">{course.category}</p>
            <h3 className="mt-2 text-3xl font-semibold leading-tight tracking-tight sm:text-4xl">{course.title}</h3>
            <p className="mt-3 max-w-md text-base text-white/85">
              Starts {start ? `${start.weekday}, ${batch.startDate}` : batch.startDate} · {batch.mode}
            </p>

            <div className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-3">
              {start && <DateChip start={start} onGradient />}
              <div>
                <p className="text-5xl font-bold leading-none tracking-tight">{time}</p>
                <p className="mt-2 text-sm font-medium text-white/80">{days}</p>
              </div>
            </div>
          </div>

          <div>
            <dl className="grid grid-cols-2 gap-3">
              <Tile onGradient label="Mode" value={batch.mode} />
              <Tile onGradient label="Level" value={course.levelLabel} />
              <Tile onGradient label="Duration" value={duration} />
              <Tile onGradient label="Location" value={batch.location.split(" — ")[0]} />
            </dl>
            <div className="mt-5 flex flex-wrap items-center gap-4">
              <Button href={enquireHref} className="bg-white text-primary hover:bg-white/90 hover:text-primary-hover">
                Enquire for this batch <span aria-hidden="true">→</span>
              </Button>
              <ArrowLink href={`/courses/${course.slug}`} tone="light">
                View course
              </ArrowLink>
            </div>
          </div>
        </div>
      </article>
    );
  }

  return (
    <article
      className="animate-fade-up-in group relative flex h-full flex-col overflow-hidden rounded-3xl border border-border bg-white p-6 shadow-card transition-all duration-300 hover:-translate-y-1.5 hover:border-primary/30 hover:shadow-elevated"
      style={style}
    >
      <span
        aria-hidden="true"
        className="pointer-events-none absolute -right-12 -top-12 h-36 w-36 rounded-full bg-linear-to-br from-primary/15 to-secondary/15 transition-transform duration-500 group-hover:scale-150"
      />

      <div className="relative flex items-start justify-between gap-3">
        <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-linear-to-br from-primary to-secondary text-white shadow-lg shadow-primary/25 transition-transform duration-300 group-hover:-rotate-6 group-hover:scale-110">
          {modeIcons[batch.mode] ?? modeIcons.Classroom}
        </span>
        <StatusPill status={batch.status} />
      </div>

      <p className="relative mt-5 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted">{course.category}</p>
      <h3 className="relative mt-2 text-xl font-semibold leading-snug tracking-tight text-dark transition-colors group-hover:text-primary">
        {course.title}
      </h3>

      {/* timetable block */}
      <div className="relative mt-5 flex items-center gap-3 rounded-2xl border border-border bg-surface px-4 py-3.5">
        {start && <DateChip start={start} />}
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted">
            {start ? `Starts ${start.weekday}, ${batch.startDate}` : batch.startDate}
          </p>
          <p className="mt-0.5 text-sm font-medium text-dark">{days}</p>
        </div>
        <p className="bg-linear-to-r from-primary to-secondary bg-clip-text text-xl font-bold tracking-tight text-transparent">
          {time}
        </p>
      </div>

      <dl className="relative mt-3 grid grid-cols-2 gap-3">
        <Tile label="Level" value={course.levelLabel} />
        <Tile label="Duration" value={duration} />
      </dl>

      <p className="relative mt-4 flex items-start gap-2 text-xs leading-relaxed text-muted">
        <svg {...svgProps} width={14} height={14} className="mt-0.5 shrink-0 text-primary">
          <path d="M10 18s6-5.2 6-10a6 6 0 10-12 0c0 4.8 6 10 6 10z" />
          <circle cx="10" cy="8" r="2" />
        </svg>
        {batch.location}
      </p>

      <div className="relative mt-auto flex flex-col gap-3 pt-6">
        <Button
          href={enquireHref}
          className="w-full bg-linear-to-r from-primary to-secondary hover:opacity-95 hover:shadow-lg hover:shadow-primary/25"
        >
          Enquire for this batch <span aria-hidden="true">→</span>
        </Button>
        <ArrowLink href={`/courses/${course.slug}`} className="justify-center">
          View course
        </ArrowLink>
      </div>
    </article>
  );
}
