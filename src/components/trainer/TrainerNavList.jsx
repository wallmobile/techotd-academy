"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { trainerNavItems } from "@/constants/trainerNav";
import { NavIcon } from "@/components/student/NavIcon";
import { cn } from "@/lib/utils";

/**
 * Trainer equivalent of src/components/student/StudentNavList.jsx — same
 * behavior (active-route highlighting, compact/icon-only mode, "Coming
 * soon" items rendered as non-interactive spans, never broken links),
 * wired to trainerNavItems instead. Kept as its own small file rather
 * than parametrizing the student component, so neither area's working
 * navigation is touched by the other's changes.
 */
export function TrainerNavList({ compact = false, onNavigate, className }) {
  const pathname = usePathname();

  return (
    <nav aria-label="Trainer dashboard" className={cn("flex flex-col gap-1", className)}>
      {trainerNavItems.map((item) => {
        const isActive =
          !item.comingSoon &&
          (pathname === item.href ||
            (item.href !== "/trainer" && pathname.startsWith(`${item.href}/`)));

        if (item.comingSoon) {
          return (
            <span
              key={item.key}
              title="Coming soon"
              aria-disabled="true"
              className={cn(
                "flex cursor-not-allowed items-center gap-3 rounded-sm px-3 py-2.5 text-sm font-medium text-muted/70",
                compact && "justify-center px-2"
              )}
            >
              <NavIcon name={item.icon} className="flex-none" />
              <span className={compact ? "sr-only" : "flex-1 truncate"}>{item.label}</span>
              {!compact && (
                <span className="rounded-full bg-surface px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted">
                  Soon
                </span>
              )}
            </span>
          );
        }

        return (
          <Link
            key={item.key}
            href={item.href}
            onClick={onNavigate}
            aria-current={isActive ? "page" : undefined}
            title={compact ? item.label : undefined}
            className={cn(
              "flex items-center gap-3 rounded-sm px-3 py-2.5 text-sm font-medium transition-colors",
              "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary",
              isActive ? "bg-primary/10 text-primary" : "text-text hover:bg-surface",
              compact && "justify-center px-2"
            )}
          >
            <NavIcon name={item.icon} className="flex-none" />
            <span className={compact ? "sr-only" : "flex-1 truncate"}>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
