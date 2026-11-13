"use client";

import { useRef } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { AdminNavList } from "@/components/admin/AdminNavList";
import { AdminBrand, AdminIdentity, AdminLogout } from "@/components/admin/AdminSidebar";
import { useDialogA11y } from "@/lib/useDialogA11y";

/**
 * Admin mobile drawer — same accessible pattern as the student/trainer
 * drawers, using the shared useDialogA11y hook (Escape, scroll lock, Tab
 * trap, focus restored to the opening button on close). Same white panel
 * and pieces as the desktop sidebar.
 */
export function AdminMobileDrawer({ open, onClose, user, role, navItems, brand = "TechOTD Admin" }) {
  const panelRef = useRef(null);

  useDialogA11y({ open, onClose, panelRef });

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 md:hidden">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="absolute inset-0 bg-dark/40 backdrop-blur-sm"
            onClick={onClose}
            aria-hidden="true"
          />
          <motion.div
            initial={{ x: "-100%" }}
            animate={{ x: 0 }}
            exit={{ x: "-100%" }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            role="dialog"
            aria-modal="true"
            aria-label="Admin navigation"
            ref={panelRef}
            tabIndex={-1}
            className="absolute left-0 top-0 flex h-full w-full max-w-xs flex-col overflow-y-auto rounded-r-[22px] bg-white shadow-elevated"
          >
            <div className="flex items-start justify-between gap-3 border-b border-border/70 px-5 py-4">
              <AdminBrand brand={brand} showArea />
              <button
                type="button"
                aria-label="Close menu"
                onClick={onClose}
                className="inline-flex h-10 w-10 flex-none items-center justify-center rounded-xl text-muted ring-1 ring-border transition-colors hover:bg-surface hover:text-dark focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
              >
                <svg width="20" height="20" viewBox="0 0 18 18" fill="none" aria-hidden="true">
                  <path d="M4 4L14 14M14 4L4 14" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                </svg>
              </button>
            </div>

            <div className="flex-1 px-3 py-4">
              <AdminNavList role={role} items={navItems} onNavigate={onClose} />
            </div>

            <div className="flex flex-col gap-1.5 border-t border-border/70 p-3">
              {user && <AdminIdentity user={user} />}
              <AdminLogout />
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
