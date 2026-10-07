import { Container } from "@/components/layout/Container";
import { Reveal, RevealItem } from "@/components/shared/Reveal";
import { Gradient } from "@/components/training/icons";
import { careerSupportItems } from "@/data/careerSupport";
import { staggerContainer } from "@/lib/motion";

export function CareerSupport() {
  return (
    <section className="bg-surface py-12 sm:py-14 lg:py-20">
      <Container>
        <div className="max-w-2xl">
          <p className="text-sm font-semibold uppercase tracking-wide text-primary">Career Support</p>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight text-dark sm:text-4xl">
            Support <Gradient>alongside</Gradient> this course
          </h2>
          <p className="mt-3 text-base text-muted">
            Practical support to help you present your skills with confidence.
          </p>
        </div>

        <Reveal variants={staggerContainer} className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {careerSupportItems.map((item) => (
            <RevealItem
              key={item.title}
              className="group relative flex items-center gap-4 overflow-hidden rounded-2xl border border-border bg-white p-5 shadow-soft transition-all duration-300 hover:-translate-y-1 hover:border-primary/30 hover:shadow-elevated"
            >
              <span aria-hidden="true" className="absolute inset-y-0 left-0 w-1 origin-top scale-y-0 bg-linear-to-b from-primary to-secondary transition-transform duration-300 group-hover:scale-y-100" />
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-sm font-bold text-primary transition-all duration-300 group-hover:bg-linear-to-br group-hover:from-primary group-hover:to-secondary group-hover:text-white group-hover:shadow-lg group-hover:shadow-primary/25">
                {item.code}
              </span>
              <h3 className="text-base font-semibold leading-snug text-dark">{item.title}</h3>
            </RevealItem>
          ))}
        </Reveal>
      </Container>
    </section>
  );
}
