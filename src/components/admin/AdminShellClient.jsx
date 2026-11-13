"use client";

import { useState } from "react";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { AdminMobileDrawer } from "@/components/admin/AdminMobileDrawer";
import { AdminHeader } from "@/components/admin/AdminHeader";

/**
 * Admin shell: sidebar (desktop/tablet) + drawer (mobile) + header +
 * content. Mirrors TrainerShell: this client component owns only the small
 * interactive state; all data fetching stays in the Server Component pages
 * rendered as `children`. The page <h1> lives in AdminPageHeader (the
 * header here shows the section title as plain text), so each page has
 * exactly one h1. The backdrop repeats the public site's hero (fading grid,
 * soft blue/violet glows); `admin-main` scopes the admin content styles in
 * globals.css.
 */
export function AdminShellClient({ user, title, unreadCount = 0, navItems, brand, children }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const role = user.role;

  return (
    <div className="relative isolate flex min-h-screen bg-surface">
      <div aria-hidden="true" className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div className="admin-grid-bg absolute inset-x-0 top-0 h-[560px]" />
        <div className="absolute -left-40 -top-40 h-[460px] w-[460px] rounded-full bg-primary/12 blur-3xl" />
        <div className="absolute -right-32 top-24 h-[420px] w-[420px] rounded-full bg-secondary/10 blur-3xl" />
      </div>

      <AdminSidebar role={role} navItems={navItems} brand={brand} collapsed={collapsed} onToggleCollapsed={() => setCollapsed((v) => !v)} />
      <AdminMobileDrawer user={user} role={role} navItems={navItems} brand={brand} open={mobileOpen} onClose={() => setMobileOpen(false)} />

      <div className="flex min-w-0 flex-1 flex-col">
        <AdminHeader user={user} title={title} brand={brand} unreadCount={unreadCount} onOpenMobileNav={() => setMobileOpen(true)} />
        <main className="admin-main min-w-0 flex-1 px-3 py-6 sm:px-6 lg:px-8 lg:py-8">
          <div className="mx-auto w-full max-w-[1400px]">{children}</div>
        </main>
      </div>
    </div>
  );
}
