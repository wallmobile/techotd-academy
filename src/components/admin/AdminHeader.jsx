"use client";

import { IconButton } from "@/components/ui/IconButton";
import { LogoutButton } from "@/components/auth/LogoutButton";
import { ROLE_LABELS } from "@/constants/roles";

function initials(name) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

/** Admin counterpart of TrainerHeader: menu button (mobile), title, signed-in identity + role. */
export function AdminHeader({ user, title, onOpenMobileNav }) {
  return (
    <header className="sticky top-0 z-30 flex h-16 flex-none items-center gap-3 border-b border-border bg-white/95 px-4 backdrop-blur sm:px-6 lg:px-8">
      <IconButton label="Open navigation" className="md:hidden" onClick={onOpenMobileNav}>
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
          <path d="M3 5.5H17M3 10H17M3 14.5H17" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
        </svg>
      </IconButton>

      <p className="flex-1 truncate text-base font-semibold text-dark sm:text-lg">{title}</p>

      <div className="hidden items-center gap-2.5 border-l border-border pl-3 sm:flex">
        <span
          aria-hidden="true"
          className="flex h-9 w-9 flex-none items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary"
        >
          {initials(user.name) || "A"}
        </span>
        <span className="flex flex-col leading-tight">
          <span className="max-w-[140px] truncate text-sm font-medium text-dark">{user.name}</span>
          <span className="text-xs text-muted">{ROLE_LABELS[user.role] || user.role}</span>
        </span>
      </div>

      <div className="hidden sm:block">
        <LogoutButton />
      </div>
    </header>
  );
}
