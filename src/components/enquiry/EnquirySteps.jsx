"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

/**
 * Vertical "how it works" timeline. The active step auto-advances every few
 * seconds (paused for users who prefer reduced motion, and on hover/focus),
 * and a gradient fill grows down the connector line to the active step.
 */
export function EnquirySteps({ steps }) {
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (paused) return undefined;
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return undefined;
    const timer = setInterval(() => setActive((current) => (current + 1) % steps.length), 2800);
    return () => clearInterval(timer);
  }, [paused, steps.length]);

  return (
    <ol
      className="relative mt-9 flex max-w-lg flex-col gap-3"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      {steps.map((step, index) => {
        const isActive = index === active;
        const isDone = index < active;
        return (
          <li key={step.title} className="relative">
            <button
              type="button"
              onClick={() => {
                setActive(index);
                setPaused(true);
              }}
              aria-current={isActive ? "step" : undefined}
              className={cn(
                "relative flex w-full items-start gap-4 rounded-2xl border p-3.5 text-left transition-all duration-500",
                isActive
                  ? "border-primary/25 bg-white shadow-card"
                  : "border-transparent hover:bg-white/60"
              )}
            >
              <span className="relative z-10 flex h-11 w-11 shrink-0 items-center justify-center">
                {isActive && (
                  <span aria-hidden="true" className="animate-ping-soft absolute inset-0 rounded-2xl bg-primary/30" />
                )}
                <span
                  className={cn(
                    "relative flex h-11 w-11 items-center justify-center rounded-2xl text-sm font-bold transition-all duration-500",
                    isActive || isDone
                      ? "bg-linear-to-br from-primary to-secondary text-white shadow-lg shadow-primary/25"
                      : "bg-white text-muted ring-1 ring-border",
                    isActive && "scale-110"
                  )}
                >
                  {isDone ? (
                    <svg aria-hidden="true" viewBox="0 0 16 16" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M3.5 8.5l3 3 6-7" />
                    </svg>
                  ) : (
                    index + 1
                  )}
                </span>
              </span>
              <span className="pt-0.5">
                <span className={cn("block text-base font-semibold transition-colors duration-500", isActive ? "text-primary" : "text-dark")}>
                  {step.title}
                </span>
                <span
                  className={cn(
                    "mt-0.5 block text-sm leading-relaxed text-muted transition-opacity duration-500",
                    isActive ? "opacity-100" : "opacity-60"
                  )}
                >
                  {step.text}
                </span>
              </span>
            </button>
            {index < steps.length - 1 && (
              <>
                <span aria-hidden="true" className="absolute left-[2.15rem] top-9 z-5 h-[calc(100%+0.75rem)] w-0.5 rounded-full bg-border" />
                <span
                  aria-hidden="true"
                  className={cn(
                    "absolute left-[2.15rem] top-9 z-5 h-[calc(100%+0.75rem)] w-0.5 origin-top rounded-full bg-linear-to-b from-primary to-secondary transition-transform duration-700 ease-out",
                    isDone ? "scale-y-100" : "scale-y-0"
                  )}
                />
              </>
            )}
          </li>
        );
      })}
    </ol>
  );
}
