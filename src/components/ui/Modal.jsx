"use client";

import { useRef } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { IconButton } from "@/components/ui/IconButton";
import { cn } from "@/lib/utils";
import { useDialogA11y } from "@/lib/useDialogA11y";

/**
 * Accessible modal dialog: traps focus, closes on Escape or backdrop
 * click, restores focus to the trigger on close, and locks body scroll
 * while open.
 */
export function Modal({ open, onClose, title, children, className }) {
  const dialogRef = useRef(null);

  useDialogA11y({ open, onClose, panelRef: dialogRef, restoreFocus: true });

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
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
            initial={{ opacity: 0, y: 12, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.98 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            role="dialog"
            aria-modal="true"
            aria-labelledby={title ? "modal-title" : undefined}
            ref={dialogRef}
            tabIndex={-1}
            className={cn(
              "relative w-full max-w-lg rounded-md border border-border bg-white p-6 shadow-elevated",
              className
            )}
          >
            <div className="mb-4 flex items-start justify-between gap-4">
              {title && (
                <h2 id="modal-title" className="text-lg font-semibold text-dark">
                  {title}
                </h2>
              )}
              <IconButton label="Close dialog" onClick={onClose} className="ml-auto">
                <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
                  <path
                    d="M4 4L14 14M14 4L4 14"
                    stroke="currentColor"
                    strokeWidth="1.6"
                    strokeLinecap="round"
                  />
                </svg>
              </IconButton>
            </div>
            {children}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
