"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { adminNavItems } from "@/constants/adminNav";
import { NavIcon } from "@/components/student/NavIcon";
import { cn } from "@/lib/utils";

/**
 * Admin equivalent of TrainerNavList: active-route highlighting,
 * compact/icon-only mode, and "Soon" items rendered as non-interactive
 * spans (never links). `role` hides items the signed-in staff role
 * can't use (e.g. counsellors only get Dashboard + Leads) — presentation only; the
 * routes themselves enforce access server-side.
 */
export function AdminNavList({ role, compact = false, onNavigate, className }) {
  const pathname = usePathname();
  const items = adminNavItems.filter((item) => !item.roles || item.roles.includes(role));

  return (
    <nav aria-label="Admin navigation" className={cn("flex flex-col gap-1", className)}>
      {items.map((item) => {
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

        const isActive =
          pathname === item.href || (item.href !== "/admin" && pathname.startsWith(`${item.href}/`));

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
