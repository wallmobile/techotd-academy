import Link from "next/link";
import { Section } from "@/components/shared/Section";
import { Reveal, RevealItem } from "@/components/shared/Reveal";
import { Button } from "@/components/ui/Button";
import { staggerContainer } from "@/lib/motion";
import { cn } from "@/lib/utils";

// No verified student testimonials exist yet. Rather than showing an empty
// "coming soon" card or inventing reviews, this section offers a low-risk
// way to evaluate the academy first-hand. Replace with real, attributed
// testimonials once they are collected.
const ways = [
  {
    title: "Talk to a counsellor",
    detail: "Discuss your goals and get a course recommendation.",
    href: "/enquiry",
    cta: "Start a chat",
    tone: "from-sky-500 via-primary to-blue-700",
    soft: "text-primary",
    icon: <path d="M4.5 5.5A1.5 1.5 0 016 4h12a1.5 1.5 0 011.5 1.5v9A1.5 1.5 0 0118 16h-6.5L7 19.5V16H6a1.5 1.5 0 01-1.5-1.5v-9z" />,
  },
  {
    title: "Attend a demo",
    detail: "Experience how a session works before you enrol.",
    href: "/book-demo?source=homepage-trust",
    cta: "Book a free demo",
    tone: "from-fuchsia-500 via-secondary to-violet-700",
    soft: "text-secondary",
    icon: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M10 8.5l5 3.5-5 3.5z" />
      </>
    ),
  },
  {
    title: "Review the curriculum",
    detail: "See the modules, projects and tools for each course.",
    href: "/courses",
    cta: "Browse courses",
    tone: "from-emerald-400 via-teal-500 to-cyan-700",
    soft: "text-teal-600",
    icon: <path d="M4 5.5A1.5 1.5 0 015.5 4H11v15H5.5A1.5 1.5 0 004 20.5v-15zM20 5.5A1.5 1.5 0 0018.5 4H13v15h5.5a1.5 1.5 0 011.5 1.5v-15z" />,
  },
];

const dots = { backgroundImage: "radial-gradient(#fff 1px, transparent 1px)", backgroundSize: "18px 18px" };

/**
 * On sm+ each card is a two-sided flip card (hover or keyboard focus turns it
 * over to reveal the detail and link). Below sm there is no flip: both sides
 * are simply stacked, so touch users see everything without hovering.
 */
export function TestimonialsSection() {
  return (
    <Section tone="surface" className="relative overflow-clip bg-gradient-to-br from-blue-50 via-white to-violet-100">
      <div aria-hidden="true" className="animate-drift pointer-events-none absolute -left-24 top-10 h-80 w-80 rounded-full bg-primary/20 blur-3xl" />
      <div aria-hidden="true" className="animate-drift-slow pointer-events-none absolute -right-24 bottom-0 h-80 w-80 rounded-full bg-secondary/20 blur-3xl" />

      <Reveal className="relative mx-auto flex max-w-3xl flex-col items-center gap-4 text-center">
        <span className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-white px-3.5 py-1.5 text-xs font-semibold uppercase tracking-widest text-primary shadow-soft">
          <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-gradient-to-r from-primary to-secondary" />
          See for yourself
        </span>
        <h2 className="text-balance text-3xl font-bold tracking-tight text-dark sm:text-4xl lg:text-5xl">
          Not sure yet?{" "}
          <span className="animate-gradient-x block pb-1 bg-gradient-to-r from-primary via-secondary to-primary bg-clip-text text-transparent">
            Try before you commit
          </span>
        </h2>
        <p className="max-w-2xl text-balance text-base leading-relaxed text-muted sm:text-lg">
          We&apos;d rather you evaluate us directly. Student stories will be added here once verified.
        </p>
      </Reveal>

      <Reveal variants={staggerContainer} className="relative mt-12 grid grid-cols-1 gap-6 sm:grid-cols-3">
        {ways.map((way, index) => (
          <RevealItem key={way.title} className="group sm:h-80 sm:[perspective:1200px]">
            <div className="relative flex flex-col gap-3 sm:h-full sm:gap-0 sm:transition-transform sm:duration-700 sm:ease-out sm:[transform-style:preserve-3d] sm:group-focus-within:[transform:rotateY(180deg)] sm:group-hover:[transform:rotateY(180deg)] motion-reduce:sm:transition-none">
              {/* Front */}
              <div
                className={cn(
                  "relative flex flex-col items-start overflow-hidden rounded-3xl bg-gradient-to-br p-6 text-white shadow-elevated sm:absolute sm:inset-0 sm:p-7 sm:[backface-visibility:hidden]",
                  way.tone
                )}
              >
                <span aria-hidden="true" className="absolute inset-0 opacity-20" style={dots} />
                <span aria-hidden="true" className="absolute -right-6 -top-10 select-none text-[9rem] font-black leading-none text-white/15">
                  {index + 1}
                </span>
                <span
                  aria-hidden="true"
                  className="relative flex h-14 w-14 items-center justify-center rounded-2xl border border-white/30 bg-white/20 shadow-[0_10px_30px_-8px] shadow-black/30 backdrop-blur"
                >
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                    {way.icon}
                  </svg>
                </span>
                <p className="relative mt-auto text-xs font-bold uppercase tracking-[0.25em] text-white/70">Way 0{index + 1}</p>
                <h3 className="relative mt-1.5 text-2xl font-bold leading-snug tracking-tight">{way.title}</h3>
                <span aria-hidden="true" className="relative mt-4 hidden items-center gap-1.5 text-xs font-semibold text-white/80 sm:inline-flex">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M3 12a9 9 0 0115.5-6.2L21 8M21 3v5h-5M21 12a9 9 0 01-15.5 6.2L3 16M3 21v-5h5" />
                  </svg>
                  Hover to open
                </span>
              </div>

              {/* Back */}
              <div className="relative flex flex-col items-start overflow-hidden rounded-3xl border border-border bg-white p-6 shadow-elevated sm:absolute sm:inset-0 sm:p-7 sm:[backface-visibility:hidden] sm:[transform:rotateY(180deg)]">
                <span aria-hidden="true" className={cn("absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r", way.tone)} />
                <p className={cn("text-xs font-bold uppercase tracking-[0.25em]", way.soft)}>Way 0{index + 1}</p>
                <h3 className="mt-2 text-xl font-bold leading-snug tracking-tight text-dark">{way.title}</h3>
                <p className="mt-2 text-base leading-relaxed text-muted">{way.detail}</p>
                <Link
                  href={way.href}
                  className={cn(
                    "group/link mt-auto inline-flex items-center gap-2 rounded-full bg-gradient-to-r px-5 py-2.5 text-sm font-semibold text-white shadow-card transition-all duration-300 hover:gap-3 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary",
                    way.tone
                  )}
                >
                  {way.cta}
                  <span aria-hidden="true">→</span>
                </Link>
              </div>
            </div>
          </RevealItem>
        ))}
      </Reveal>

      <Reveal delay={200} className="relative mt-12 flex flex-wrap justify-center gap-3">
        <Button href="/book-demo?source=homepage-trust" size="lg" className="group shadow-[0_10px_30px_-8px] shadow-primary/50">
          <span className="inline-flex items-center gap-2">
            Book a Free Demo
            <span aria-hidden="true" className="transition-transform duration-300 group-hover:translate-x-1">→</span>
          </span>
        </Button>
        <Button href="/courses" variant="outline" size="lg">
          Browse Courses
        </Button>
      </Reveal>
    </Section>
  );
}
