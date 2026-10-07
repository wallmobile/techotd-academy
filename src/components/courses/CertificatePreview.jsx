"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { createPortal } from "react-dom";

const CERTIFICATE_SRC = encodeURI("/TechOTD Academy Completion Certificate.png");
const CERTIFICATE_ALT =
  "Sample TechOTD Academy Certificate of Completion showing certificate number, signatures, seal and QR code";

/**
 * Framed certificate image with a hover tilt and a click-to-enlarge lightbox
 * (Esc or a click outside closes it, and page scroll is locked while open).
 */
export function CertificatePreview() {
  const [open, setOpen] = useState(false);
  const closeRef = useRef(null);
  const triggerRef = useRef(null);

  const close = useCallback(() => {
    setOpen(false);
    triggerRef.current?.focus();
  }, []);

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (event) => {
      if (event.key === "Escape") close();
    };
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    closeRef.current?.focus();
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKey);
    };
  }, [open, close]);

  return (
    <>
      <div className="group relative mx-auto w-full max-w-xl">
        {/* offset plates for depth */}
        <span aria-hidden="true" className="absolute inset-0 translate-x-3 translate-y-3 rotate-2 rounded-3xl bg-linear-to-br from-primary/25 to-secondary/25 transition-transform duration-500 group-hover:translate-x-4 group-hover:translate-y-4 group-hover:rotate-3" />
        <span aria-hidden="true" className="absolute inset-0 -translate-x-2 translate-y-2 -rotate-1 rounded-3xl bg-white shadow-card ring-1 ring-border" />

        <button
          ref={triggerRef}
          type="button"
          onClick={() => setOpen(true)}
          aria-label="View the sample certificate full size"
          className="relative block w-full overflow-hidden rounded-3xl bg-white shadow-elevated ring-1 ring-border transition-transform duration-500 hover:-translate-y-1 hover:rotate-[-0.5deg] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary"
        >
          <Image
            src={CERTIFICATE_SRC}
            alt={CERTIFICATE_ALT}
            width={1536}
            height={1024}
            sizes="(min-width: 1024px) 560px, 90vw"
            className="h-auto w-full transition-transform duration-700 group-hover:scale-[1.02]"
          />
          <span aria-hidden="true" className="animate-shine pointer-events-none absolute inset-y-0 left-0 w-1/4 bg-linear-to-r from-transparent via-white/50 to-transparent" />
          <span className="absolute bottom-3 right-3 inline-flex items-center gap-1.5 rounded-full bg-dark/85 px-3 py-1.5 text-xs font-semibold text-white backdrop-blur">
            <svg aria-hidden="true" viewBox="0 0 20 20" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="8.5" cy="8.5" r="5.5" />
              <path d="M17 17l-4.5-4.5M8.5 6v5M6 8.5h5" />
            </svg>
            Click to enlarge
          </span>
        </button>

        <span className="absolute -left-3 -top-3 z-10 rounded-full bg-linear-to-r from-primary to-secondary px-3.5 py-1.5 text-[11px] font-bold uppercase tracking-wider text-white shadow-lg shadow-primary/30">
          Sample certificate
        </span>
      </div>

      {open &&
        createPortal(
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Sample certificate, full size"
          className="animate-fade-up-in fixed inset-0 z-50 flex items-center justify-center bg-dark/85 p-4 backdrop-blur-sm sm:p-8"
          onClick={close}
        >
          <button
            ref={closeRef}
            type="button"
            onClick={close}
            aria-label="Close"
            className="absolute right-4 top-4 flex h-11 w-11 items-center justify-center rounded-full bg-white/15 text-xl text-white backdrop-blur transition-colors hover:bg-white/25 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white sm:right-8 sm:top-8"
          >
            ×
          </button>
          <div className="w-full max-w-5xl" onClick={(event) => event.stopPropagation()}>
            <Image
              src={CERTIFICATE_SRC}
              alt={CERTIFICATE_ALT}
              width={1536}
              height={1024}
              sizes="(min-width: 1280px) 1024px, 95vw"
              className="h-auto w-full rounded-2xl shadow-2xl"
            />
            <p className="mt-3 text-center text-xs text-white/70">
              Sample certificate for illustration. Name, program and details vary by learner and course.
            </p>
          </div>
        </div>,
        document.body
        )}
    </>
  );
}
