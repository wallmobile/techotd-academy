import { displayDuration } from "@/data/courses";
import Link from "next/link";
import { isBuiltRoute } from "@/constants/navigation";
import { cn } from "@/lib/utils";

const MAX_TAGS = 3;

const icons = {
  clock: (
    <>
      <circle cx="8" cy="8" r="6" />
      <path d="M8 4.5V8l2.2 1.4" />
    </>
  ),
  mode: (
    <>
      <rect x="2" y="3" width="12" height="8" rx="1.5" />
      <path d="M5.5 14h5M8 11v3" />
    </>
  ),
  level: <path d="M3 13V9.5M8 13V6.5M13 13V3" />,
};

function StatIcon({ name }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 16 16"
      width="14"
      height="14"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="shrink-0"
    >
      {icons[name]}
    </svg>
  );
}

function Stat({ icon, label, value, spotlight }) {
  return (
    <div
      className={cn(
        "min-w-0 rounded-2xl px-3 py-2.5",
        spotlight ? "bg-white/15 text-white backdrop-blur-sm" : "bg-surface text-dark"
      )}
    >
      <dt
        className={cn(
          "flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider",
          spotlight ? "text-white/75" : "text-muted"
        )}
      >
        <StatIcon name={icon} />
        {label}
      </dt>
      <dd className="mt-1 text-xs font-semibold leading-snug">
        {value}
      </dd>
    </div>
  );
}

function Shell({ href, className, style, children }) {
  const classes = cn("group relative block h-full transition-transform duration-300 hover:-translate-y-1.5", className);
  if (isBuiltRoute(href)) {
    return (
      <Link href={href} className={classes} style={style}>
        {children}
      </Link>
    );
  }
  return (
    <div className={classes} style={style}>
      {children}
    </div>
  );
}

export function CourseCard({ course, delay = 0, spotlight = false }) {
  const href = `/courses/${course.slug}`;
  const tags = course.technologies.slice(0, spotlight ? 6 : MAX_TAGS);
  const extra = course.technologies.length - tags.length;
  const style = { animationDelay: `${delay}ms` };

  const stats = (
    <dl className="grid grid-cols-3 gap-2">
      <Stat spotlight={spotlight} icon="clock" label="Duration" value={displayDuration(course)} />
      <Stat spotlight={spotlight} icon="mode" label="Mode" value={course.modes.join(" + ")} />
      <Stat spotlight={spotlight} icon="level" label="Level" value={course.levelLabel} />
    </dl>
  );

  if (spotlight) {
    return (
      <Shell href={href} style={style} className="animate-fade-up-in md:col-span-2">
        <article className="relative flex h-full min-h-80 flex-col overflow-hidden rounded-3xl bg-linear-to-br from-primary via-primary to-secondary p-8 text-white shadow-elevated transition-shadow duration-300 group-hover:shadow-[0_28px_56px_-14px_rgb(37_99_235/0.5)] sm:p-10">
          <span aria-hidden="true" className="animate-drift pointer-events-none absolute -right-16 -top-16 h-72 w-72 rounded-full bg-white/10" />
          <span aria-hidden="true" className="animate-drift-slow pointer-events-none absolute -bottom-28 right-28 h-60 w-60 rounded-full bg-white/10" />
          <span aria-hidden="true" className="animate-shine pointer-events-none absolute inset-y-0 left-0 w-1/4 bg-linear-to-r from-transparent via-white/25 to-transparent" />

          <div className="relative flex items-center justify-between gap-3">
            <span className="animate-float flex h-16 w-16 items-center justify-center rounded-2xl bg-white/20 text-xl font-black tracking-tight ring-1 ring-white/30 backdrop-blur">
              {course.initials}
            </span>
            <span className="inline-flex items-center gap-2 rounded-full bg-white px-3.5 py-1.5 text-[11px] font-bold uppercase tracking-wider text-primary">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping-soft absolute inline-flex h-full w-full rounded-full bg-secondary" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-secondary" />
              </span>
              Featured
            </span>
          </div>

          <p className="relative mt-6 text-[11px] font-semibold uppercase tracking-[0.18em] text-white/75">
            {course.category}
          </p>
          <h3 className="relative mt-2 max-w-xl text-3xl font-semibold leading-tight tracking-tight sm:text-4xl">
            {course.title}
          </h3>
          <p className="relative mt-3 max-w-lg text-base text-white/85">{course.description}</p>

          <div className="relative mt-5 flex flex-wrap gap-1.5">
            {tags.map((tech) => (
              <span key={tech} className="rounded-full border border-white/30 px-2.5 py-1 text-xs font-medium">
                {tech}
              </span>
            ))}
            {extra > 0 && <span className="px-1 py-1 text-xs text-white/70">+{extra}</span>}
          </div>

          <div className="relative mt-auto flex flex-col gap-4 pt-7 sm:flex-row sm:items-end sm:justify-between">
            <div className="sm:max-w-md sm:flex-1">{stats}</div>
            <span className="inline-flex items-center gap-2 self-start rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-primary transition-all duration-300 group-hover:gap-3 group-hover:shadow-lg sm:self-auto">
              Explore course <span aria-hidden="true">→</span>
            </span>
          </div>
        </article>
      </Shell>
    );
  }

  return (
    <Shell href={href} style={style} className="animate-fade-up-in">
      {/* 1px frame — turns into an animated gradient border on hover */}
      <div className="animate-gradient-x h-full rounded-3xl bg-border p-px transition-colors duration-300 group-hover:bg-linear-to-r group-hover:from-primary group-hover:via-secondary group-hover:to-primary group-hover:shadow-elevated">
        <article className="relative flex h-full flex-col overflow-hidden rounded-[calc(1.5rem-1px)] bg-white p-6">
          <span
            aria-hidden="true"
            className="pointer-events-none absolute -right-12 -top-12 h-40 w-40 rounded-full bg-linear-to-br from-primary/15 to-secondary/15 transition-transform duration-500 group-hover:scale-150"
          />
          <span
            aria-hidden="true"
            className="pointer-events-none absolute inset-y-0 -left-1/3 w-1/4 -translate-x-full skew-x-[-20deg] bg-linear-to-r from-transparent via-primary/10 to-transparent transition-transform duration-1000 ease-out group-hover:translate-x-[700%]"
          />

          <div className="relative flex items-start justify-between gap-3">
            <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-linear-to-br from-primary to-secondary text-base font-black tracking-tight text-white shadow-lg shadow-primary/25 transition-transform duration-300 group-hover:-rotate-6 group-hover:scale-110">
              {course.initials}
            </span>
            {course.popular && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-secondary/10 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-secondary">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="animate-ping-soft absolute inline-flex h-full w-full rounded-full bg-secondary" />
                  <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-secondary" />
                </span>
                Popular
              </span>
            )}
          </div>

          <p className="relative mt-5 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted">
            {course.category}
          </p>
          <h3 className="relative mt-2 text-xl font-semibold leading-tight tracking-tight text-dark transition-colors group-hover:text-primary">
            {course.title}
          </h3>
          <p className="relative mt-2 text-sm leading-relaxed text-muted">{course.shortDescription}</p>

          <div className="relative mt-4 flex flex-wrap gap-1.5">
            {tags.map((tech) => (
              <span
                key={tech}
                className="rounded-full border border-border px-2.5 py-1 text-xs font-medium text-text transition-colors group-hover:border-primary/30"
              >
                {tech}
              </span>
            ))}
            {extra > 0 && <span className="px-1 py-1 text-xs text-muted">+{extra}</span>}
          </div>

          <div className="relative mt-auto pt-6">
            {stats}
            <span className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-primary">
              View course
              <span
                aria-hidden="true"
                className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 transition-all duration-300 group-hover:translate-x-1.5 group-hover:bg-primary group-hover:text-white"
              >
                →
              </span>
            </span>
          </div>
        </article>
      </div>
    </Shell>
  );
}
