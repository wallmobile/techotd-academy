import { Container } from "@/components/layout/Container";
import { Button } from "@/components/ui/Button";
import { Breadcrumbs } from "@/components/shared/Breadcrumbs";
import { CheckIcon, DotGrid, GlowBackdrop } from "@/components/training/icons";
import { isBuiltRoute } from "@/constants/navigation";

function CtaButton({ href, children, variant }) {
  if (isBuiltRoute(href)) {
    return (
      <Button href={href} variant={variant} size="lg">
        {children}
      </Button>
    );
  }
  return (
    <Button variant={variant} size="lg" disabled title="Coming soon">
      {children}
    </Button>
  );
}

function HeroTitle({ trainingMode }) {
  const { title, shortTitle } = trainingMode;
  if (!title.startsWith(shortTitle)) return title;
  return (
    <>
      <span className="bg-linear-to-r from-primary to-secondary bg-clip-text text-transparent">{shortTitle}</span>
      {title.slice(shortTitle.length)}
    </>
  );
}

export function TrainingHero({ trainingMode }) {
  const stats = [
    { value: trainingMode.features.length, label: "Core features" },
    { value: trainingMode.learningExperience.length, label: "Step journey" },
    { value: trainingMode.relatedCourses.length, label: "Courses" },
  ];

  return (
    <section className="relative isolate overflow-hidden bg-surface">
      <GlowBackdrop />
      <DotGrid />
      <Container className="py-10 sm:py-14 lg:py-16">
        <Breadcrumbs
          items={[
            { label: "Home", href: "/" },
            { label: "Training" },
            { label: trainingMode.title },
          ]}
        />

        <div className="mt-8 grid items-center gap-12 lg:grid-cols-[1.1fr_0.9fr] lg:gap-16">
          <div className="animate-fade-up-in">
            <p className="inline-flex items-center gap-2 rounded-full border border-border bg-white px-3.5 py-1.5 text-xs font-semibold uppercase tracking-[0.2em] text-primary shadow-soft">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping-soft absolute inline-flex h-full w-full rounded-full bg-primary" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
              </span>
              {trainingMode.shortTitle} learning
            </p>

            <h1 className="mt-5 text-5xl font-bold leading-[1.05] tracking-tight text-dark sm:text-6xl">
              <HeroTitle trainingMode={trainingMode} />
            </h1>
            <p className="mt-5 max-w-xl text-lg font-medium text-text">{trainingMode.shortDescription}</p>
            <p className="mt-3 max-w-xl text-base leading-relaxed text-muted">{trainingMode.description}</p>

            <div className="mt-8 flex flex-wrap gap-3">
              <CtaButton href="/courses">Explore Courses</CtaButton>
              <CtaButton href={`/book-demo?mode=${trainingMode.slug}&source=training`} variant="outline">
                Talk to a Counsellor
              </CtaButton>
            </div>

            <dl className="mt-10 flex max-w-md divide-x divide-border border-t border-border pt-6">
              {stats.map((stat, index) => (
                <div key={stat.label} className={index === 0 ? "pr-6" : "px-6"}>
                  <dd className="bg-linear-to-r from-primary to-secondary bg-clip-text text-3xl font-bold text-transparent">
                    {stat.value}
                  </dd>
                  <dt className="mt-1 text-xs font-medium uppercase tracking-wider text-muted">{stat.label}</dt>
                </div>
              ))}
            </dl>
          </div>

          {/* Mode panel */}
          <div className="animate-fade-up-in relative mx-auto w-full max-w-md lg:max-w-none" style={{ animationDelay: "120ms" }}>
            <span
              aria-hidden="true"
              className="absolute inset-0 translate-x-4 translate-y-4 rotate-3 rounded-3xl bg-linear-to-br from-primary/25 to-secondary/25"
            />
            <div
              aria-hidden="true"
              className="animate-float absolute -bottom-5 -left-5 z-10 hidden items-center gap-2 rounded-2xl border border-border bg-white px-4 py-2.5 text-xs font-semibold text-dark shadow-elevated sm:flex"
              style={{ animationDelay: "-2s" }}
            >
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-primary">◉</span>
              {trainingMode.mode} mode
            </div>
            <div
              aria-hidden="true"
              className="animate-float absolute -bottom-5 right-6 z-10 hidden items-center gap-2 rounded-2xl bg-dark px-4 py-2.5 text-xs font-semibold text-white shadow-elevated sm:flex"
              style={{ animationDelay: "-4s" }}
            >
              <span className="text-secondary">★</span>
              {trainingMode.relatedCourses.length} courses available
            </div>
            <div className="animate-float relative rounded-3xl border border-border bg-white p-6 shadow-elevated sm:p-8">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-4">
                  <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-linear-to-br from-primary to-secondary text-base font-black text-white shadow-lg shadow-primary/25">
                    {trainingMode.icon}
                  </span>
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted">Mode</p>
                    <p className="text-lg font-semibold text-dark">{trainingMode.shortTitle} Training</p>
                  </div>
                </div>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-success/10 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-success">
                  <span className="h-1.5 w-1.5 rounded-full bg-success" />
                  Open
                </span>
              </div>

              <p className="mt-6 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted">What&apos;s included</p>
              <ul className="mt-3 space-y-2.5">
                {trainingMode.features.map((feature, index) => (
                  <li
                    key={feature}
                    className="animate-fade-up-in flex items-center gap-3 rounded-2xl bg-surface px-4 py-3 text-sm font-medium text-dark"
                    style={{ animationDelay: `${300 + index * 90}ms` }}
                  >
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-linear-to-br from-primary to-secondary text-white">
                      <CheckIcon />
                    </span>
                    {feature}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </Container>
    </section>
  );
}
