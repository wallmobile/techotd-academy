import { Section } from "@/components/shared/Section";
import { Reveal } from "@/components/shared/Reveal";
import { Button } from "@/components/ui/Button";
import { careerSupportItems } from "@/data/careerSupport";
import { cn } from "@/lib/utils";

// Line icons (24px grid) keyed by the `code` in data/careerSupport.js.
const META = {
  RG: {
    tone: "from-sky-400 to-primary",
    icon: (
      <>
        <path d="M6 3h8l4 4v14H6z" />
        <path d="M14 3v4h4M9 12h6M9 16h6" />
      </>
    ),
  },
  PD: {
    tone: "from-primary to-indigo-500",
    icon: (
      <>
        <rect x="3" y="4" width="18" height="16" rx="2.5" />
        <path d="M3 9h18M8 14h3M8 17h6" />
      </>
    ),
  },
  MI: {
    tone: "from-indigo-500 to-secondary",
    icon: (
      <>
        <rect x="9" y="3" width="6" height="11" rx="3" />
        <path d="M5 11a7 7 0 0014 0M12 18v3" />
      </>
    ),
  },
  TI: {
    tone: "from-secondary to-fuchsia-500",
    icon: <path d="M8 7l-5 5 5 5M16 7l5 5-5 5M13.5 5l-3 14" />,
  },
  CP: {
    tone: "from-fuchsia-500 to-pink-500",
    icon: (
      <>
        <path d="M4.5 5.5A1.5 1.5 0 016 4h12a1.5 1.5 0 011.5 1.5v9A1.5 1.5 0 0118 16h-6.5L7 19.5V16H6a1.5 1.5 0 01-1.5-1.5v-9z" />
        <path d="M8.5 9h7M8.5 12h4" />
      </>
    ),
  },
  JS: {
    tone: "from-emerald-400 to-teal-500",
    icon: (
      <>
        <circle cx="11" cy="11" r="6.5" />
        <path d="M16 16l4.5 4.5" />
      </>
    ),
  },
};

function Icon({ code, size = 22 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {META[code]?.icon}
    </svg>
  );
}

// Place the nodes evenly on a ring (angle 0 = top), as % of the orbit box.
const ringPosition = (index, total) => {
  const angle = (index / total) * 2 * Math.PI - Math.PI / 2;
  return { left: `${50 + 43 * Math.cos(angle)}%`, top: `${50 + 43 * Math.sin(angle)}%` };
};

export function CareerSupport() {
  const total = careerSupportItems.length;

  return (
    <Section tone="dark" className="relative overflow-clip">
      <div aria-hidden="true" className="animate-drift pointer-events-none absolute -right-32 top-0 h-96 w-96 rounded-full bg-secondary/25 blur-3xl" />
      <div aria-hidden="true" className="animate-drift-slow pointer-events-none absolute -left-32 bottom-0 h-96 w-96 rounded-full bg-primary/25 blur-3xl" />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-[0.07]"
        style={{ backgroundImage: "radial-gradient(#fff 1px, transparent 1px)", backgroundSize: "24px 24px" }}
      />

      <div className="relative grid items-center gap-12 lg:grid-cols-12 lg:gap-8">
        {/* Orbit first on desktop so the text sits on the right. */}
        <Reveal delay={150} className="group relative hidden lg:col-span-6 lg:block">
          <div className="mx-auto w-full max-w-lg px-16">
            <div className="relative aspect-square">
              <div aria-hidden="true" className="absolute inset-0 rounded-full border border-dashed border-white/20" />
              <div aria-hidden="true" className="absolute inset-[18%] rounded-full border border-white/10" />
              <div aria-hidden="true" className="absolute inset-[18%] animate-[spin_18s_linear_infinite_reverse] motion-reduce:animate-none">
                <span className="absolute left-1/2 top-0 h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-fuchsia-300 shadow-[0_0_14px_4px] shadow-fuchsia-400/70" />
              </div>

              {/* Core */}
              <div className="absolute left-1/2 top-1/2 flex h-28 w-28 -translate-x-1/2 -translate-y-1/2 items-center justify-center">
                <span aria-hidden="true" className="animate-ping-soft absolute inset-0 rounded-full bg-primary/30" />
                <span aria-hidden="true" style={{ animationDelay: "1s" }} className="animate-ping-soft absolute inset-0 rounded-full bg-secondary/25" />
                <span className="relative flex h-full w-full flex-col items-center justify-center rounded-full border border-white/20 bg-gradient-to-br from-primary to-secondary text-center shadow-[0_0_40px_-4px] shadow-primary/60">
                  <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M6 21V4" />
                    <path d="M6 5h12l-3 4.5 3 4.5H6" />
                  </svg>
                  <span className="mt-1 text-[11px] font-bold uppercase leading-tight tracking-wider text-white">Career<br />Ready</span>
                </span>
              </div>

              {/* The six supports revolve around the core; each stays upright. Hover pauses. */}
              <ul className="absolute inset-0 animate-[spin_60s_linear_infinite] motion-reduce:animate-none group-hover:[animation-play-state:paused]">
                {careerSupportItems.map((item, index) => (
                  <li key={item.title} className="absolute" style={ringPosition(index, total)}>
                    <div className="absolute -translate-x-1/2 -translate-y-1/2">
                      <div className="flex w-32 animate-[spin_60s_linear_infinite_reverse] flex-col items-center gap-2 text-center motion-reduce:animate-none group-hover:[animation-play-state:paused]">
                        <span
                          className={cn(
                            "flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br text-white shadow-[0_10px_30px_-8px] shadow-primary/60 ring-4 ring-dark",
                            META[item.code]?.tone
                          )}
                        >
                          <Icon code={item.code} size={24} />
                        </span>
                        <span className="rounded-full border border-white/10 bg-dark/80 px-2.5 py-1 text-xs font-semibold leading-tight text-white backdrop-blur">
                          {item.title}
                        </span>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </Reveal>

        <Reveal className="flex flex-col items-start gap-5 lg:col-span-6 lg:pl-6">
          <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3.5 py-1.5 text-xs font-semibold uppercase tracking-widest text-white backdrop-blur">
            <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
            Career Support
          </span>
          <h2 className="text-balance text-3xl font-bold leading-tight tracking-tight text-white sm:text-4xl lg:text-5xl">
            Support
            <span className="animate-gradient-x block bg-gradient-to-r from-sky-300 via-fuchsia-400 to-sky-300 bg-clip-text text-transparent">
              beyond the classroom
            </span>
          </h2>
          <p className="max-w-md text-base leading-relaxed text-white/70 sm:text-lg">
            Practical support to help you present your skills with confidence.
          </p>

          {/* Small screens: the same six supports as a plain grid. */}
          <ul className="mt-2 grid w-full grid-cols-1 gap-2.5 sm:grid-cols-2 lg:hidden">
            {careerSupportItems.map((item) => (
              <li key={item.title} className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 p-3 backdrop-blur">
                <span className={cn("flex h-10 w-10 flex-none items-center justify-center rounded-xl bg-gradient-to-br text-white", META[item.code]?.tone)}>
                  <Icon code={item.code} size={20} />
                </span>
                <span className="text-sm font-semibold text-white">{item.title}</span>
              </li>
            ))}
          </ul>

          <Button href="/book-demo?source=career-support" size="lg" className="group mt-2 shadow-[0_10px_30px_-8px] shadow-primary/70">
            <span className="inline-flex items-center gap-2">
              Book a Free Demo
              <span aria-hidden="true" className="transition-transform duration-300 group-hover:translate-x-1">→</span>
            </span>
          </Button>
        </Reveal>
      </div>
    </Section>
  );
}
