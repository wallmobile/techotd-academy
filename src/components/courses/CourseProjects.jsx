import { Container } from "@/components/layout/Container";
import { Reveal, RevealItem } from "@/components/shared/Reveal";
import { Gradient } from "@/components/training/icons";
import { staggerContainer } from "@/lib/motion";

export function CourseProjects({ course }) {
  return (
    <section id="projects" className="scroll-mt-36 bg-white py-12 sm:py-14 lg:py-20">
      <Container>
        <div className="max-w-2xl">
          <p className="text-sm font-semibold uppercase tracking-wide text-primary">Projects</p>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight text-dark sm:text-4xl">
            Practical work in <Gradient>this course</Gradient>
          </h2>
        </div>

        <Reveal variants={staggerContainer} className={`mt-10 grid grid-cols-1 gap-5 md:grid-cols-2 ${course.projects.length >= 3 ? "lg:grid-cols-3" : ""}`}>
          {course.projects.map((project, index) => (
            <RevealItem
              key={project.title}
              className="group relative flex flex-col overflow-hidden rounded-3xl border border-border bg-white shadow-card transition-all duration-300 hover:-translate-y-1.5 hover:border-primary/30 hover:shadow-elevated"
            >
              {/* gradient banner */}
              <div className="relative flex h-28 items-end justify-between overflow-hidden bg-linear-to-br from-primary to-secondary p-5">
                <span aria-hidden="true" className="animate-drift pointer-events-none absolute -right-8 -top-10 h-36 w-36 rounded-full bg-white/10" />
                <span aria-hidden="true" className="pointer-events-none absolute -bottom-6 right-4 select-none text-7xl font-black leading-none text-white/15">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <span className="relative rounded-full bg-white px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-primary">
                  Example project
                </span>
                <span aria-hidden="true" className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-white/20 text-white backdrop-blur transition-transform duration-300 group-hover:-rotate-6 group-hover:scale-110">
                  <svg viewBox="0 0 20 20" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M7 6l-4 4 4 4M13 6l4 4-4 4" />
                  </svg>
                </span>
              </div>

              <div className="flex flex-1 flex-col p-6">
                <h3 className="text-xl font-semibold tracking-tight text-dark transition-colors group-hover:text-primary">
                  {project.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-muted">{project.problem}</p>

                <div className="mt-4 flex flex-wrap gap-1.5">
                  {project.tech.split(",").map((tech) => (
                    <span key={tech} className="rounded-full border border-border px-2.5 py-1 text-xs font-medium text-text">
                      {tech.trim()}
                    </span>
                  ))}
                </div>

                <div className="mt-auto pt-5">
                  <div className="flex items-start gap-3 rounded-2xl bg-surface p-4">
                    <span className="mt-0.5 text-primary" aria-hidden="true">
                      ➜
                    </span>
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-muted">Outcome</p>
                      <p className="mt-0.5 text-sm font-medium leading-snug text-dark">{project.outcome}</p>
                    </div>
                  </div>
                </div>
              </div>
            </RevealItem>
          ))}
        </Reveal>
      </Container>
    </section>
  );
}
