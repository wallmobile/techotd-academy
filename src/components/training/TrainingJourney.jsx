import { Section } from "@/components/shared/Section";
import { SectionHeading } from "@/components/shared/SectionHeading";
import { Reveal, RevealItem } from "@/components/shared/Reveal";
import { Gradient } from "@/components/training/icons";
import { staggerContainer } from "@/lib/motion";

export function TrainingJourney({ trainingMode }) {
  const steps = trainingMode.learningExperience;

  return (
    <Section>
      <SectionHeading
        eyebrow="Learning Experience"
        title={<>How the journey <Gradient>unfolds</Gradient></>}
        description="A clear, step-by-step path from first session to real, applied work."
        align="center"
        className="mx-auto"
      />

      <Reveal variants={staggerContainer} className="relative mt-14">
        {/* connector line + travelling dot (desktop) */}
        <div aria-hidden="true" className="absolute left-[10%] right-[10%] top-7 hidden h-0.5 lg:block">
          <div className="h-full w-full rounded-full bg-linear-to-r from-primary/30 via-secondary/40 to-primary/30" />
          <span className="animate-journey-travel absolute top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-secondary shadow-[0_0_0_6px_rgb(124_58_237/0.15)]" />
        </div>

        <ol className="relative grid gap-6 sm:grid-cols-2 lg:grid-cols-5 lg:gap-5">
          {steps.map((step) => (
            <RevealItem key={step.step} as="li" className="group relative flex flex-col">
              <div className="relative z-10 mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-linear-to-br from-primary to-secondary text-base font-bold text-white shadow-lg shadow-primary/25 ring-4 ring-white transition-transform duration-300 group-hover:-rotate-6 group-hover:scale-110">
                {step.step}
              </div>
              <div className="relative mt-4 flex-1 overflow-hidden rounded-3xl border border-border bg-white p-6 pb-8 text-center shadow-soft transition-all duration-300 group-hover:-translate-y-1 group-hover:border-primary/30 group-hover:shadow-elevated">
                <span aria-hidden="true" className="absolute inset-x-0 top-0 h-1 origin-left scale-x-0 bg-linear-to-r from-primary to-secondary transition-transform duration-500 group-hover:scale-x-100" />
                <span aria-hidden="true" className="pointer-events-none absolute -bottom-4 -right-1 select-none text-7xl font-black leading-none text-primary/5">{step.step}</span>
                <h3 className="relative text-lg font-semibold text-dark">{step.title}</h3>
                <p className="relative mt-2 text-sm leading-relaxed text-muted">{step.description}</p>
              </div>
            </RevealItem>
          ))}
        </ol>
      </Reveal>
    </Section>
  );
}
