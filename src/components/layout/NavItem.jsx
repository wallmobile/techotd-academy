import Link from "next/link";
import { BUILT_ROUTES } from "@/constants/navigation";
import { cn } from "@/lib/utils";

/**
 * Renders a real, navigable Link for routes that exist yet; anything
 * pointing at a page not built in this phase renders as an inert,
 * visually-identical label instead of a broken link.
 */
export function NavItem({ href, className, children, ...props }) {
  if (BUILT_ROUTES.has(href)) {
    return (
      <Link href={href} className={className} {...props}>
        {children}
      </Link>
    );
  }

  return (
    <span
      className={cn(className, "cursor-default opacity-70")}
      aria-disabled="true"
      title="Coming soon"
      {...props}
    >
      {children}
    </span>
  );
}
