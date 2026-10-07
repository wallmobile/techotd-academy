import { Container } from "@/components/layout/Container";
import { Reveal, RevealItem } from "@/components/shared/Reveal";
import { Gradient } from "@/components/training/icons";
import { describeTech } from "@/data/techInfo";
import { staggerContainer } from "@/lib/motion";

// "REST APIs" -> "RA", "Node.js" -> "NJ", "React" -> "RE"
function monogram(name) {
  const words = name.split(/[\s.]+/).filter(Boolean);
  const letters =
    words.length > 1 ? words[0][0] + words[1][0] : name.replace(/[^A-Za-z0-9]/g, "").slice(0, 2);
  return letters.toUpperCase();
}

export function TechnologyStack({ course }) {
  return (
    <section id="tech" className="scroll-mt-36 bg-surface py-12 sm:py-14 lg:py-20">
      <Container>
        <div className="max-w-2xl">
          <p className="text-sm font-semibold uppercase tracking-wide text-primary">Tech Stack</p>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight text-dark sm:text-4xl">
            Technologies you&apos;ll <Gradient>use</Gradient>
          </h2>
          <p className="mt-3 text-base text-muted">
            New to these names? Here&apos;s what each one is and why it&apos;s in the course.
          </p>
        </div>

        <Reveal variants={staggerContainer} className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {course.technologies.map((tech) => (
            <RevealItem
              key={tech}
              className="group flex gap-4 rounded-2xl border border-border bg-white p-4 shadow-soft transition-all duration-300 hover:-translate-y-1 hover:border-primary/30 hover:shadow-elevated"
            >
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-linear-to-br from-primary/15 to-secondary/15 text-xs font-bold uppercase text-primary transition-all duration-300 group-hover:from-primary group-hover:to-secondary group-hover:text-white group-hover:shadow-lg group-hover:shadow-primary/25">
                {monogram(tech)}
              </span>
              <div className="min-w-0">
                <h3 className="text-sm font-semibold text-dark">{tech}</h3>
                {describeTech(tech) && (
                  <p className="mt-1 text-[13px] leading-relaxed text-muted">{describeTech(tech)}</p>
                )}
              </div>
            </RevealItem>
          ))}
        </Reveal>
      </Container>
    </section>
  );
}
