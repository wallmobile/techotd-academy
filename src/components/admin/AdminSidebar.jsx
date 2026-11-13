"use client";

import Image from "next/image";
import Link from "next/link";
import { AdminNavList } from "@/components/admin/AdminNavList";
import { logoutAction } from "@/lib/auth/actions";
import { ROLE_LABELS } from "@/constants/roles";
import { cn } from "@/lib/utils";

function initials(name = "") {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

/**
 * The site's own logo (same file as the public header), optionally with a
 * pill naming the area (the drawer shows it; on wider screens the header
 * does). Compact mode crops the wide logo to its graduation-cap mark.
 */
export function AdminBrand({ brand, compact = false, showArea = false }) {
  const area = brand.replace(/^TechOTD\s+/, "");
  return (
    <div className={cn("flex flex-col gap-2", compact && "items-center")}>
      <Link
        href="/"
        aria-label="TechOTD Academy — public site"
        className={cn("inline-flex rounded-sm focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary", compact && "h-10 w-10 overflow-hidden")}
      >
        <Image
          src="/techotd-logo-v3.png"
          alt="TechOTD Academy"
          width={1723}
          height={555}
          priority
          className={cn("w-auto", compact ? "h-10 max-w-none" : "h-11")}
        />
      </Link>
      {showArea && !compact && (
        <span className="inline-flex w-fit items-center gap-1.5 rounded-full border border-primary/20 bg-primary/5 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.14em] text-primary">
          <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-linear-to-br from-primary to-secondary" />
          {area} panel
        </span>
      )}
    </div>
  );
}

/** Log out control for the sidebar/drawer (a POST form, like LogoutButton). */
export function AdminLogout({ compact = false }) {
  return (
    <form action={logoutAction}>
      <button
        type="submit"
        aria-label={compact ? "Log out" : undefined}
        title={compact ? "Log out" : undefined}
        className={cn(
          "flex h-9 w-full items-center gap-2.5 rounded-xl px-3 text-[13.5px] font-medium text-muted transition-colors hover:bg-danger/[0.06] hover:text-danger",
          "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary",
          compact && "justify-center px-0"
        )}
      >
        <svg width="18" height="18" viewBox="0 0 20 20" fill="none" aria-hidden="true" className="flex-none">
          <path d="M8 4H4v12h4M13 6l4 4-4 4M17 10H8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        {!compact && "Log out"}
      </button>
    </form>
  );
}

/** Signed-in identity row at the foot of the mobile drawer (the header shows it on wider screens). */
export function AdminIdentity({ user }) {
  return (
    <div className="flex items-center gap-3 rounded-xl bg-surface p-2.5 ring-1 ring-border">
      <span
        aria-hidden="true"
        className="flex h-9 w-9 flex-none items-center justify-center rounded-full bg-linear-to-br from-primary to-secondary text-xs font-bold text-white"
      >
        {initials(user.name) || "A"}
      </span>
      <span className="flex min-w-0 flex-col leading-tight">
        <span className="truncate text-sm font-semibold text-dark">{user.name}</span>
        <span className="truncate text-[11px] text-muted">{ROLE_LABELS[user.role] || user.role}</span>
      </span>
    </div>
  );
}

/** Admin counterpart of TrainerSidebar: a floating white panel (desktop/tablet) with a compact mode. */
export function AdminSidebar({ role, navItems, brand = "TechOTD Admin", collapsed, onToggleCollapsed }) {
  return (
    <aside className={cn("sticky top-0 z-20 hidden h-screen flex-none p-3 pr-0 transition-[width] duration-200 md:block", collapsed ? "w-[5.75rem]" : "w-[17.5rem]")}>
      <div className="flex h-full flex-col overflow-hidden rounded-[22px] border border-white bg-white/90 shadow-[0_1px_2px_rgb(15_23_42/0.04),0_20px_40px_-24px_rgb(37_99_235/0.35)] backdrop-blur-xl">
        <div className={cn("flex h-[4.5rem] flex-none items-center border-b border-border/70", collapsed ? "justify-center px-3" : "px-5")}>
          <AdminBrand brand={brand} compact={collapsed} />
        </div>

        <div className="admin-sidebar-scroll flex-1 overflow-y-auto px-3 pb-6 pt-4 [mask-image:linear-gradient(to_bottom,black_calc(100%-2.5rem),transparent)]">
          <AdminNavList role={role} items={navItems} compact={collapsed} />
        </div>

        <div className={cn("flex flex-none items-center gap-1 border-t border-border/70 p-3", collapsed && "flex-col")}>
          <div className={cn("min-w-0", !collapsed && "flex-1")}>
            <AdminLogout compact={collapsed} />
          </div>
          <button
            type="button"
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            aria-pressed={collapsed}
            onClick={onToggleCollapsed}
            className="inline-flex h-9 w-9 flex-none items-center justify-center rounded-xl text-muted ring-1 ring-border transition-colors hover:bg-primary/[0.06] hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          >
            <svg width="16" height="16" viewBox="0 0 20 20" fill="none" aria-hidden="true">
              <path d={collapsed ? "M7 4l6 6-6 6" : "M13 4l-6 6 6 6"} stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>
      </div>
    </aside>
  );
}
