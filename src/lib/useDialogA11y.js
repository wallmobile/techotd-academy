"use client";

import { useEffect, useRef } from "react";

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Shared modal-dialog accessibility behavior for the header's mobile menu
 * and the student/trainer mobile drawers — previously each component
 * duplicated its own "Escape to close + body scroll lock + initial focus"
 * effect (with no Tab-focus trap at all, letting keyboard focus leave the
 * open panel into the hidden page behind it). One hook, reused everywhere
 * a full-screen/off-canvas dialog opens.
 */
export function useDialogA11y({ open, onClose, panelRef, restoreFocus = true }) {
  // Callers pass inline `() => setOpen(false)` handlers, which change
  // identity on every render. Keeping onClose in a ref means the effect
  // below depends only on `open` — otherwise it would tear down and re-run
  // on each parent render, restoring focus to the trigger and re-stealing
  // it into the panel mid-interaction.
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  });

  useEffect(() => {
    if (!open) return;

    // Captured BEFORE focus moves into the panel, so closing the dialog
    // can return keyboard focus to the control that opened it.
    const triggerElement = restoreFocus ? document.activeElement : null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    panelRef.current?.focus();

    function onKeyDown(event) {
      if (event.key === "Escape") {
        onCloseRef.current?.();
        return;
      }

      if (event.key !== "Tab") return;

      const panel = panelRef.current;
      if (!panel) return;

      const focusable = Array.from(panel.querySelectorAll(FOCUSABLE_SELECTOR));
      if (focusable.length === 0) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const active = document.activeElement;

      if (event.shiftKey && active === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
      } else if (!panel.contains(active)) {
        // Focus somehow ended up outside the panel (e.g. programmatic
        // focus elsewhere) — pull it back in rather than letting Tab
        // continue from wherever it landed.
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", onKeyDown);

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
      if (triggerElement instanceof HTMLElement && triggerElement.isConnected) {
        triggerElement.focus();
      }
    };
  }, [open, panelRef, restoreFocus]);
}
