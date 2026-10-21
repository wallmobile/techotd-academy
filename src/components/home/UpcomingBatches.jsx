import { Section } from "@/components/shared/Section";
import { Button } from "@/components/ui/Button";
import { ArrowLink } from "@/components/shared/ArrowLink";
import { Reveal } from "@/components/shared/Reveal";
import { BatchStatus } from "@/components/batches/BatchStatus";
import { listBatches, getCourse } from "@/lib/catalog";
import { displayDuration } from "@/data/courses";
import { cn } from "@/lib/utils";

const ACCENTS = [
  { bar: "from-primary to-sky-400", icon: "bg-primary/10 text-primary", glow: "group-hover:shadow-primary/25" },
  { bar: "from-primary to-secondary", icon: "bg-secondary/10 text-secondary", glow: "group-hover:shadow-secondary/25" },
  { bar: "from-secondary to-fuchsia-500", icon: "bg-fuchsia-500/10 text-fuchsia-600", glow: "group-hover:shadow-fuchsia-500/25" },
];

const iconProps = {
  width: 16,
  height: 16,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.8,
  strokeLinecap: "round",
  strokeLinejoin: "round",
  "aria-hidden": true,
};

const icons = {
  clock: (
    <svg {...iconProps}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </svg>
  ),
  mode: (
    <svg {...iconProps}>
      <rect x="3" y="4" width="18" height="12" rx="2" />
      <path d="M8 20h8M12 16v4" />
    </svg>
  ),
  duration: (
    <svg {...iconProps}>
      <path d="M6 3h12M6 21h12M7 3v3a5 5 0 0 0 2 4l3 2-3 2a5 5 0 0 0-2 4v3M17 3v3a5 5 0 0 1-2 4l-3 2 3 2a5 5 0 0 1 2 4v3" />
    </svg>
  ),
};

export async function UpcomingBatches() {
  const upcoming = (await Promise.all((await listBatches({ publicOnly: true }))
    .map(async (batch) => {
      const course = await getCourse(batch.courseSlug);
      return course ? { ...batch, course } : null;
    })))
    .filter(Boolean)
    .slice(0, 3);

  return (
    <Section className="relative overflow-clip bg-gradient-to-b from-white via-blue-50/40 to-white">
      <div aria-hidden="true" className="animate-drift pointer-events-none absolute -left-24 top-24 h-72 w-72 rounded-full bg-primary/10 blur-3xl" />
      <div aria-hidden="true" className="animate-drift-slow pointer-events-none absolute -right-24 bottom-10 h-72 w-72 rounded-full bg-secondary/10 blur-3xl" />

      <Reveal className="relative mx-auto flex max-w-3xl flex-col items-center gap-4 text-center">
        <span className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-white px-3.5 py-1.5 text-xs font-semibold uppercase tracking-widest text-primary shadow-soft">
          <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-gradient-to-r from-primary to-secondary" />
          Batches
        </span>
        <h2 className="text-3xl font-bold tracking-tight text-dark sm:text-4xl lg:text-5xl">
          Upcoming{" "}
          <span className="animate-gradient-x bg-gradient-to-r from-primary via-secondary to-primary bg-clip-text text-transparent">
            Batches
          </span>
        </h2>
        <p className="max-w-2xl text-balance text-base leading-relaxed text-muted sm:text-lg">
          Dates and timings are being finalised — the exact schedule and availability are confirmed when you enquire.
        </p>
      </Reveal>

      <div className="relative mt-12 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        {upcoming.map((batch, index) => {
          const accent = ACCENTS[index % ACCENTS.length];
          const details = [
            { label: "Timing", value: batch.schedule, icon: icons.clock },
            { label: "Mode", value: batch.mode, icon: icons.mode },
            { label: "Duration", value: displayDuration(batch.course), icon: icons.duration },
          ];

          return (
            <Reveal key={batch.id} delay={index * 120} className="h-full">
              <article
                className={cn(
                  "group relative flex h-full flex-col overflow-hidden rounded-2xl border border-border bg-white shadow-card transition-all duration-300 hover:-translate-y-1.5 hover:border-transparent hover:shadow-elevated",
                  accent.glow
                )}
              >
                <span aria-hidden="true" className={cn("h-1.5 w-full bg-gradient-to-r", accent.bar)} />

                <div className="flex flex-1 flex-col p-6">
                  <div className="flex items-center justify-between gap-3">
                    <BatchStatus status={batch.status} />
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-surface px-2.5 py-1 text-xs font-medium text-muted">
                      <span aria-hidden="true" className="relative flex h-1.5 w-1.5">
                        <span className="animate-ping-soft absolute inline-flex h-full w-full rounded-full bg-emerald-400" />
                        <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500" />
                      </span>
                      {batch.startDate}
                    </span>
                  </div>

                  <h3 className="mt-5 text-xl font-semibold leading-snug tracking-tight text-dark">
                    {batch.course.title}
                  </h3>

                  <dl className="mt-5 flex flex-1 flex-col gap-3">
                    {details.map((item) => (
                      <div key={item.label} className="flex items-center gap-3">
                        <span className={cn("flex h-8 w-8 flex-none items-center justify-center rounded-lg", accent.icon)}>
                          {item.icon}
                        </span>
                        <div className="min-w-0">
                          <dt className="text-xs text-muted">{item.label}</dt>
                          <dd className="text-sm font-medium text-dark">{item.value}</dd>
                        </div>
                      </div>
                    ))}
                  </dl>

                  <div className="mt-6 flex flex-col gap-3 border-t border-border pt-5">
                    <Button
                      href={`/book-demo?course=${batch.course.slug}&batch=${batch.id}&source=homepage-batches`}
                      className="group/btn w-full"
                    >
                      <span className="inline-flex items-center gap-2">
                        Enquire for this batch
                        <span aria-hidden="true" className="transition-transform duration-300 group-hover/btn:translate-x-1">→</span>
                      </span>
                    </Button>
                    <ArrowLink href={`/courses/${batch.course.slug}`} className="justify-center">
                      Course details
                    </ArrowLink>
                  </div>
                </div>
              </article>
            </Reveal>
          );
        })}
      </div>

      <Reveal delay={200} className="relative mt-10 flex justify-center">
        <Button href="/batches" variant="outline" size="lg">
          View all batches
        </Button>
      </Reveal>
    </Section>
  );
}
