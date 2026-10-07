import { Container } from "@/components/layout/Container";
import { Reveal, RevealItem } from "@/components/shared/Reveal";
import { CheckIcon, Gradient } from "@/components/training/icons";
import { staggerContainer } from "@/lib/motion";

export function TrainingWhy({ trainingMode }) {
  return (
    <section className="bg-surface py-12 sm:py-14 lg:py-20">
      <Container>
        <div className="max-w-2xl">
          <p className="text-sm font-semibold uppercase tracking-wide text-primary">Why {trainingMode.shortTitle}</p>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight text-dark sm:text-4xl">
            Why choose <Gradient>{trainingMode.shortTitle.toLowerCase()}</Gradient> learning
          </h2>
        </div>

        <div className="mt-10 grid gap-5 lg:grid-cols-5">
          {/* Benefits */}
          <Reveal variants={staggerContainer} className="rounded-3xl border border-border bg-white p-6 shadow-card sm:p-8 lg:col-span-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted">Benefits</p>
            <ul className="mt-5 grid gap-4 sm:grid-cols-2">
              {trainingMode.benefits.map((benefit) => (
                <RevealItem
                  key={benefit}
                  as="li"
                  className="group flex items-start gap-3 rounded-2xl bg-surface p-4 text-sm leading-relaxed text-text transition-colors hover:bg-primary/5"
                >
                  <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-linear-to-br from-primary to-secondary text-white transition-transform duration-300 group-hover:scale-110">
                    <CheckIcon />
                  </span>
                  {benefit}
                </RevealItem>
              ))}
            </ul>
          </Reveal>

          {/* Audience */}
          <Reveal
            delay={120}
            className="relative overflow-hidden rounded-3xl bg-linear-to-br from-primary via-primary to-secondary p-6 text-white shadow-elevated sm:p-8 lg:col-span-2"
          >
            <span aria-hidden="true" className="animate-drift pointer-events-none absolute -right-14 -top-14 h-56 w-56 rounded-full bg-white/10" />
            <span aria-hidden="true" className="animate-drift-slow pointer-events-none absolute -bottom-20 -left-10 h-48 w-48 rounded-full bg-white/10" />
            <div className="relative">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/75">Who is it for?</p>
              <h3 className="mt-2 text-2xl font-semibold tracking-tight">Built for these learners</h3>
              <div className="mt-5 flex flex-wrap gap-2">
                {trainingMode.idealFor.map((audience) => (
                  <span
                    key={audience}
                    className="rounded-full border border-white/30 bg-white/15 px-3.5 py-1.5 text-sm font-medium backdrop-blur-sm transition-colors hover:bg-white/25"
                  >
                    {audience}
                  </span>
                ))}
              </div>
              <p className="mt-6 border-t border-white/20 pt-5 text-sm leading-relaxed text-white/85">
                {trainingMode.suitableFor}
              </p>
            </div>
          </Reveal>
        </div>
      </Container>
    </section>
  );
}
