import Link from "next/link";
import { isBuiltRoute } from "@/constants/navigation";
import { cn } from "@/lib/utils";

/**
 * "View Course →" style link. Renders a real Link for routes that
 * exist; falls back to an inert, identically-styled label for routes
 * not built yet, so the page never ships a broken link.
 */
export function ArrowLink({ href, tone = "primary", className, children, ...props }) {
  const built = isBuiltRoute(href);
  const toneClasses =
    tone === "light"
      ? built
        ? "text-white hover:text-white/80"
        : "text-white/60"
      : built
        ? "text-primary hover:text-primary-hover"
        : "text-muted";

  const classes = cn(
    "inline-flex items-center gap-1.5 text-sm font-medium transition-colors",
    toneClasses,
    !built && "cursor-default",
    className
  );

  const content = (
    <>
      {children}
      <span aria-hidden="true">→</span>
    </>
  );

  if (built) {
    return (
      <Link href={href} className={classes} {...props}>
        {content}
      </Link>
    );
  }

  return (
    <span className={classes} aria-disabled="true" title="Coming soon" {...props}>
      {content}
    </span>
  );
}
