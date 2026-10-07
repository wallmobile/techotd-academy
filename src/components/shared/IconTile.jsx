import { cn } from "@/lib/utils";

const toneClasses = {
  primary: "bg-primary/10 text-primary",
  secondary: "bg-secondary/10 text-secondary",
  dark: "bg-white/10 text-white",
};

/**
 * Small consistent icon/initial tile used across category, mode, and
 * feature cards instead of a mixed icon-library set.
 */
export function IconTile({ tone = "primary", className, children }) {
  return (
    <div
      className={cn(
        "flex h-11 w-11 shrink-0 items-center justify-center rounded-sm text-sm font-semibold",
        toneClasses[tone],
        className
      )}
      aria-hidden="true"
    >
      {children}
    </div>
  );
}
