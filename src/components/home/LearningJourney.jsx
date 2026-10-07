import { Section } from "@/components/shared/Section";
import { Reveal, RevealItem } from "@/components/shared/Reveal";
import { staggerContainer } from "@/lib/motion";
import { cn } from "@/lib/utils";

// Each step has its own line icon (24px grid) and a tile colour that moves
// from the brand blue to the brand violet, so the row reads as progress.
const steps = [
  {
    number: "01",
    title: "Choose Your Path",
    description: "Pick a course that fits your goal.",
    tile: "from-blue-600 to-blue-500",
    icon: (
      <>
        <circle cx="12" cy="12" r="8.5" />
        <path d="M15.5 8.5l-2 5-5 2 2-5 5-2z" />
      </>
    ),
  },
  {
    number: "02",
    title: "Learn With Experts",
    description: "Follow the curriculum with a mentor.",
    tile: "from-blue-600 to-indigo-500",
    icon: (
      <>
        <circle cx="12" cy="8" r="3.5" />
        <path d="M5 20c0-3.9 3.1-6.500 7-6.500s7 2.600 7 6.500" />
      </>
    ),
  },
  {
    number: "03",
    title: "Build Real Projects",
    description: "Apply every concept in practice.",
    tile: "from-indigo-600 to-violet-500",
    icon: <path d="M8 7l-5 5 5 5M16 7l5 5-5 5M13.500 5l-3 14" />,
  },
  {
    number: "04",
    title: "Practice & Get Feedback",
    description: "Review your work and improve.",
    tile: "from-violet-600 to-violet-500",
    icon: (
      <>
        <path d="M4.500 5.500A1.500 1.500 0 016 4h12a1.500 1.500 0 011.500 1.500v9A1.500 1.500 0 0118 16h-6.500L7 19.500V16H6a1.500 1.500 0 01-1.500-1.500v-9z" />
        <path d="M8.500 9h7M8.500 12h4" />
      </>
    ),
  },
  {
    number: "05",
    title: "Build Career Confidence",
    description: "Prepare to present your skills.",
    tile: "from-violet-600 to-fuchsia-500",
    icon: (
      <>
        <path d="M6 20V4" />
        <path d="M6 5h11l-2.500 4L17 13H6" />
      </>
    ),
  },
];

export function LearningJourney() {
  return (
    <Section tone="surface" className="relative overflow-clip pt-8 sm:pt-10 lg:pt-12">
      <div aria-hidden="true" className="pointer-events-none absolute -left-20 top-10 h-64 w-64 rounded-full bg-primary/10 blur-3xl" />
      <div aria-hidden="true" className="pointer-events-none absolute -right-20 bottom-0 h-64 w-64 rounded-full bg-secondary/10 blur-3xl" />

      <div className="relative mx-auto flex max-w-3xl flex-col items-center gap-4 text-center">
        <span className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-white px-3.5 py-1.5 text-xs font-semibold uppercase tracking-widest text-primary shadow-soft">
          <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-gradient-to-r from-primary to-secondary" />
          How You Learn
        </span>
        <h2 className="text-4xl font-bold tracking-tight text-dark sm:text-5xl">
          A clear path from first class to{" "}
          <span className="bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">career-ready.</span>
        </h2>
      </div>

      <Reveal variants={staggerContainer} className="relative mt-14">
        {/* Desktop connector: sits behind the icon tiles at their vertical centre. */}
        <div aria-hidden="true" className="absolute inset-x-[10%] top-8 hidden h-0.5 lg:block">
          <div className="h-full w-full rounded-full bg-gradient-to-r from-primary via-secondary to-secondary/40 opacity-30" />
          <span className="animate-journey-travel absolute top-1/2 h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-secondary shadow-[0_0_12px_3px] shadow-secondary/50" />
        </div>
        {/* Mobile/tablet connector: a vertical rail down the icon column. */}
        <div
          aria-hidden="true"
          className="absolute bottom-8 left-8 top-8 w-0.5 rounded-full bg-gradient-to-b from-primary via-secondary to-secondary/30 opacity-30 sm:hidden"
        />

        <ol className="relative grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-5 lg:gap-5">
          {steps.map((step, index) => (
            <RevealItem
              key={step.number}
              as="li"
              className={cn(
                "group relative flex items-start gap-4 lg:flex-col lg:items-stretch lg:gap-0",
                index === steps.length - 1 && "sm:col-span-2 lg:col-span-1"
              )}
            >
              <span
                aria-hidden="true"
                className={cn(
                  "relative z-10 flex h-16 w-16 flex-none items-center justify-center rounded-2xl bg-gradient-to-br text-white shadow-elevated ring-4 ring-surface transition-transform duration-300 group-hover:-translate-y-1 group-hover:rotate-3 lg:mx-auto",
                  step.tile
                )}
              >
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                  {step.icon}
                </svg>
                <span className="absolute -right-2 -top-2 flex h-6 min-w-6 items-center justify-center rounded-full bg-white px-1 text-[11px] font-bold text-dark shadow-soft">
                  {step.number}
                </span>
              </span>

              <div className="flex-1 rounded-2xl border border-border bg-white p-5 shadow-card transition-all duration-300 group-hover:-translate-y-1 group-hover:border-primary/30 group-hover:shadow-elevated lg:-mt-6 lg:pt-10 lg:text-center">
                <h3 className="text-base font-semibold leading-snug text-dark">{step.title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-muted">{step.description}</p>
              </div>
            </RevealItem>
          ))}
        </ol>
      </Reveal>
    </Section>
  );
}
