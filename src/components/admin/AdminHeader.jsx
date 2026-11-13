"use client";

import Link from "next/link";
import { logoutAction } from "@/lib/auth/actions";
import { ROLE_LABELS } from "@/constants/roles";

function initials(name) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

const iconButton =
  "relative inline-flex h-10 w-10 flex-none items-center justify-center rounded-full bg-white text-muted ring-1 ring-border transition-colors hover:text-primary hover:ring-primary/30 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary";

/**
 * Admin counterpart of TrainerHeader: a floating glass bar with the menu
 * button (mobile), the section title, a link to the public site, the
 * notification bell and the signed-in identity.
 */
export function AdminHeader({ user, title, brand = "TechOTD Admin", unreadCount = 0, onOpenMobileNav }) {
  const area = `${brand.replace(/^TechOTD\s+/, "")} panel`;

  return (
    <header className="sticky top-3 z-30 mx-3 mt-3 flex h-16 flex-none items-center gap-2.5 rounded-[18px] border border-white bg-white/75 px-3 shadow-[0_1px_2px_rgb(15_23_42/0.04),0_12px_32px_-20px_rgb(37_99_235/0.35)] backdrop-blur-xl sm:mx-6 sm:px-4 lg:mx-8">
      <button type="button" aria-label="Open navigation" onClick={onOpenMobileNav} className={`${iconButton} md:hidden`}>
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
          <path d="M3 5.5H17M3 10H17M3 14.5H17" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
        </svg>
      </button>

      <div className="flex min-w-0 flex-1 flex-col leading-tight">
        <span className="hidden items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.16em] text-primary sm:flex">
          <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-linear-to-br from-primary to-secondary" />
          {area}
        </span>
        <p className="truncate text-base font-bold tracking-tight text-dark">{title}</p>
      </div>

      <Link
        href="/"
        className="hidden h-10 items-center gap-2 rounded-full border border-primary/25 bg-white px-4 text-sm font-semibold text-primary transition-colors hover:border-primary hover:bg-primary/5 lg:inline-flex"
      >
        <svg width="16" height="16" viewBox="0 0 20 20" fill="none" aria-hidden="true">
          <path d="M10 17a7 7 0 100-14 7 7 0 000 14zM3 10h14M10 3c1.8 1.9 2.7 4.2 2.7 7s-.9 5.1-2.7 7c-1.8-1.9-2.7-4.2-2.7-7S8.2 4.9 10 3z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
        </svg>
        View website
      </Link>

      <Link
        href="/admin/notifications"
        aria-label={unreadCount > 0 ? `Notifications (${unreadCount} unread)` : "Notifications"}
        className={iconButton}
      >
        <svg width="19" height="19" viewBox="0 0 20 20" fill="none" aria-hidden="true">
          <path d="M10 3a4 4 0 00-4 4v3l-1.5 3h11L14 10V7a4 4 0 00-4-4zM8.5 16a1.5 1.5 0 003 0" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        {unreadCount > 0 && (
          <span aria-hidden="true" className="absolute -right-0.5 -top-0.5 flex h-4.5 min-w-4.5 items-center justify-center rounded-full bg-linear-to-br from-danger to-pink-500 px-1 text-[10px] font-bold text-white ring-2 ring-white">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </Link>

      <div className="ml-1 hidden items-center gap-2.5 rounded-full bg-white py-1 pl-1 pr-3 ring-1 ring-border sm:flex">
        <span
          aria-hidden="true"
          className="flex h-8 w-8 flex-none items-center justify-center rounded-full bg-linear-to-br from-primary to-secondary text-xs font-bold text-white"
        >
          {initials(user.name) || "A"}
        </span>
        <span className="flex flex-col leading-tight">
          <span className="max-w-35 truncate text-sm font-semibold text-dark">{user.name}</span>
          <span className="text-[11px] text-muted">{ROLE_LABELS[user.role] || user.role}</span>
        </span>
      </div>

      <form action={logoutAction} className="hidden sm:block">
        <button type="submit" aria-label="Log out" title="Log out" className={`${iconButton} hover:text-danger hover:ring-danger/30`}>
          <svg width="17" height="17" viewBox="0 0 20 20" fill="none" aria-hidden="true">
            <path d="M8 4H4v12h4M13 6l4 4-4 4M17 10H8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </form>
    </header>
  );
}
