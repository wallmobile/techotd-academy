"use client";

import { useRef } from "react";
import { AnimatePresence, motion } from "framer-motion";
import Link from "next/link";
import { TrainerNavList } from "@/components/trainer/TrainerNavList";
import { LogoutButton } from "@/components/auth/LogoutButton";
import { IconButton } from "@/components/ui/IconButton";
import { useDialogA11y } from "@/lib/useDialogA11y";

/**
 * Trainer equivalent of src/components/student/StudentMobileDrawer.jsx —
 * same accessible drawer pattern: focus moves into the panel on open,
 * Escape closes it, background scroll is locked while open, and
 * navigating closes it (via the onNavigate prop threaded through
 * TrainerNavList).
 */
export function TrainerMobileDrawer({ open, onClose }) {
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
            className="absolute inset-0 bg-dark/50"
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
            aria-label="Trainer dashboard navigation"
            ref={panelRef}
            tabIndex={-1}
            className="absolute left-0 top-0 flex h-full w-full max-w-xs flex-col overflow-y-auto bg-white shadow-elevated"
          >
            <div className="flex items-center justify-between border-b border-border px-5 py-4">
              <Link href="/" className="flex items-center gap-2 text-sm font-semibold tracking-tight text-dark">
                <span className="flex h-8 w-8 items-center justify-center rounded-sm bg-primary text-xs font-bold text-white">
                  T
                </span>
                TechOTD Academy
              </Link>
              <IconButton label="Close menu" onClick={onClose}>
                <svg width="20" height="20" viewBox="0 0 18 18" fill="none" aria-hidden="true">
                  <path
                    d="M4 4L14 14M14 4L4 14"
                    stroke="currentColor"
                    strokeWidth="1.6"
                    strokeLinecap="round"
                  />
                </svg>
              </IconButton>
            </div>

            <div className="flex-1 px-3 py-4">
              <TrainerNavList onNavigate={onClose} />
            </div>

            <div className="border-t border-border p-4">
              <LogoutButton />
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
