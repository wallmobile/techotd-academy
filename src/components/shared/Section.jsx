import { Container } from "@/components/layout/Container";
import { cn } from "@/lib/utils";

const toneClasses = {
  default: "bg-white",
  surface: "bg-surface",
  dark: "bg-dark text-white",
  transparent: "",
};

/**
 * Standard vertical rhythm + background wrapper for a homepage/landing
 * section. Keeps section-to-section spacing consistent instead of each
 * section picking its own py-* values.
 */
export function Section({ tone = "default", className, containerClassName, children, ...props }) {
  return (
    <section
      className={cn("py-12 sm:py-14 lg:py-20", toneClasses[tone], className)}
      {...props}
    >
      <Container className={containerClassName}>{children}</Container>
    </section>
  );
}
