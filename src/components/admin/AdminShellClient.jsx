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
 * exactly one h1.
 */
export function AdminShellClient({ user, title, unreadCount = 0, children }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const role = user.role;

  return (
    <div className="flex min-h-screen bg-surface">
      <AdminSidebar role={role} collapsed={collapsed} onToggleCollapsed={() => setCollapsed((v) => !v)} />
      <AdminMobileDrawer role={role} open={mobileOpen} onClose={() => setMobileOpen(false)} />

      <div className="flex min-w-0 flex-1 flex-col">
        <AdminHeader user={user} title={title} unreadCount={unreadCount} onOpenMobileNav={() => setMobileOpen(true)} />
        <main className="min-w-0 flex-1 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">{children}</main>
      </div>
    </div>
  );
}
