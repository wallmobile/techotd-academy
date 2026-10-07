import { Section } from "@/components/shared/Section";
import { Button } from "@/components/ui/Button";
import { Reveal } from "@/components/shared/Reveal";
import { cn } from "@/lib/utils";

// Describes the format of an instructor-led session. Not a real class
// schedule — actual batch timings are on the Batches page.
const flow = [
  { step: "Concept", pos: "left-1/2 top-0", tone: "from-sky-400 to-primary" },
  { step: "Build", pos: "left-full top-1/2", tone: "from-primary to-secondary" },
  { step: "Ask", pos: "left-1/2 top-full", tone: "from-secondary to-fuchsia-500" },
  { step: "Practice", pos: "left-0 top-1/2", tone: "from-emerald-400 to-teal-400" },
];

const iconProps = {
  width: 18,
  height: 18,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.8,
  strokeLinecap: "round",
  strokeLinejoin: "round",
  "aria-hidden": true,
};

const benefits = [
  {
    title: "Ask in real time",
    detail: "No waiting on replies",
    icon: (
      <svg {...iconProps}>
        <path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.4A8 8 0 1 1 21 12Z" />
      </svg>
    ),
  },
  {
    title: "Instructor feedback",
    detail: "On your own work",
    icon: (
      <svg {...iconProps}>
        <path d="M12 20h9" />
        <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
      </svg>
    ),
  },
  {
    title: "Structured schedule",
    detail: "Keeps you consistent",
    icon: (
      <svg {...iconProps}>
        <rect x="3" y="4" width="18" height="17" rx="3" />
        <path d="M8 2v4M16 2v4M3 10h18" />
      </svg>
    ),
  },
];

export function LiveClasses() {
  return (
    <Section
      tone="dark"
      className="relative overflow-clip"
      containerClassName="relative flex flex-col gap-12 lg:gap-14"
    >
      <div aria-hidden="true" className="pointer-events-none absolute -left-32 top-0 h-96 w-96 rounded-full bg-primary/25 blur-3xl" />
      <div aria-hidden="true" className="pointer-events-none absolute -right-32 bottom-0 h-96 w-96 rounded-full bg-secondary/25 blur-3xl" />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-[0.07]"
        style={{ backgroundImage: "radial-gradient(#fff 1px, transparent 1px)", backgroundSize: "24px 24px" }}
      />

      <div className="relative grid items-center gap-12 lg:grid-cols-12 lg:gap-8">
        <div className="flex w-full max-w-xl flex-col items-start gap-5 lg:col-span-6">
          <Reveal>
          <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3.5 py-1.5 text-xs font-semibold uppercase tracking-widest text-white backdrop-blur">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping-soft absolute inline-flex h-full w-full rounded-full bg-red-400" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-red-500" />
            </span>
            Live Learning
          </span>
          </Reveal>
          <Reveal delay={100}>
          <h2 className="text-3xl font-bold leading-tight tracking-tight text-white sm:text-4xl lg:text-5xl">
            Learn in real time,
            <span className="animate-gradient-x block bg-gradient-to-r from-sky-300 via-fuchsia-400 to-sky-300 bg-clip-text text-transparent">
              with a real instructor
            </span>
          </h2>
          </Reveal>
          <Reveal delay={200}>
          <p className="text-base leading-relaxed text-white/70 sm:text-lg">
            Instructor-led sessions mean you can ask, get unstuck and get feedback while you learn.
          </p>
          </Reveal>

          <Reveal delay={300} className="mt-1 w-full">
          <ul className="grid w-full grid-cols-1 divide-y divide-white/10 overflow-hidden rounded-2xl border border-white/10 bg-white/5 backdrop-blur sm:grid-cols-3 sm:divide-x sm:divide-y-0">
            {benefits.map((benefit) => (
              <li key={benefit.title} className="group flex flex-col gap-2.5 p-4 transition-colors duration-300 hover:bg-white/5">
                <span
                  aria-hidden="true"
                  className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-primary/50 to-secondary/50 text-white ring-1 ring-white/20 transition-transform duration-300 group-hover:scale-110"
                >
                  {benefit.icon}
                </span>
                <span>
                  <span className="block text-sm font-semibold text-white">{benefit.title}</span>
                  <span className="mt-0.5 block text-xs text-white/60">{benefit.detail}</span>
                </span>
              </li>
            ))}
          </ul>
          </Reveal>

          <Reveal delay={400} className="mt-2">
          <div className="flex flex-wrap gap-3">
            <Button href="/training/online" size="lg" className="group shadow-[0_10px_30px_-8px] shadow-primary/70">
              <span className="inline-flex items-center gap-2">
                Explore Live Online
                <span aria-hidden="true" className="transition-transform duration-300 group-hover:translate-x-1">→</span>
              </span>
            </Button>
            <Button href="/book-demo?source=live-classes" variant="outline" size="lg" className="border-white/20 bg-white/5 text-white backdrop-blur hover:bg-white/10 hover:text-white">
              Book a Free Demo
            </Button>
          </div>
          </Reveal>
        </div>

        {/* A session is a loop, so the four stages orbit one live core. */}
        <Reveal delay={200} aria-hidden="true" className="group mx-auto w-full max-w-lg px-12 sm:px-16 lg:col-span-6">
          <div className="relative aspect-square">
            <div className="absolute inset-0 rounded-full border border-dashed border-white/20" />
            <div className="absolute inset-[16%] rounded-full border border-white/10" />
            <div className="absolute inset-[16%] animate-[spin_16s_linear_infinite_reverse] motion-reduce:animate-none">
              <span className="absolute left-1/2 top-0 h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-fuchsia-300 shadow-[0_0_14px_4px] shadow-fuchsia-400/70" />
            </div>

            <div className="absolute left-1/2 top-1/2 flex h-28 w-28 -translate-x-1/2 -translate-y-1/2 items-center justify-center sm:h-32 sm:w-32">
              <span className="animate-ping-soft absolute inset-0 rounded-full bg-primary/30" />
              <span style={{ animationDelay: "1s" }} className="animate-ping-soft absolute inset-0 rounded-full bg-secondary/25" />
              <span className="absolute inset-3 rounded-full bg-primary/20 blur-md" />
              <span className="relative flex h-full w-full flex-col items-center justify-center rounded-full border border-white/20 bg-gradient-to-br from-primary to-secondary shadow-[0_0_40px_-4px] shadow-primary/60">
                <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-white">
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-white" />
                  Live
                </span>
                <span className="mt-0.5 text-xs font-semibold text-white/85">Session</span>
              </span>
            </div>

            {/* The stages revolve around the core; each pill counter-rotates to stay upright. Hover pauses. */}
            <div className="absolute inset-0 animate-[spin_40s_linear_infinite] motion-reduce:animate-none group-hover:[animation-play-state:paused]">
              <span className="absolute left-1/2 top-0 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-sky-300 shadow-[0_0_18px_6px] shadow-sky-400/70" />
              {flow.map((item, index) => (
                <span key={item.step} className={cn("absolute", item.pos)}>
                  <span className="absolute -translate-x-1/2 -translate-y-1/2">
                    <span className="flex animate-[spin_40s_linear_infinite_reverse] items-center gap-2 whitespace-nowrap rounded-full border border-white/15 bg-dark/90 py-1.5 pl-1.5 pr-3.5 text-sm font-semibold text-white shadow-lg backdrop-blur motion-reduce:animate-none group-hover:[animation-play-state:paused]">
                      <span className={cn("flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br text-xs font-bold text-white", item.tone)}>
                        {index + 1}
                      </span>
                      {item.step}
                    </span>
                  </span>
                </span>
              ))}
            </div>
          </div>
        </Reveal>
      </div>
    </Section>
  );
}
