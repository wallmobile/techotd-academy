"use client";

import Link from "next/link";
import { TrainerNavList } from "@/components/trainer/TrainerNavList";
import { LogoutButton } from "@/components/auth/LogoutButton";
import { IconButton } from "@/components/ui/IconButton";
import { logoutAction } from "@/lib/auth/actions";
import { cn } from "@/lib/utils";

/**
 * Trainer equivalent of src/components/student/StudentSidebar.jsx — same
 * persistent desktop/tablet sidebar with a collapsible compact mode.
 */
export function TrainerSidebar({ collapsed, onToggleCollapsed }) {
  return (
    <aside
      className={cn(
        "sticky top-0 hidden h-screen flex-none flex-col border-r border-border bg-white transition-[width] duration-200 md:flex",
        collapsed ? "w-20" : "w-64"
      )}
    >
      <div className="flex h-16 items-center gap-2 border-b border-border px-4">
        <Link href="/" className="flex items-center gap-2 overflow-hidden text-sm font-semibold tracking-tight text-dark">
          <span className="flex h-8 w-8 flex-none items-center justify-center rounded-sm bg-primary text-xs font-bold text-white">
            T
          </span>
          {!collapsed && <span className="truncate">TechOTD Academy</span>}
        </Link>
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-4">
        <TrainerNavList compact={collapsed} />
      </div>

      <div className="flex flex-col gap-2 border-t border-border p-3">
        <IconButton
          label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          aria-pressed={collapsed}
          onClick={onToggleCollapsed}
          className="mx-auto"
        >
          <svg width="18" height="18" viewBox="0 0 20 20" fill="none" aria-hidden="true">
            <path
              d={collapsed ? "M7 4l6 6-6 6" : "M13 4l-6 6 6 6"}
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </IconButton>
        {collapsed ? (
          <form action={logoutAction} className="flex justify-center">
            <IconButton label="Log out" type="submit">
              <svg width="18" height="18" viewBox="0 0 20 20" fill="none" aria-hidden="true">
                <path
                  d="M8 4H4v12h4M13 6l4 4-4 4M17 10H8"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </IconButton>
          </form>
        ) : (
          <LogoutButton />
        )}
      </div>
    </aside>
  );
}
