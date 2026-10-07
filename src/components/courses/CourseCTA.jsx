import Link from "next/link";
import { Container } from "@/components/layout/Container";
import { isBuiltRoute } from "@/constants/navigation";
import { cn } from "@/lib/utils";

const variants = {
  solid: "bg-white text-primary shadow-lg hover:-translate-y-0.5 hover:shadow-xl",
  glass: "border border-white/40 bg-white/10 text-white backdrop-blur hover:bg-white/20",
};

function CtaButton({ href, children, variant = "glass" }) {
  const classes = cn(
    "inline-flex h-12 items-center justify-center rounded-full px-6 text-sm font-semibold transition-all duration-200",
    variants[variant]
  );
  if (isBuiltRoute(href)) {
    return (
      <Link href={href} className={classes}>
        {children}
      </Link>
    );
  }
  return (
    <span className={cn(classes, "cursor-default opacity-60")} aria-disabled="true" title="Coming soon">
      {children}
    </span>
  );
}

export function CourseCTA({ course }) {
  const bookDemoHref = `/book-demo?course=${course.slug}&source=course-detail`;

  return (
    <section className="bg-white pb-16 pt-4 sm:pb-20">
      <Container>
        <div className="relative overflow-hidden rounded-4xl bg-linear-to-br from-primary via-primary to-secondary px-6 py-14 text-center text-white shadow-elevated sm:px-12 sm:py-16">
          <span aria-hidden="true" className="animate-drift pointer-events-none absolute -left-16 -top-20 h-72 w-72 rounded-full bg-white/10" />
          <span aria-hidden="true" className="animate-drift-slow pointer-events-none absolute -bottom-24 -right-10 h-72 w-72 rounded-full bg-white/10" />
          <span aria-hidden="true" className="animate-shine pointer-events-none absolute inset-y-0 left-0 w-1/5 bg-linear-to-r from-transparent via-white/20 to-transparent" />

          <div className="relative">
            <span className="animate-float mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-white/20 text-lg font-black tracking-tight ring-1 ring-white/30 backdrop-blur">
              {course.initials}
            </span>
            <p className="mt-5 text-xs font-semibold uppercase tracking-[0.2em] text-white/75">{course.title}</p>
            <h2 className="mx-auto mt-3 max-w-2xl text-3xl font-semibold tracking-tight sm:text-4xl">
              Ready to start learning?
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-base text-white/85">
              Talk to our team about the right learning path for you.
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              <CtaButton href={bookDemoHref} variant="solid">
                Book Free Counselling
              </CtaButton>
              <CtaButton href="/courses">Explore Other Courses</CtaButton>
              <CtaButton href="/batches">View Batches</CtaButton>
            </div>
          </div>
        </div>
      </Container>
    </section>
  );
}
