"use client";

import { useState } from "react";
import { StudentSidebar } from "@/components/student/StudentSidebar";
import { StudentMobileDrawer } from "@/components/student/StudentMobileDrawer";
import { StudentHeader } from "@/components/student/StudentHeader";
import { UnreadCountProvider, useUnreadCount } from "@/components/student/UnreadCountContext";

function ConnectedStudentHeader({ user, title, onOpenMobileNav }) {
  const { unreadCount } = useUnreadCount();
  return (
    <StudentHeader user={user} title={title} unreadCount={unreadCount} onOpenMobileNav={onOpenMobileNav} />
  );
}

/**
 * Student LMS shell: sidebar (desktop/tablet) + drawer (mobile) + header +
 * content. One client component owns the small bits of interactive state
 * (mobile drawer open/closed, sidebar collapsed/expanded) and everything
 * else — including all data fetching — stays in Server Components that
 * render as `children`. `unreadCount` is fetched server-side by
 * StudentShell.jsx (the async wrapper around this component) and only
 * ever passed down, never fetched here.
 */
export function StudentShellClient({ user, title, unreadCount, children }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  return (
    <UnreadCountProvider initialCount={unreadCount}>
      <div className="flex min-h-screen bg-surface">
        <StudentSidebar collapsed={collapsed} onToggleCollapsed={() => setCollapsed((v) => !v)} />
        <StudentMobileDrawer open={mobileOpen} onClose={() => setMobileOpen(false)} />

        <div className="flex min-w-0 flex-1 flex-col">
          <ConnectedStudentHeader user={user} title={title} onOpenMobileNav={() => setMobileOpen(true)} />
          <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">{children}</main>
        </div>
      </div>
    </UnreadCountProvider>
  );
}
