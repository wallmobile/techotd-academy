import { Container } from "@/components/layout/Container";
import { Breadcrumbs } from "@/components/shared/Breadcrumbs";
import { CountUp } from "@/components/shared/CountUp";
import { ScrollProgress } from "@/components/shared/ScrollProgress";
import { DotGrid, GlowBackdrop } from "@/components/training/icons";
import { cn } from "@/lib/utils";

/**
 * Shared hero for the marketing pages (Trainers, Career, Resources, About).
 * `title` is [before, accent, after]; the accent part gets the brand gradient
 * and every word rises in with a small stagger. `aside` fills the right column
 * on large screens; `children` are the action buttons.
 */
export function PageHero({ crumbs, eyebrow, title, description, aside, stats, children }) {
  const [before = "", accent = "", after = ""] = title;
  const words = [
    ...before.split(" ").filter(Boolean).map((text) => ({ text })),
    ...accent.split(" ").filter(Boolean).map((text) => ({ text, accent: true })),
    ...after.split(" ").filter(Boolean).map((text) => ({ text })),
  ];

  return (
    <>
    <ScrollProgress />
    <section className="relative isolate overflow-hidden bg-surface">
      <GlowBackdrop />
      <DotGrid />
      <Container className="py-10 sm:py-14 lg:py-16">
        <Breadcrumbs items={crumbs} />

        <div className={cn("mt-8 grid items-center gap-12", aside && "lg:grid-cols-[1.1fr_0.9fr] lg:gap-16")}>
          <div>
            <p className="animate-fade-up-in inline-flex items-center gap-2 rounded-full border border-border bg-white px-3.5 py-1.5 text-xs font-semibold uppercase tracking-[0.2em] text-primary shadow-soft">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping-soft absolute inline-flex h-full w-full rounded-full bg-primary" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
              </span>
              {eyebrow}
            </p>

            <h1 className="mt-5 max-w-3xl text-4xl font-bold leading-[1.08] tracking-tight text-dark sm:text-5xl lg:text-6xl">
              {words.map((word, index) => (
                <span key={`${word.text}-${index}`}>
                  <span
                    className={cn(
                      "animate-word-rise",
                      word.accent && "bg-linear-to-r from-primary to-secondary bg-clip-text text-transparent"
                    )}
                    style={{ animationDelay: `${120 + index * 80}ms` }}
                  >
                    {word.text}
                  </span>{" "}
                </span>
              ))}
            </h1>

            <p className="animate-fade-up-in mt-5 max-w-2xl text-lg leading-relaxed text-muted" style={{ animationDelay: "260ms" }}>
              {description}
            </p>

            {children && (
              <div className="animate-fade-up-in mt-8 flex flex-wrap gap-3" style={{ animationDelay: "340ms" }}>
                {children}
              </div>
            )}

            {stats && stats.length > 0 && (
              <dl className="animate-fade-up-in mt-10 flex max-w-lg divide-x divide-border border-t border-border pt-6" style={{ animationDelay: "420ms" }}>
                {stats.map((stat, index) => (
                  <div key={stat.label} className={cn(index === 0 ? "pr-6" : "px-6")}>
                    <dd className="bg-linear-to-r from-primary to-secondary bg-clip-text text-3xl font-bold text-transparent">
                      <CountUp value={stat.value} />
                    </dd>
                    <dt className="mt-1 text-xs font-medium uppercase tracking-wider text-muted">{stat.label}</dt>
                  </div>
                ))}
              </dl>
            )}
          </div>

          {aside && (
            <div className="animate-fade-up-in relative mx-auto w-full max-w-md lg:max-w-none" style={{ animationDelay: "150ms" }}>
              {aside}
            </div>
          )}
        </div>
      </Container>
    </section>
    </>
  );
}
