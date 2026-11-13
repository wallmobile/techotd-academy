"use client";

import { Fragment } from "react";
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
 * routes themselves enforce access server-side. `items` defaults to the
 * Admin nav; the Super Admin console passes its own list (`exact` items match
 * only their own href, so the console home isn't "active" on every sub-page).
 * Items carrying a `group` are listed under that section heading (hidden in
 * compact mode). The active item uses the site's blue-to-violet CTA gradient.
 */
export function AdminNavList({ role, items: navItems = adminNavItems, compact = false, onNavigate, className }) {
  const pathname = usePathname();
  const items = navItems.filter((item) => !item.roles || item.roles.includes(role));

  return (
    <nav aria-label="Admin navigation" className={cn("flex flex-col gap-0.5", className)}>
      {items.map((item, index) => {
        const heading = item.group && item.group !== items[index - 1]?.group && (
          <p
            aria-hidden={compact || undefined}
            className={cn(
              "px-3 pb-1 text-[10px] font-bold uppercase tracking-[0.16em] text-muted/70",
              index > 0 && "mt-3",
              compact && "sr-only"
            )}
          >
            {item.group}
          </p>
        );

        if (item.comingSoon) {
          return (
            <Fragment key={item.key}>
              {heading}
              <span
                title="Coming soon"
                aria-disabled="true"
                className={cn(
                  "flex cursor-not-allowed items-center gap-3 rounded-xl px-3 py-1.5 text-[13.5px] font-medium text-muted/50",
                  compact && "justify-center px-2"
                )}
              >
                <NavIcon name={item.icon} className="flex-none" />
                <span className={compact ? "sr-only" : "flex-1 truncate"}>{item.label}</span>
                {!compact && (
                  <span className="rounded-full bg-surface px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted ring-1 ring-border">
                    Soon
                  </span>
                )}
              </span>
            </Fragment>
          );
        }

        const isActive =
          pathname === item.href || (item.href !== "/admin" && !item.exact && pathname.startsWith(`${item.href}/`));

        return (
          <Fragment key={item.key}>
            {heading}
            <Link
              href={item.href}
              onClick={onNavigate}
              aria-current={isActive ? "page" : undefined}
              title={compact ? item.label : undefined}
              className={cn(
                "group relative flex items-center gap-3 rounded-xl px-3 py-1.5 text-[13.5px] font-medium transition-all",
                "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary",
                isActive
                  ? "bg-linear-to-r from-primary to-secondary text-white shadow-[0_10px_22px_-10px_rgb(37_99_235/0.85)]"
                  : "text-text/75 hover:bg-primary/[0.06] hover:text-primary",
                compact && "justify-center px-2"
              )}
            >
              <NavIcon name={item.icon} className={cn("flex-none", isActive ? "text-white" : "text-muted group-hover:text-primary")} />
              <span className={compact ? "sr-only" : "flex-1 truncate"}>{item.label}</span>
            </Link>
          </Fragment>
        );
      })}
    </nav>
  );
}
