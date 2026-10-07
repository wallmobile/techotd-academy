import { Container } from "@/components/layout/Container";
import { Reveal, RevealItem } from "@/components/shared/Reveal";
import { CheckIcon, Gradient } from "@/components/training/icons";
import { staggerContainer } from "@/lib/motion";

export function LearningOutcomes({ course }) {
  return (
    <section id="outcomes" className="scroll-mt-36 bg-white py-12 sm:py-14 lg:py-20">
      <Container>
        <div className="max-w-2xl">
          <p className="text-sm font-semibold uppercase tracking-wide text-primary">Learning Outcomes</p>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight text-dark sm:text-4xl">
            Skills you&apos;ll <Gradient>practice</Gradient>
          </h2>
          <p className="mt-3 text-base text-muted">Course examples, not institutional guarantees.</p>
        </div>

        <Reveal variants={staggerContainer} className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {course.outcomes.map((outcome) => (
            <RevealItem
              key={outcome}
              className="group relative flex items-center gap-4 overflow-hidden rounded-2xl border border-border bg-white p-5 shadow-soft transition-all duration-300 hover:-translate-y-1 hover:border-primary/30 hover:shadow-elevated"
            >
              <span aria-hidden="true" className="absolute inset-y-0 left-0 w-1 origin-top scale-y-0 bg-linear-to-b from-primary to-secondary transition-transform duration-300 group-hover:scale-y-100" />
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary transition-all duration-300 group-hover:bg-linear-to-br group-hover:from-primary group-hover:to-secondary group-hover:text-white group-hover:shadow-lg group-hover:shadow-primary/25">
                <CheckIcon className="h-4 w-4" />
              </span>
              <span className="text-sm font-semibold leading-snug text-dark">{outcome}</span>
            </RevealItem>
          ))}
        </Reveal>
      </Container>
    </section>
  );
}
