"use client";

import { IconButton } from "@/components/ui/IconButton";
import { LogoutButton } from "@/components/auth/LogoutButton";

function initials(name) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

/**
 * Trainer equivalent of src/components/student/StudentHeader.jsx. No
 * notification bell — the trainer nav has no notifications route this
 * phase (out of scope: trainer notifications were never asked for), so
 * nothing here points at a route that doesn't exist.
 */
export function TrainerHeader({ user, title, onOpenMobileNav }) {
  return (
    <header className="sticky top-0 z-30 flex h-16 flex-none items-center gap-3 border-b border-border bg-white/95 px-4 backdrop-blur sm:px-6 lg:px-8">
      <IconButton label="Open navigation" className="md:hidden" onClick={onOpenMobileNav}>
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
          <path d="M3 5.5H17M3 10H17M3 14.5H17" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
        </svg>
      </IconButton>

      <h1 className="flex-1 truncate text-base font-semibold text-dark sm:text-lg">{title}</h1>

      <div className="hidden items-center gap-2.5 border-l border-border pl-3 sm:flex">
        <span
          aria-hidden="true"
          className="flex h-9 w-9 flex-none items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary"
        >
          {initials(user.name) || "T"}
        </span>
        <span className="flex flex-col leading-tight">
          <span className="max-w-[140px] truncate text-sm font-medium text-dark">{user.name}</span>
          <span className="text-xs text-muted">Trainer</span>
        </span>
      </div>

      <div className="hidden sm:block">
        <LogoutButton />
      </div>
    </header>
  );
}
