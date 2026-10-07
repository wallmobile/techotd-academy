"use client";

import { useState } from "react";
import { TrainerSidebar } from "@/components/trainer/TrainerSidebar";
import { TrainerMobileDrawer } from "@/components/trainer/TrainerMobileDrawer";
import { TrainerHeader } from "@/components/trainer/TrainerHeader";

/**
 * Trainer LMS shell: sidebar (desktop/tablet) + drawer (mobile) + header +
 * content. Mirrors src/components/student/StudentShellClient.jsx. Unlike
 * the student shell, there's no per-page server data this shell itself
 * needs (no trainer-area notification count exists this phase), so this
 * stays a single client component that owns only the small bits of
 * interactive state (mobile drawer open/closed, sidebar collapsed) —
 * everything else, including all data fetching, stays in the Server
 * Components rendered as `children`.
 */
export function TrainerShell({ user, title, children }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="flex min-h-screen bg-surface">
      <TrainerSidebar collapsed={collapsed} onToggleCollapsed={() => setCollapsed((v) => !v)} />
      <TrainerMobileDrawer open={mobileOpen} onClose={() => setMobileOpen(false)} />

      <div className="flex min-w-0 flex-1 flex-col">
        <TrainerHeader user={user} title={title} onOpenMobileNav={() => setMobileOpen(true)} />
        <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">{children}</main>
      </div>
    </div>
  );
}
