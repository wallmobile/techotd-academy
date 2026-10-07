"use client";

import { useRef } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Container } from "@/components/layout/Container";
import { NavItem } from "@/components/layout/NavItem";
import { Button } from "@/components/ui/Button";
import { IconButton } from "@/components/ui/IconButton";
import { primaryNav, headerCta, authNav, isBuiltRoute } from "@/constants/navigation";
import { useDialogA11y } from "@/lib/useDialogA11y";

export function MobileMenu({ open, onClose }) {
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
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            role="dialog"
            aria-modal="true"
            aria-label="Mobile navigation"
            ref={panelRef}
            tabIndex={-1}
            className="absolute right-0 top-0 flex h-full w-full max-w-xs flex-col overflow-y-auto bg-white shadow-elevated"
          >
            <Container className="flex items-center justify-between py-5">
              <span className="text-base font-semibold text-dark">Menu</span>
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
            </Container>

            <nav aria-label="Mobile" className="flex flex-1 flex-col gap-1 px-6">
              {primaryNav.map((item) => (
                <NavItem
                  key={item.href}
                  href={item.href}
                  onClick={onClose}
                  className="rounded-sm px-3 py-3 text-base font-medium text-text hover:bg-surface hover:text-primary"
                >
                  {item.label}
                </NavItem>
              ))}
            </nav>

            <div className="flex flex-col gap-3 px-6 pb-8 pt-4">
              {isBuiltRoute(headerCta.href) ? (
                <Button href={headerCta.href} onClick={onClose} className="w-full">
                  {headerCta.label}
                </Button>
              ) : (
                <Button disabled title="Coming soon" className="w-full">
                  {headerCta.label}
                </Button>
              )}
              <div className="flex items-center justify-center gap-4 text-sm">
                <NavItem
                  href={authNav.login.href}
                  onClick={onClose}
                  className="font-medium text-text hover:text-primary"
                >
                  {authNav.login.label}
                </NavItem>
                <span className="text-border">•</span>
                <NavItem
                  href={authNav.register.href}
                  onClick={onClose}
                  className="font-medium text-text hover:text-primary"
                >
                  {authNav.register.label}
                </NavItem>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
