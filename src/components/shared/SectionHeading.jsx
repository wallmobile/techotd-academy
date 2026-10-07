import { cn } from "@/lib/utils";

const alignClasses = {
  left: "items-start text-left",
  center: "items-center text-center",
};

/**
 * Reusable eyebrow + title + description block used to open a section,
 * with an optional trailing action (e.g. "View all courses").
 */
export function SectionHeading({
  eyebrow,
  title,
  description,
  align = "left",
  action,
  className,
}) {
  return (
    <div
      className={cn(
        "flex flex-col gap-4",
        alignClasses[align],
        action && "sm:flex-row sm:items-end sm:justify-between sm:gap-8",
        className
      )}
    >
      <div className={cn("flex flex-col gap-3", alignClasses[align])}>
        {eyebrow && (
          <p className="text-sm font-semibold uppercase tracking-wide text-primary">
            {eyebrow}
          </p>
        )}
        {title && (
          <h2 className="max-w-2xl text-3xl font-semibold tracking-tight text-dark sm:text-4xl">
            {title}
          </h2>
        )}
        {description && (
          <p className="max-w-2xl text-base leading-relaxed text-muted sm:text-lg">{description}</p>
        )}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}
