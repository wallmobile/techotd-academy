import Link from "next/link";
import { Container } from "@/components/layout/Container";
import { isBuiltRoute } from "@/constants/navigation";
import { cn } from "@/lib/utils";

const variants = {
  solid: "bg-white text-primary shadow-lg hover:-translate-y-0.5 hover:shadow-xl",
  glass: "border border-white/40 bg-white/10 text-white backdrop-blur hover:bg-white/20",
};

function CtaLink({ href, children, variant = "glass" }) {
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

/** Closing gradient call-to-action panel shared by the marketing pages. */
export function CtaBand({ eyebrow, title, description, primary, secondary, tertiary }) {
  return (
    <section className="bg-white pb-16 pt-4 sm:pb-20">
      <Container>
        <div className="relative overflow-hidden rounded-4xl bg-linear-to-br from-primary via-primary to-secondary px-6 py-14 text-center text-white shadow-elevated sm:px-12 sm:py-16">
          <span aria-hidden="true" className="animate-drift pointer-events-none absolute -left-16 -top-20 h-72 w-72 rounded-full bg-white/10" />
          <span aria-hidden="true" className="animate-drift-slow pointer-events-none absolute -bottom-24 -right-10 h-72 w-72 rounded-full bg-white/10" />
          <span aria-hidden="true" className="animate-shine pointer-events-none absolute inset-y-0 left-0 w-1/5 bg-linear-to-r from-transparent via-white/20 to-transparent" />
          <div className="relative">
            {eyebrow && <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/75">{eyebrow}</p>}
            <h2 className="mx-auto mt-3 max-w-2xl text-3xl font-semibold tracking-tight sm:text-4xl">{title}</h2>
            {description && <p className="mx-auto mt-4 max-w-xl text-base text-white/85">{description}</p>}
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              {primary && (
                <CtaLink href={primary.href} variant="solid">
                  {primary.label}
                </CtaLink>
              )}
              {secondary && <CtaLink href={secondary.href}>{secondary.label}</CtaLink>}
              {tertiary && <CtaLink href={tertiary.href}>{tertiary.label}</CtaLink>}
            </div>
          </div>
        </div>
      </Container>
    </section>
  );
}
