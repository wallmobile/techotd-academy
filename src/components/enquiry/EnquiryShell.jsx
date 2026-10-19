import Link from "next/link";
import { Container } from "@/components/layout/Container";
import { Breadcrumbs } from "@/components/shared/Breadcrumbs";
import { EnquirySteps } from "@/components/enquiry/EnquirySteps";
import { getCourse, listBatches } from "@/lib/catalog";
import { cn } from "@/lib/utils";

const copy = {
  "book-demo": {
    crumb: "Book Demo",
    eyebrow: "Free counselling session",
    title: ["Book a free", "counselling", "session"],
    description:
      "Talk through course options, learning modes and batch availability with our team, and find a learning path that fits you. This is a conversation, not an enrollment commitment.",
    steps: [
      { title: "Share your details", text: "Tell us who you are and what you'd like to learn." },
      { title: "We get in touch", text: "A member of our team may reach out to discuss your options." },
      { title: "Choose your path", text: "No obligation to enroll — decide when you're ready." },
    ],
    showNextBatch: true,
  },
  enquiry: {
    crumb: "Enquiry",
    eyebrow: "Quick enquiry",
    title: ["Have a question?", "Send an", "enquiry"],
    description:
      "Tell us a little about what you're looking to learn, and our team will get back to you with relevant course and training information.",
    steps: [
      { title: "Tell us what you need", text: "Courses, batches or learning modes — ask anything." },
      { title: "We follow up", text: "Our team replies with relevant course and training information." },
      { title: "Pick what fits", text: "Take your time — there's no pressure to enroll." },
    ],
    showNextBatch: false,
  },
};

const trustChips = ["Free to submit", "No obligation", "Private & secure"];

function CheckIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 16 16" width="11" height="11" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3.5 8.5l3 3 6-7" />
    </svg>
  );
}

/**
 * Shared page shell for /book-demo and /enquiry: a sticky "how it works"
 * column on the left and the form (children) in a floating booking card on
 * the right. The form itself stays in EnquiryForm.
 */
export function EnquiryShell({ variant, children }) {
  const content = copy[variant];
  const [before, accent, after] = content.title;
  const words = [
    ...before.split(" ").map((text) => ({ text })),
    ...accent.split(" ").map((text) => ({ text, accent: true })),
    ...after.split(" ").map((text) => ({ text })),
  ];
  const nextBatch = content.showNextBatch ? listBatches({ publicOnly: true })[0] ?? null : null;
  const nextCourse = nextBatch ? getCourse(nextBatch.courseSlug) : null;

  return (
    <section className="relative isolate overflow-hidden bg-surface">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10">
        <div className="animate-drift absolute -left-24 -top-24 h-96 w-96 rounded-full bg-primary/15 blur-[100px]" />
        <div className="animate-drift-slow absolute -right-20 top-40 h-96 w-96 rounded-full bg-secondary/15 blur-[100px]" />
        <div
          className="absolute inset-0 opacity-[0.3]"
          style={{
            backgroundImage: "radial-gradient(rgb(37 99 235 / 0.3) 1px, transparent 1px)",
            backgroundSize: "24px 24px",
            maskImage: "radial-gradient(ellipse 70% 60% at 30% 30%, black, transparent)",
            WebkitMaskImage: "radial-gradient(ellipse 70% 60% at 30% 30%, black, transparent)",
          }}
        />
      </div>

      <Container className="py-10 sm:py-14">
        <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: content.crumb }]} />

        <div className="mt-8 grid items-start gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:gap-14">
          {/* Left: story */}
          <div className="animate-fade-up-in lg:sticky lg:top-24">
            <p className="inline-flex items-center gap-2 rounded-full border border-border bg-white px-3.5 py-1.5 text-xs font-semibold uppercase tracking-[0.2em] text-primary shadow-soft">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping-soft absolute inline-flex h-full w-full rounded-full bg-primary" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
              </span>
              {content.eyebrow}
            </p>

            <h1 className="mt-5 text-4xl font-bold leading-[1.1] tracking-tight text-dark sm:text-5xl">
              {words.map((word, index) => (
                <span key={`${word.text}-${index}`}>
                  <span
                    className={cn(
                      "animate-word-rise",
                      word.accent && "bg-linear-to-r from-primary to-secondary bg-clip-text text-transparent"
                    )}
                    style={{ animationDelay: `${120 + index * 90}ms` }}
                  >
                    {word.text}
                  </span>{" "}
                </span>
              ))}
            </h1>
            <p className="mt-4 max-w-lg text-base leading-relaxed text-muted">{content.description}</p>

            <div className="mt-5 flex flex-wrap gap-2">
              {trustChips.map((chip) => (
                <span key={chip} className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-xs font-medium text-dark shadow-soft ring-1 ring-border">
                  <span className="flex h-4 w-4 items-center justify-center rounded-full bg-success text-white">
                    <CheckIcon />
                  </span>
                  {chip}
                </span>
              ))}
            </div>

            <EnquirySteps steps={content.steps} />

            {nextCourse && (
              <Link
                href="/batches"
                className="group mt-9 flex max-w-lg items-center gap-4 rounded-2xl border border-border bg-white p-3.5 shadow-card transition-all duration-300 hover:-translate-y-1 hover:border-primary/30 hover:shadow-elevated"
              >
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-linear-to-br from-primary to-secondary text-sm font-black text-white shadow-md shadow-primary/25">
                  {nextCourse.initials}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-muted">Next batch starts</p>
                  <p className="truncate text-sm font-semibold text-dark">{nextCourse.title}</p>
                  <p className="text-xs text-muted">
                    {nextBatch.startDate} · {nextBatch.schedule}
                  </p>
                </div>
                <span aria-hidden="true" className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary transition-all duration-300 group-hover:translate-x-1 group-hover:bg-primary group-hover:text-white">
                  →
                </span>
              </Link>
            )}

            <p className="mt-6 text-sm text-muted">
              Prefer to explore first?{" "}
              <Link href="/courses" className="font-semibold text-primary hover:underline">
                Browse courses
              </Link>{" "}
              or{" "}
              <Link href="/batches" className="font-semibold text-primary hover:underline">
                view batches
              </Link>
              .
            </p>
          </div>

          {/* Right: booking card */}
          <div className="animate-fade-up-in relative" style={{ animationDelay: "120ms" }}>
            <span aria-hidden="true" className="pointer-events-none absolute inset-x-6 bottom-0 top-8 -z-10 rounded-[2rem] bg-linear-to-r from-primary/25 via-secondary/25 to-primary/25 blur-2xl" />

            {/* decorative orbit ring */}
            <span aria-hidden="true" className="animate-orbit pointer-events-none absolute -left-12 -top-12 hidden h-32 w-32 rounded-full border border-dashed border-primary/30 lg:block">
              <span className="absolute -top-1 left-1/2 h-2.5 w-2.5 rounded-full bg-secondary shadow-[0_0_0_4px_rgb(124_58_237/0.15)]" />
            </span>

            {/* floating accents */}
            <div aria-hidden="true" className="animate-float absolute -right-4 -top-5 z-10 hidden h-12 w-12 items-center justify-center rounded-2xl bg-white text-primary shadow-elevated ring-1 ring-border sm:flex">
              <svg viewBox="0 0 20 20" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="4.5" width="14" height="12" rx="2" />
                <path d="M3 8.5h14M7 3v3M13 3v3" />
              </svg>
              <span className="absolute -right-0.5 -top-0.5 flex h-3 w-3">
                <span className="animate-ping-soft absolute inline-flex h-full w-full rounded-full bg-success" />
                <span className="relative inline-flex h-3 w-3 rounded-full bg-success ring-2 ring-white" />
              </span>
            </div>
            <div aria-hidden="true" className="animate-float absolute -left-5 bottom-28 z-10 hidden h-11 w-11 items-center justify-center rounded-2xl bg-linear-to-br from-primary to-secondary text-white shadow-lg shadow-primary/30 lg:flex" style={{ animationDelay: "-2.5s" }}>
              <svg viewBox="0 0 20 20" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 5h12v8H9l-3 3v-3H4z" />
              </svg>
            </div>
            <div aria-hidden="true" className="animate-float absolute -bottom-4 right-10 z-10 hidden items-center gap-1.5 rounded-full bg-dark px-3.5 py-1.5 text-xs font-semibold text-white shadow-elevated sm:flex" style={{ animationDelay: "-4.5s" }}>
              <span className="text-secondary">✦</span> 100% free session
            </div>
            <div className="relative overflow-hidden rounded-3xl bg-white shadow-elevated ring-1 ring-border">
              <span aria-hidden="true" className="block h-1 bg-linear-to-r from-primary via-secondary to-primary" />
              <div className="p-6 sm:p-8">{children}</div>
            </div>
          </div>
        </div>
      </Container>
    </section>
  );
}
