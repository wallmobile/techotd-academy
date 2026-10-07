import { Section } from "@/components/shared/Section";
import { Reveal } from "@/components/shared/Reveal";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";

// Line icons (24px grid) and a gradient per highlight.
const highlights = [
  {
    title: "Interactive Classes",
    detail: "Discussion-led, not lecture-only.",
    tone: "from-sky-500 via-primary to-blue-700",
    icon: <path d="M4.5 5.5A1.5 1.5 0 016 4h12a1.5 1.5 0 011.5 1.5v9A1.5 1.5 0 0118 16h-6.5L7 19.5V16H6a1.5 1.5 0 01-1.5-1.5v-9z M8.5 9h7M8.5 12h4" />,
  },
  {
    title: "Hands-on Labs",
    detail: "Practise on real tools with support.",
    tone: "from-fuchsia-500 via-secondary to-violet-700",
    icon: (
      <>
        <rect x="3.5" y="4.5" width="17" height="11" rx="2" />
        <path d="M2 19.5h20M9.5 8.5l-2 2 2 2M14.5 8.5l2 2-2 2" />
      </>
    ),
  },
  {
    title: "Mentor Guidance",
    detail: "Trainers close by when you're stuck.",
    tone: "from-amber-400 via-orange-500 to-rose-600",
    icon: (
      <>
        <circle cx="10" cy="8" r="3.5" />
        <path d="M3.5 20c0-3.6 2.9-6 6.5-6s6.5 2.4 6.5 6M16.5 9.5l2 2 3.5-4" />
      </>
    ),
  },
  {
    title: "Collaborative Learning",
    detail: "Learn and build alongside peers.",
    tone: "from-emerald-400 via-teal-500 to-cyan-700",
    icon: (
      <>
        <circle cx="9" cy="8" r="3" />
        <circle cx="17" cy="9" r="2.5" />
        <path d="M3 19c0-3.2 2.7-5 6-5s6 1.8 6 5M15.5 14.2c3 0 5.5 1.4 5.5 4.8" />
      </>
    ),
  },
];

// Address matches the footer. Add real classroom photos here once assets exist.
const address =
  "A-84, below Noida Sector 16 metro station, A Block, Sector 4, Noida, Uttar Pradesh 201301";
const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;

export function CampusExperience() {
  return (
    <Section
      className="relative overflow-clip bg-gradient-to-br from-white via-blue-50/50 to-violet-50"
      containerClassName="relative grid grid-cols-1 gap-10 lg:grid-cols-12 lg:gap-14"
    >
      <div aria-hidden="true" className="animate-drift pointer-events-none absolute -left-24 top-1/3 h-80 w-80 rounded-full bg-primary/10 blur-3xl" />
      <div aria-hidden="true" className="animate-drift-slow pointer-events-none absolute -right-24 top-10 h-80 w-80 rounded-full bg-secondary/10 blur-3xl" />

      {/* Stays in view while the cards stack up beside it on large screens. */}
      <Reveal className="relative flex flex-col items-start gap-5 lg:sticky lg:top-28 lg:col-span-5 lg:self-start">
        <span className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-white px-3.5 py-1.5 text-xs font-semibold uppercase tracking-widest text-primary shadow-soft">
          <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-gradient-to-r from-primary to-secondary" />
          Classroom Experience
        </span>
        <h2 className="text-balance text-3xl font-bold leading-tight tracking-tight text-dark sm:text-4xl lg:text-5xl">
          A focused space to{" "}
          <span className="animate-gradient-x bg-gradient-to-r from-primary via-secondary to-primary bg-clip-text text-transparent">
            learn and build
          </span>
        </h2>
        <p className="max-w-md text-base leading-relaxed text-muted sm:text-lg">
          A structured classroom environment designed for hands-on, collaborative learning.
        </p>

        <Button href="/training/classroom" size="lg" className="group mt-1">
          <span className="inline-flex items-center gap-2">
            Explore Classroom Training
            <span aria-hidden="true" className="transition-transform duration-300 group-hover:translate-x-1">→</span>
          </span>
        </Button>

        <a
          href={mapsUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="group mt-2 flex w-full items-start gap-3.5 rounded-2xl border border-border bg-white p-4 shadow-card transition-transform duration-300 hover:-translate-y-0.5"
        >
          <span aria-hidden="true" className="flex h-10 w-10 flex-none items-center justify-center rounded-xl bg-gradient-to-br from-primary to-secondary">
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path d="M10 17.5s5.5-4.9 5.5-9a5.5 5.5 0 10-11 0c0 4.1 5.5 9 5.5 9z" stroke="white" strokeWidth="1.5" strokeLinejoin="round" />
              <circle cx="10" cy="8.5" r="2" stroke="white" strokeWidth="1.5" />
            </svg>
          </span>
          <span className="min-w-0 flex-1 text-sm text-muted">
            <span className="flex items-center gap-2 text-base font-semibold text-dark">
              Visit us in Noida
              <span aria-hidden="true" className="text-muted transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-1">↗</span>
            </span>
            {address}
            <span className="sr-only"> (opens in Google Maps)</span>
          </span>
        </a>
      </Reveal>

      {/* Cards stick one below the other as you scroll, so they pile into a deck. */}
      <ul className="relative flex flex-col gap-6 pb-4 lg:col-span-7 lg:gap-10 lg:pb-24">
        {highlights.map((item, index) => (
          <li
            key={item.title}
            style={{ "--stack": `${index * 1.1}rem` }}
            className="lg:sticky lg:[top:calc(7rem+var(--stack))]"
          >
            <article
              className={cn(
                "group relative flex min-h-[15rem] flex-col items-start overflow-hidden rounded-[2rem] bg-gradient-to-br p-7 text-white shadow-[0_30px_60px_-24px] shadow-black/40 ring-1 ring-white/10 sm:min-h-[17rem] sm:p-9",
                item.tone
              )}
            >
              <span aria-hidden="true" className="absolute inset-0 opacity-20" style={{ backgroundImage: "radial-gradient(#fff 1px, transparent 1px)", backgroundSize: "18px 18px" }} />
              <span aria-hidden="true" className="animate-drift absolute -bottom-16 -right-10 h-56 w-56 rounded-full bg-white/25 blur-3xl" />
              <span
                aria-hidden="true"
                className="absolute -right-3 -top-8 select-none text-[10rem] font-black leading-none text-white/15 transition-transform duration-500 group-hover:scale-110 sm:text-[12rem]"
              >
                {index + 1}
              </span>

              <span
                aria-hidden="true"
                className="relative flex h-14 w-14 items-center justify-center rounded-2xl border border-white/30 bg-white/20 shadow-[0_12px_30px_-8px] shadow-black/30 backdrop-blur transition-transform duration-500 group-hover:-rotate-6 group-hover:scale-110"
              >
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                  {item.icon}
                </svg>
              </span>

              <div className="relative mt-auto pt-8">
                <h3 className="text-2xl font-bold leading-snug tracking-tight sm:text-3xl">{item.title}</h3>
                <p className="mt-2 max-w-sm text-base leading-relaxed text-white/85 sm:text-lg">{item.detail}</p>
              </div>

              <div aria-hidden="true" className="relative mt-5 flex gap-1.5">
                {highlights.map((_, pip) => (
                  <span key={pip} className={cn("h-1.5 rounded-full transition-all duration-500", pip === index ? "w-8 bg-white" : "w-1.5 bg-white/40")} />
                ))}
              </div>
            </article>
          </li>
        ))}
      </ul>
    </Section>
  );
}
