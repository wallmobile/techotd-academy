"use client";

import { useEffect, useRef } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

/**
 * Shared body for the student/trainer `error.jsx` boundaries. Deliberately
 * generic: it never renders `error.message` or a stack — in production
 * Next.js already strips server error details from what reaches the
 * client, and in every environment this component shows only fixed,
 * friendly copy (plus the opaque `digest` id, which is safe to quote to
 * support and lets them find the server-side log).
 */
export function LmsError({ error, reset, homeHref, homeLabel }) {
  const headingRef = useRef(null);

  // Move focus to the message so keyboard/screen-reader users learn the
  // page failed instead of being left on a now-removed control.
  useEffect(() => {
    headingRef.current?.focus();
  }, []);

  return (
    <div className="flex min-h-screen items-center justify-center bg-surface px-4 py-10">
      <Card className="w-full max-w-md text-center" role="alert">
        <div
          aria-hidden="true"
          className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-danger/10 text-danger"
        >
          <svg width="22" height="22" viewBox="0 0 20 20" fill="none">
            <path d="M10 6v5M10 14h.01" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            <circle cx="10" cy="10" r="7.5" stroke="currentColor" strokeWidth="1.4" />
          </svg>
        </div>
        <h1 ref={headingRef} tabIndex={-1} className="mt-4 text-lg font-semibold text-dark outline-none">
          Something went wrong
        </h1>
        <p className="mt-2 text-sm text-muted">
          We couldn&apos;t load this page. This is usually temporary — please try again.
        </p>
        {error?.digest && <p className="mt-2 text-xs text-muted">Reference: {error.digest}</p>}
        <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
          <Button onClick={() => reset()}>Try again</Button>
          <Button href={homeHref} variant="outline">
            {homeLabel}
          </Button>
        </div>
      </Card>
    </div>
  );
}
