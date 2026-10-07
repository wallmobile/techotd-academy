import { Section } from "@/components/shared/Section";
import { ArrowLink } from "@/components/shared/ArrowLink";
import { Button } from "@/components/ui/Button";
import { Reveal, RevealItem } from "@/components/shared/Reveal";
import { scaleIn, staggerContainer } from "@/lib/motion";
import { getTrainingModeBySlug } from "@/data/trainingModes";
import { cn } from "@/lib/utils";

const modes = [
  {
    title: "Live Online",
    tag: "Learn from anywhere",
    description: "Interactive instructor-led sessions from wherever you are.",
    bestFor: "Working professionals and learners outside Noida",
    points: ["Live sessions with Q&A", "Learn from home", "No commute"],
    href: "/training/online",
    icon: (
      <>
        <rect x="2.5" y="4" width="15" height="10" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
        <path d="M2.5 15h15" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        <path d="M7.5 8.5a3.5 3.5 0 015 0M8.8 9.8a1.7 1.7 0 012.4 0" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
        <circle cx="10" cy="11" r="0.8" fill="currentColor" />
      </>
    ),
  },
  {
    title: "Classroom",
    tag: "Learn in person",
    description: "In-person learning with direct trainer interaction.",
    bestFor: "Learners who prefer a structured, in-person routine",
    points: ["Face-to-face mentoring", "Hands-on lab time", "Peer collaboration"],
    href: "/training/classroom",
    icon: (
      <>
        <rect x="2.5" y="4" width="15" height="10" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
        <path d="M6 15v1.5M14 15v1.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        <path d="M5.5 8h5M5.5 11h3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </>
    ),
  },
  {
    title: "Hybrid",
    tag: "Best of both",
    description: "Combine classroom and online sessions in one program.",
    bestFor: "Learners who want flexibility without losing in-person support",
    points: ["Mix of both formats", "Available on select courses", "Same curriculum"],
    href: "/courses",
    icon: (
      <>
        <rect x="2.5" y="4" width="9" height="7" rx="1.2" stroke="currentColor" strokeWidth="1.5" />
        <path d="M2.5 15h9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        <circle cx="15.5" cy="13" r="3.2" stroke="currentColor" strokeWidth="1.5" />
        <path d="M15.5 11.3V13l1.1.9" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
      </>
    ),
  },
];

const corporate = getTrainingModeBySlug("corporate");

// Alternates the two brand accents so the row reads as one system.
const THEMES = [
  {
    glow: "from-primary/15",
    tile: "from-primary to-blue-500",
    text: "text-primary",
    tag: "bg-primary/10 text-primary",
    best: "bg-primary/5 border-primary/15",
    check: "bg-primary/10 text-primary",
    cta: "bg-primary text-white hover:bg-primary-hover",
    card: "hover:border-primary/40",
    bar: "from-primary to-blue-400",
  },
  {
    glow: "from-secondary/15",
    tile: "from-secondary to-fuchsia-500",
    text: "text-secondary",
    tag: "bg-secondary/10 text-secondary",
    best: "bg-secondary/5 border-secondary/15",
    check: "bg-secondary/10 text-secondary",
    cta: "bg-secondary text-white hover:bg-secondary-hover",
    card: "hover:border-secondary/40",
    bar: "from-secondary to-fuchsia-400",
  },
];

export function LearningModes() {
  return (
    <Section className="relative overflow-clip bg-gradient-to-b from-white to-surface pb-8 sm:pb-10 lg:pb-12">
      <div aria-hidden="true" className="pointer-events-none absolute -right-24 top-0 h-72 w-72 rounded-full bg-primary/10 blur-3xl" />
      <div aria-hidden="true" className="pointer-events-none absolute -left-24 bottom-10 h-72 w-72 rounded-full bg-secondary/10 blur-3xl" />

      <div className="relative mx-auto mb-12 flex max-w-3xl flex-col items-center gap-4 text-center">
        <span className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-white px-3.5 py-1.5 text-xs font-semibold uppercase tracking-widest text-primary shadow-soft">
          <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-gradient-to-r from-primary to-secondary" />
          Flexible Learning
        </span>
        <h2 className="text-4xl font-bold tracking-tight text-dark sm:text-5xl">
          Learn the way{" "}
          <span className="bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">fits you</span>
        </h2>
        <p className="max-w-2xl text-balance text-base leading-relaxed text-muted sm:text-lg">
          Pick the format that suits your routine. Available modes vary by course.
        </p>
      </div>

      <ul className="relative grid grid-cols-1 gap-5 md:grid-cols-3 lg:gap-6">
        {modes.map((mode, index) => {
          const theme = THEMES[index % THEMES.length];
          return (
            <li key={mode.title} className="flex">
              <article
                className={cn(
                  "group relative flex w-full flex-col overflow-hidden rounded-2xl border border-border bg-white p-6 shadow-card transition-all duration-300 hover:-translate-y-1.5 hover:shadow-elevated sm:p-7",
                  theme.card
                )}
              >
                <div
                  aria-hidden="true"
                  className={cn("pointer-events-none absolute inset-x-0 top-0 h-32 bg-gradient-to-b to-transparent", theme.glow)}
                />

                <div className="relative flex items-start justify-between gap-3">
                  <span
                    aria-hidden="true"
                    className={cn(
                      "flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br text-white shadow-soft transition-transform duration-300 group-hover:scale-105",
                      theme.tile
                    )}
                  >
                    <svg width="26" height="26" viewBox="0 0 20 20" fill="none">
                      {mode.icon}
                    </svg>
                  </span>
                  <span className={cn("rounded-full px-3 py-1 text-xs font-semibold", theme.tag)}>{mode.tag}</span>
                </div>

                <h3 className="relative mt-5 text-xl font-semibold text-dark">{mode.title}</h3>
                <p className="relative mt-2 text-sm leading-relaxed text-muted">{mode.description}</p>

                <ul className="relative mt-5 flex flex-col gap-2.5 text-sm text-text">
                  {mode.points.map((point) => (
                    <li key={point} className="flex items-center gap-2.5">
                      <span
                        aria-hidden="true"
                        className={cn("flex h-5 w-5 flex-none items-center justify-center rounded-full", theme.check)}
                      >
                        <svg width="12" height="12" viewBox="0 0 20 20" fill="none">
                          <path d="M4.5 10.5l3.5 3.5 7.5-8" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </span>
                      {point}
                    </li>
                  ))}
                </ul>

                <p className={cn("relative mt-6 flex-1 rounded-xl border px-4 py-3 text-xs leading-relaxed text-muted", theme.best)}>
                  <span className="font-semibold text-dark">Best for: </span>
                  {mode.bestFor}
                </p>

                <ArrowLink
                  href={mode.href}
                  className={cn(
                    "relative mt-5 w-full justify-center rounded-button px-4 py-2.5 font-semibold transition-colors",
                    theme.cta,
                    "hover:text-white"
                  )}
                >
                  Learn more
                </ArrowLink>

                <span
                  aria-hidden="true"
                  className={cn(
                    "absolute inset-x-0 bottom-0 h-1 origin-left scale-x-0 bg-gradient-to-r transition-transform duration-300 group-hover:scale-x-100",
                    theme.bar
                  )}
                />
              </article>
            </li>
          );
        })}
      </ul>

      <Reveal variants={scaleIn} className="relative mt-12">
        <div className="animate-gradient-x rounded-3xl bg-gradient-to-r from-cyan-300/70 via-violet-400/70 to-primary/70 p-px shadow-elevated">
          <div className="relative overflow-hidden rounded-[calc(1.5rem-1px)] bg-gradient-to-br from-[#0b1f3a] via-[#0f2a5c] to-[#25207a] p-6 sm:p-10 lg:p-12">
            <div aria-hidden="true" className="animate-drift pointer-events-none absolute -left-16 -top-16 h-56 w-56 rounded-full bg-primary/40 blur-3xl" />
            <div aria-hidden="true" className="animate-drift-slow pointer-events-none absolute -bottom-20 right-0 h-64 w-64 rounded-full bg-secondary/40 blur-3xl" />
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 opacity-60"
              style={{
                backgroundImage:
                  "linear-gradient(to right, rgb(255 255 255 / 0.05) 1px, transparent 1px), linear-gradient(to bottom, rgb(255 255 255 / 0.05) 1px, transparent 1px)",
                backgroundSize: "40px 40px",
              }}
            />

            <div className="relative grid items-center gap-8 lg:grid-cols-12 lg:gap-12">
              <Reveal variants={staggerContainer} className="lg:col-span-7">
                <RevealItem as="span" className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3.5 py-1.5 text-xs font-semibold uppercase tracking-widest text-cyan-200">
                  <span aria-hidden="true" className="relative flex h-2 w-2">
                    <span className="animate-ping-soft absolute inline-flex h-full w-full rounded-full bg-cyan-300" />
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-cyan-300" />
                  </span>
                  Corporate Training
                </RevealItem>
                <RevealItem as="h3" className="mt-4 text-3xl font-bold leading-tight tracking-tight text-white sm:text-4xl">
                  Upskill your whole team,{" "}
                  <span className="animate-gradient-x bg-gradient-to-r from-cyan-300 via-violet-300 to-cyan-300 bg-clip-text text-transparent">
                    together.
                  </span>
                </RevealItem>
                <RevealItem as="p" className="mt-4 max-w-xl text-base leading-relaxed text-white/70">
                  {corporate.shortDescription} Programs are shaped around your team&rsquo;s roles and goals, and can be
                  delivered online, offline or in a hybrid format.
                </RevealItem>
                <RevealItem className="mt-7 flex flex-wrap gap-3">
                  <Button
                    href="/training/corporate"
                    size="lg"
                    className="group/cta bg-white text-primary hover:-translate-y-0.5 hover:bg-white/90 hover:shadow-elevated active:bg-white/80"
                  >
                    Explore Corporate Training
                    <span aria-hidden="true" className="transition-transform duration-200 group-hover/cta:translate-x-1">
                      →
                    </span>
                  </Button>
                  <Button
                    href="/enquiry?source=corporate-training"
                    variant="ghost"
                    size="lg"
                    className="border border-white/25 text-white hover:-translate-y-0.5 hover:bg-white/10"
                  >
                    Talk to Us
                  </Button>
                </RevealItem>
              </Reveal>

              <Reveal
                variants={staggerContainer}
                role="list"
                className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:col-span-5 lg:grid-cols-1"
              >
                {corporate.features.slice(0, 4).map((feature) => (
                  <RevealItem
                    key={feature}
                    role="listitem"
                    className="group/tile flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.07] px-4 py-3.5 text-sm font-medium text-white backdrop-blur transition-all duration-300 hover:translate-x-1 hover:border-white/30 hover:bg-white/15"
                  >
                    <span
                      aria-hidden="true"
                      className="flex h-8 w-8 flex-none items-center justify-center rounded-lg bg-gradient-to-br from-primary to-secondary text-white transition-transform duration-300 group-hover/tile:rotate-6 group-hover/tile:scale-110"
                    >
                      <svg width="16" height="16" viewBox="0 0 20 20" fill="none">
                        <path d="M4.5 10.5l3.5 3.5 7.5-8" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </span>
                    {feature}
                  </RevealItem>
                ))}
              </Reveal>
            </div>
          </div>
        </div>
      </Reveal>    </Section>
  );
}
