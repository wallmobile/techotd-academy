import { displayDuration } from "@/data/courses";
import { Container } from "@/components/layout/Container";
import { Button } from "@/components/ui/Button";
import { Breadcrumbs } from "@/components/shared/Breadcrumbs";
import { CheckIcon, DotGrid, GlowBackdrop } from "@/components/training/icons";
import { isBuiltRoute } from "@/constants/navigation";
import { listBatches } from "@/lib/catalog";
import { cn } from "@/lib/utils";

const svg = {
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

const statIcons = {
  level: (
    <svg {...svg}>
      <path d="M4 16V11M10 16V7M16 16V3" />
    </svg>
  ),
  clock: (
    <svg {...svg}>
      <circle cx="10" cy="10" r="7" />
      <path d="M10 6v4l2.6 1.6" />
    </svg>
  ),
  mode: (
    <svg {...svg}>
      <rect x="2.5" y="3.5" width="15" height="10" rx="2" />
      <path d="M7 17h6M10 13.5V17" />
    </svg>
  ),
};

function CtaButton({ href, children, variant, className }) {
  if (isBuiltRoute(href)) {
    return (
      <Button href={href} variant={variant} size="lg" className={className}>
        {children}
      </Button>
    );
  }
  return (
    <Button variant={variant} size="lg" className={className} disabled title="Coming soon">
      {children}
    </Button>
  );
}

function parseStart(startsOn) {
  if (!startsOn) return null;
  const date = new Date(`${startsOn}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) return null;
  const part = (options) => date.toLocaleDateString("en-US", { timeZone: "UTC", ...options });
  return { month: part({ month: "short" }).toUpperCase(), day: part({ day: "2-digit" }) };
}

export async function CourseDetailHero({ course }) {
  const words = course.title.split(" ");
  const lessonCount = course.modules.reduce(
    (total, module) => total + module.items.filter((item) => item.type === "lesson").length,
    0
  );
  const nextBatch = (await listBatches({ publicOnly: true, courseSlug: course.slug }))[0];
  const start = nextBatch && !nextBatch.datesTba ? parseStart(nextBatch.startsOn) : null;
  const duration = displayDuration(course);
  const stats = [
    { icon: statIcons.level, label: "Level", value: course.levelLabel },
    { icon: statIcons.clock, label: "Duration", value: duration },
    { icon: statIcons.mode, label: "Mode", value: course.modes.join(" + ") },
  ];

  return (
    <section className="relative isolate overflow-hidden bg-surface">
      <GlowBackdrop />
      <DotGrid />
      <Container className="py-10 sm:py-14 lg:py-16">
        <Breadcrumbs
          items={[
            { label: "Home", href: "/" },
            { label: "Courses", href: "/courses" },
            { label: course.title },
          ]}
        />

        <div className="mt-8 grid items-center gap-12 lg:grid-cols-[1.15fr_0.85fr] lg:gap-16">
          {/* Left */}
          <div>
            <p className="animate-fade-up-in inline-flex items-center gap-2 rounded-full border border-border bg-white px-3.5 py-1.5 text-xs font-semibold uppercase tracking-[0.2em] text-primary shadow-soft">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping-soft absolute inline-flex h-full w-full rounded-full bg-primary" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
              </span>
              {course.category}
            </p>

            <h1 className="mt-5 text-4xl font-bold leading-[1.08] tracking-tight text-dark sm:text-5xl lg:text-6xl">
              {words.map((word, index) => {
                const isLast = index === words.length - 1;
                return (
                  <span key={`${word}-${index}`}>
                    <span
                      className={cn(
                        "animate-word-rise",
                        isLast && "bg-linear-to-r from-primary to-secondary bg-clip-text text-transparent"
                      )}
                      style={{ animationDelay: `${120 + index * 90}ms` }}
                    >
                      {word}
                    </span>{" "}
                  </span>
                );
              })}
            </h1>
            <p className="animate-fade-up-in mt-5 max-w-xl text-lg font-medium text-text" style={{ animationDelay: "250ms" }}>
              {course.shortDescription}
            </p>

            <div className="animate-fade-up-in mt-5 flex max-w-xl flex-wrap gap-2" style={{ animationDelay: "320ms" }}>
              {course.technologies.slice(0, 7).map((tech) => (
                <span key={tech} className="rounded-full border border-border bg-white px-3 py-1 text-xs font-medium text-text shadow-soft">
                  {tech}
                </span>
              ))}
              {course.technologies.length > 7 && (
                <span className="px-1 py-1 text-xs text-muted">+{course.technologies.length - 7} more</span>
              )}
            </div>

            <dl className="animate-fade-up-in mt-7 grid max-w-xl grid-cols-1 gap-3 sm:grid-cols-3" style={{ animationDelay: "400ms" }}>
              {stats.map((stat) => (
                <div key={stat.label} className="flex items-center gap-3 rounded-2xl border border-border bg-white/80 p-3 shadow-soft backdrop-blur">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    {stat.icon}
                  </span>
                  <div className="min-w-0">
                    <dt className="text-[10px] font-semibold uppercase tracking-wider text-muted">{stat.label}</dt>
                    <dd className="text-[13px] font-semibold leading-snug text-dark">{stat.value}</dd>
                  </div>
                </div>
              ))}
            </dl>

            <div className="animate-fade-up-in mt-8 flex flex-wrap gap-3" style={{ animationDelay: "480ms" }}>
              <CtaButton
                href={`/book-demo?course=${course.slug}&source=course-detail`}
                className="group relative overflow-hidden bg-linear-to-r from-primary to-secondary shadow-lg shadow-primary/25 hover:-translate-y-0.5 hover:shadow-xl"
              >
                <span aria-hidden="true" className="animate-shine pointer-events-none absolute inset-y-0 left-0 w-1/4 bg-linear-to-r from-transparent via-white/30 to-transparent" />
                <span className="relative">Book Free Counselling</span>
              </CtaButton>
              <Button href="#curriculum" variant="outline" size="lg">
                View Curriculum
              </Button>
            </div>
          </div>

          {/* Right: course snapshot */}
          <div className="animate-fade-up-in relative mx-auto w-full max-w-md lg:max-w-none" style={{ animationDelay: "150ms" }}>
            <span aria-hidden="true" className="absolute inset-0 translate-x-4 translate-y-4 rotate-3 rounded-3xl bg-linear-to-br from-primary/25 to-secondary/25" />

            <div className="animate-float absolute -bottom-5 left-8 z-10 hidden items-center gap-2 rounded-2xl border border-border bg-white px-4 py-2.5 text-xs font-semibold text-dark shadow-elevated sm:flex" style={{ animationDelay: "-2s" }} aria-hidden="true">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-primary">◉</span>
              {course.modes[0]}
            </div>
            <div className="animate-float absolute -right-3 -top-4 z-10 hidden items-center gap-2 rounded-2xl bg-dark px-3.5 py-2 text-xs font-semibold text-white shadow-elevated sm:flex" style={{ animationDelay: "-4s" }} aria-hidden="true">
              <span className="text-secondary">★</span> {lessonCount} lessons · {course.modules.length} modules
            </div>

            <div className="relative rounded-3xl border border-border bg-white p-6 shadow-elevated sm:p-7">
              <div className="flex items-center justify-between gap-3">
                <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-linear-to-br from-primary to-secondary text-xl font-black tracking-tight text-white shadow-lg shadow-primary/25">
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

              <p className="mt-5 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted">What&apos;s inside</p>
              <ul className="mt-3 space-y-2">
                {course.modules.slice(0, 4).map((module) => (
                  <li key={module.title} className="flex items-center gap-3 rounded-2xl bg-surface px-3.5 py-2.5 text-[13px] font-medium text-dark">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-linear-to-br from-primary to-secondary text-white">
                      <CheckIcon />
                    </span>
                    <span className="truncate">{module.title.split("—").pop().trim()}</span>
                    <span className="ml-auto shrink-0 text-xs text-muted">{module.items.length} items</span>
                  </li>
                ))}
                {course.modules.length > 4 && (
                  <li className="px-3.5 pt-0.5 text-xs font-medium text-primary">
                    + {course.modules.length - 4} more modules in the full syllabus
                  </li>
                )}
              </ul>

              {nextBatch && (
                <div className="mt-5 flex items-center gap-3 rounded-2xl border border-primary/20 bg-primary/5 p-3">
                  {start && (
                    <div className="flex w-12 shrink-0 flex-col items-center overflow-hidden rounded-xl bg-white text-center shadow-soft ring-1 ring-border" aria-hidden="true">
                      <span className="w-full bg-linear-to-r from-primary to-secondary py-0.5 text-[9px] font-bold tracking-widest text-white">{start.month}</span>
                      <span className="py-0.5 text-xl font-bold leading-none text-dark">{start.day}</span>
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-primary">Next batch</p>
                    <p className="truncate text-[13px] font-semibold text-dark">{nextBatch.schedule}</p>
                    <p className="text-xs text-muted">{nextBatch.mode}</p>
                  </div>
                  <span className="rounded-full bg-success/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-success">
                    {nextBatch.status}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      </Container>
    </section>
  );
}
