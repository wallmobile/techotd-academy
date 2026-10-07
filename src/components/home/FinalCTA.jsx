import Link from "next/link";
import { Section } from "@/components/shared/Section";
import { Reveal } from "@/components/shared/Reveal";
import { RotatingText } from "@/components/shared/RotatingText";
import { isBuiltRoute } from "@/constants/navigation";
import { cn } from "@/lib/utils";

// Pill-style CTA. Routes that aren't built yet render a disabled "Coming soon"
// pill instead of a dead link.
function PillCta({ href, children, primary }) {
  const base =
    "group relative inline-flex items-center gap-3 overflow-hidden rounded-full px-6 py-3 text-sm font-semibold sm:text-base transition-all duration-300 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary";
  const look = primary
    ? "bg-dark pr-2.5 text-white shadow-[0_20px_40px_-14px] shadow-dark/60 hover:-translate-y-0.5 hover:shadow-[0_26px_50px_-14px] hover:shadow-dark/70"
    : "border border-border bg-white/80 text-dark shadow-soft backdrop-blur hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-card";

  const content = (
    <>
      {primary && <span aria-hidden="true" className="animate-shine pointer-events-none absolute inset-y-0 left-0 w-1/4 bg-gradient-to-r from-transparent via-white/25 to-transparent" />}
      <span className="relative">{children}</span>
      {primary && (
        <span aria-hidden="true" className="relative flex h-8 w-8 items-center justify-center rounded-full bg-white text-dark transition-transform duration-300 group-hover:translate-x-1">
          →
        </span>
      )}
    </>
  );

  if (isBuiltRoute(href)) {
    return (
      <Link href={href} className={cn(base, look)}>
        {content}
      </Link>
    );
  }
  return (
    <span aria-disabled="true" title="Coming soon" className={cn(base, look, "pointer-events-none opacity-50")}>
      {content}
    </span>
  );
}

const reassurances = ["Free demo", "Live online & classroom formats", "Counselling to pick your course"];

// Soft glass chips floating around the card.
const chips = [
  { label: "React", pos: "left-[4%] top-[14%]", dot: "bg-sky-500", delay: "0s" },
  { label: "Python", pos: "left-[8%] bottom-[18%]", dot: "bg-amber-500", delay: "1s" },
  { label: "AWS", pos: "right-[5%] top-[18%]", dot: "bg-fuchsia-500", delay: "0.5s" },
  { label: "SQL", pos: "right-[9%] bottom-[16%]", dot: "bg-emerald-500", delay: "1.5s" },
];

export function FinalCTA() {
  return (
    <Section
      className="relative overflow-hidden py-10 sm:py-12 lg:py-14"
      containerClassName="relative"
      style={{
        backgroundColor: "#f8fafc",
        backgroundImage:
          "radial-gradient(60rem 30rem at 12% 10%, rgb(125 211 252 / 0.45), transparent 60%), radial-gradient(50rem 28rem at 90% 20%, rgb(240 171 252 / 0.45), transparent 60%), radial-gradient(48rem 26rem at 55% 100%, rgb(196 181 253 / 0.5), transparent 60%)",
      }}
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-[0.5] [mask-image:radial-gradient(ellipse_at_center,#000_30%,transparent_80%)]"
        style={{ backgroundImage: "radial-gradient(rgb(15 23 42 / 0.08) 1px, transparent 1px)", backgroundSize: "22px 22px" }}
      />

      {chips.map((chip) => (
        <span
          key={chip.label}
          aria-hidden="true"
          style={{ animationDelay: chip.delay }}
          className={cn(
            "animate-float absolute hidden items-center gap-2 rounded-full border border-white/70 bg-white/60 px-4 py-2 text-sm font-semibold text-dark shadow-card backdrop-blur-md lg:flex",
            chip.pos
          )}
        >
          <span className={cn("h-2 w-2 rounded-full", chip.dot)} />
          {chip.label}
        </span>
      ))}

      <Reveal className="relative mx-auto flex max-w-3xl flex-col items-center text-center">
        <span className="inline-flex items-center gap-2 rounded-full border border-white bg-white/70 px-4 py-1.5 text-xs font-semibold uppercase tracking-widest text-primary shadow-soft backdrop-blur">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping-soft absolute inline-flex h-full w-full rounded-full bg-emerald-400" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
          </span>
          Start today
        </span>

        <h2 className="mt-5 text-balance text-3xl font-bold leading-[1.08] tracking-tight text-dark sm:text-4xl lg:text-5xl">
          Ready to build your next{" "}
          <span className="relative inline-block">
            <span aria-hidden="true" className="absolute -inset-x-3 inset-y-1 -rotate-1 rounded-2xl bg-gradient-to-r from-sky-200 via-violet-200 to-fuchsia-200" />
            <RotatingText phrases={["skill?", "project?", "career?"]} interval={2400} className="relative bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent" />
          </span>
        </h2>

        <p className="mt-4 max-w-xl text-base leading-relaxed text-muted">
          Try a free demo or explore our courses. Our team will help you find the right program for your goals.
        </p>

        <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
          <PillCta href="/book-demo?source=homepage" primary>
            Book a Free Demo
          </PillCta>
          <PillCta href="/courses">Explore Courses</PillCta>
        </div>

        <ul className="mt-6 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm font-medium text-text">
          {reassurances.map((item) => (
            <li key={item} className="flex items-center gap-2">
              <span aria-hidden="true" className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500 text-[11px] font-bold text-white">
                ✓
              </span>
              {item}
            </li>
          ))}
        </ul>
      </Reveal>
    </Section>
  );
}
