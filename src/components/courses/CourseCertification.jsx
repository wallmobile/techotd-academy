import { Container } from "@/components/layout/Container";
import { Reveal, RevealItem } from "@/components/shared/Reveal";
import { CertificatePreview } from "@/components/courses/CertificatePreview";
import { CheckIcon, Gradient } from "@/components/training/icons";
import { staggerContainer } from "@/lib/motion";

// Only things the sample certificate actually shows.
const certificateFacts = [
  "Awarded in your name for the program you complete",
  "Carries a unique certificate number and issue date",
  "Signed by the Director and the Training Head",
  "Includes a QR code printed on the certificate",
];

export function CourseCertification({ course }) {
  return (
    <section id="certificate" className="relative isolate scroll-mt-36 overflow-hidden bg-white py-12 sm:py-14 lg:py-20">
      <span aria-hidden="true" className="animate-drift pointer-events-none absolute -right-24 top-10 -z-10 h-96 w-96 rounded-full bg-secondary/10 blur-[100px]" />
      <Container>
        <div className="grid items-center gap-12 lg:grid-cols-[0.9fr_1.1fr] lg:gap-16">
          <Reveal>
            <p className="text-sm font-semibold uppercase tracking-wide text-primary">Certification</p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight text-dark sm:text-4xl">
              Certificate of <Gradient>Completion</Gradient>
            </h2>
            <p className="mt-4 text-base leading-relaxed text-muted">{course.certification}</p>

            <Reveal variants={staggerContainer} className="mt-6">
              <ul className="flex flex-col gap-3">
                {certificateFacts.map((fact) => (
                  <RevealItem key={fact} as="li" className="flex items-start gap-3 text-sm leading-relaxed text-text">
                    <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-linear-to-br from-primary to-secondary text-white">
                      <CheckIcon />
                    </span>
                    {fact}
                  </RevealItem>
                ))}
              </ul>
            </Reveal>

            <p className="mt-6 rounded-2xl bg-surface px-4 py-3 text-xs leading-relaxed text-muted">
              The certificate on the right is a sample for illustration. Eligibility and details may vary by program.
            </p>
          </Reveal>

          <Reveal delay={120}>
            <CertificatePreview />
          </Reveal>
        </div>
      </Container>
    </section>
  );
}
