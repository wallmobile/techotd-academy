import { cn } from "@/lib/utils";

/**
 * Minimal loading placeholder block. Decorative only (aria-hidden) — the
 * surrounding loading surface carries the accessible "Loading" status.
 * `motion-safe:` keeps the pulse off for users who prefer reduced motion.
 */
export function Skeleton({ className }) {
  return <div aria-hidden="true" className={cn("rounded-sm bg-border/70 motion-safe:animate-pulse", className)} />;
}
