import { Section } from "@/components/shared/Section";
import { Reveal, RevealItem } from "@/components/shared/Reveal";
import { staggerContainer } from "@/lib/motion";
import { cn } from "@/lib/utils";

// Milestones sit on a winding road. On desktop `x`/`y` (in %) place each one
// on the S-curve and `above` decides which side its card opens on; on mobile
// they stack as a vertical timeline. Icons use a 24px line-icon grid.
const journey = [
  {
    stage: "Learn",
    detail: "Core concepts with mentors",
    tile: "from-sky-500 to-primary",
    x: 10,
    y: 64,
    above: false,
    icon: <path d="M4 5.5A1.5 1.5 0 015.500 4H11v15H5.500A1.500 1.500 0 004 20.500v-15zM20 5.500A1.500 1.500 0 0018.500 4H13v15h5.500a1.500 1.500 0 011.500 1.500v-15z" />,
  },
  {
    stage: "Build Projects",
    detail: "Apply skills to real tasks",
    tile: "from-primary to-indigo-500",
    x: 30,
    y: 36,
    above: true,
    icon: <path d="M8 7l-5 5 5 5M16 7l5 5-5 5M13.500 5l-3 14" />,
  },
  {
    stage: "Build Portfolio",
    detail: "Showcase your work",
    tile: "from-indigo-500 to-secondary",
    x: 50,
    y: 64,
    above: false,
    icon: (
      <>
        <rect x="3" y="4" width="18" height="16" rx="2.500" />
        <path d="M3 9h18M8 14h3M8 17h6" />
      </>
    ),
  },
  {
    stage: "Interview Prep",
    detail: "Mock rounds and feedback",
    tile: "from-secondary to-fuchsia-500",
    x: 70,
    y: 36,
    above: true,
    icon: (
      <>
        <path d="M4.500 5.500A1.500 1.500 0 016 4h12a1.500 1.500 0 011.500 1.500v9A1.500 1.500 0 0118 16h-6.500L7 19.500V16H6a1.500 1.500 0 01-1.500-1.500v-9z" />
        <path d="M8.500 9h7M8.500 12h4" />
      </>
    ),
  },
  {
    stage: "Career Ready",
    detail: "Confident to apply",
    tile: "from-emerald-400 to-teal-500",
    x: 90,
    y: 64,
    above: false,
    icon: (
      <>
        <path d="M6 21V4" />
        <path d="M6 5h12l-3 4.500 3 4.500H6" />
      </>
    ),
  },
];

export function CareerJourney() {
  const last = journey.length - 1;

  return (
    <Section className="relative overflow-clip py-10 sm:py-12 lg:py-14 bg-gradient-to-b from-white via-blue-50/50 to-white">
      <div aria-hidden="true" className="animate-drift pointer-events-none absolute -left-24 top-1/3 h-80 w-80 rounded-full bg-primary/10 blur-3xl" />
      <div aria-hidden="true" className="animate-drift-slow pointer-events-none absolute -right-24 top-10 h-80 w-80 rounded-full bg-secondary/10 blur-3xl" />

      <Reveal className="relative mx-auto flex max-w-3xl flex-col items-center gap-4 text-center">
        <span className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-white px-3.5 py-1.5 text-xs font-semibold uppercase tracking-widest text-primary shadow-soft">
          <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-gradient-to-r from-primary to-secondary" />
          Career Journey
        </span>
        <h2 className="text-balance text-3xl font-bold tracking-tight text-dark sm:text-4xl lg:text-5xl">
          From your first class to{" "}
          <span className="animate-gradient-x bg-gradient-to-r from-primary via-secondary to-primary bg-clip-text text-transparent">
            career readiness
          </span>
        </h2>
      </Reveal>

      <Reveal variants={staggerContainer} className="relative mt-10 lg:mt-4 lg:h-[26rem]">
        {/* Desktop: the winding road, with marching dashes and a travelling dot. */}
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 hidden lg:block">
          <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="h-full w-full">
            <defs>
              <linearGradient id="career-road" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0" stopColor="#0ea5e9" />
                <stop offset="0.5" stopColor="#7c3aed" />
                <stop offset="1" stopColor="#10b981" />
              </linearGradient>
            </defs>
            <path
              d="M 0 64 C 5 64, 5 64, 10 64 S 20 36, 30 36 S 40 64, 50 64 S 60 36, 70 36 S 80 64, 90 64 S 97 64, 100 64"
              fill="none"
              stroke="url(#career-road)"
              strokeWidth="16"
              strokeLinecap="round"
              vectorEffect="non-scaling-stroke"
              opacity="0.12"
            />
            <path
              d="M 0 64 C 5 64, 5 64, 10 64 S 20 36, 30 36 S 40 64, 50 64 S 60 36, 70 36 S 80 64, 90 64 S 97 64, 100 64"
              fill="none"
              stroke="url(#career-road)"
              strokeWidth="3"
              strokeDasharray="10 10"
              strokeLinecap="round"
              vectorEffect="non-scaling-stroke"
              className="animate-road-march"
            />
          </svg>
          <span className="animate-career-travel absolute h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white shadow-[0_0_0_4px] shadow-primary/40 ring-4 ring-primary/60" />
        </div>

        {/* Mobile/tablet: vertical rail through the number column. */}
        <div
          aria-hidden="true"
          className="absolute bottom-6 left-7 top-6 w-0.5 rounded-full bg-gradient-to-b from-primary via-secondary to-emerald-400 opacity-30 lg:hidden"
        />

        <ol className="relative flex flex-col gap-5 lg:absolute lg:inset-0 lg:block">
          {journey.map((item, index) => {
            const summit = index === last;

            return (
              <RevealItem
                key={item.stage}
                as="li"
                className="group relative flex items-start gap-4 lg:absolute lg:block lg:h-0 lg:w-0 lg:[left:var(--x)] lg:[top:var(--y)]"
                style={{ "--x": `${item.x}%`, "--y": `${item.y}%` }}
              >
                <span
                  className={cn(
                    "relative z-10 flex flex-none items-center justify-center rounded-full bg-gradient-to-br text-white shadow-elevated ring-4 ring-white transition-transform duration-300 group-hover:scale-110",
                    "h-14 w-14 lg:absolute lg:left-0 lg:top-0 lg:-translate-x-1/2 lg:-translate-y-1/2",
                    summit && "lg:h-16 lg:w-16",
                    item.tile
                  )}
                >
                  {summit && <span aria-hidden="true" className="animate-ping-soft absolute inset-0 rounded-full bg-emerald-400/60" />}
                  <svg
                    width="26"
                    height="26"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.7"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                    className="relative"
                  >
                    {item.icon}
                  </svg>
                  <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-dark text-[10px] font-bold text-white">
                    {index + 1}
                  </span>
                </span>

                <div
                  className={cn(
                    "min-w-0 flex-1 rounded-2xl border bg-white p-4 shadow-card transition-all duration-300 group-hover:-translate-y-1 group-hover:shadow-elevated",
                    "lg:absolute lg:left-0 lg:w-52 lg:-translate-x-1/2 lg:flex-none lg:text-center",
                    item.above ? "lg:bottom-10" : "lg:top-10",
                    summit ? "border-emerald-300/60" : "border-border group-hover:border-primary/30"
                  )}
                >
                  <p className={cn("text-xs font-semibold uppercase tracking-widest", summit ? "text-emerald-600" : "text-primary")}>
                    Stage {index + 1}
                  </p>
                  <h3 className="mt-1 text-lg font-semibold leading-snug tracking-tight text-dark">{item.stage}</h3>
                  <p className="mt-1 text-sm leading-relaxed text-muted">{item.detail}</p>
                </div>
              </RevealItem>
            );
          })}
        </ol>
      </Reveal>

      <p className="relative mt-6 text-center text-xs text-muted">
        Career outcomes vary by effort, program and market conditions. We do not guarantee placement.
      </p>
    </Section>
  );
}
