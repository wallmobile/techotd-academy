import { cn } from "@/lib/utils";

/**
 * Base card surface reused by future CourseCard, TrainerCard, BatchCard,
 * testimonial and stat-card variants. Keep those as thin wrappers around
 * this component rather than redefining the surface each time.
 */
export function Card({ elevated = false, hoverable = false, className, children, ...props }) {
  return (
    <div
      className={cn(
        "rounded-md border border-border bg-card p-6",
        elevated ? "shadow-elevated" : "shadow-card",
        hoverable &&
          "transition-shadow duration-200 hover:shadow-elevated",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}
