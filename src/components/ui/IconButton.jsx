import { cn } from "@/lib/utils";

/**
 * Compact icon-only control (menu toggle, modal close, carousel arrows, …).
 * Always require an accessible label since there is no visible text.
 */
export function IconButton({ label, className, children, ...props }) {
  return (
    <button
      type="button"
      aria-label={label}
      className={cn(
        "inline-flex h-10 w-10 items-center justify-center rounded-sm text-text transition-colors duration-150",
        "hover:bg-surface focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary",
        "disabled:opacity-50 disabled:pointer-events-none",
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}
