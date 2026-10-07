"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";

/**
 * Small interactive self-check: tick the prerequisites you're comfortable
 * with and get a plain-language answer about whether to start right away.
 */
export function ReadinessCheck({ prerequisites, courseSlug }) {
  const items = prerequisites.map((item) => item.replace(" (sample)", ""));
  const [checked, setChecked] = useState(() => items.map(() => false));

  const done = checked.filter(Boolean).length;
  const ready = done === items.length;
  const percent = Math.round((done / items.length) * 100);

  const toggle = (index) =>
    setChecked((current) => current.map((value, i) => (i === index ? !value : value)));

  return (
    <div>
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-semibold text-dark">Quick readiness check</p>
        <span
          className={cn(
            "rounded-full px-2.5 py-1 text-xs font-semibold transition-colors duration-500",
            ready ? "bg-success/10 text-success" : "bg-primary/10 text-primary"
          )}
          aria-live="polite"
        >
          {done}/{items.length}
        </span>
      </div>
      <p className="mt-1 text-sm text-muted">Tick what describes you today.</p>

      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-surface" aria-hidden="true">
        <div
          className="animate-gradient-x h-full rounded-full bg-linear-to-r from-primary via-secondary to-primary transition-all duration-500"
          style={{ width: `${percent}%` }}
        />
      </div>

      <ul className="mt-4 flex flex-col gap-2.5">
        {items.map((item, index) => (
          <li key={item}>
            <label
              className={cn(
                "flex cursor-pointer items-start gap-3 rounded-xl border p-3.5 text-sm transition-all duration-200",
                checked[index]
                  ? "border-primary/40 bg-primary/5 text-dark"
                  : "border-border bg-white text-text hover:border-primary/30"
              )}
            >
              <input
                type="checkbox"
                checked={checked[index]}
                onChange={() => toggle(index)}
                className="mt-0.5 h-4 w-4 accent-primary"
              />
              <span>{item}</span>
            </label>
          </li>
        ))}
      </ul>

      <div
        className={cn(
          "mt-4 rounded-2xl p-4 text-sm leading-relaxed transition-all duration-500",
          ready ? "bg-success/10 text-dark" : "bg-surface text-muted"
        )}
        aria-live="polite"
      >
        {ready ? (
          <>
            <p className="font-semibold text-success">You&apos;re ready to start. ✓</p>
            <p className="mt-1 text-text">You meet the prerequisites — pick a batch that fits your schedule.</p>
            <Button href={`/batches`} size="sm" className="mt-3 bg-linear-to-r from-primary to-secondary">
              See upcoming batches
            </Button>
          </>
        ) : (
          <>
            <p className="font-semibold text-dark">Not ticking everything? That&apos;s okay.</p>
            <p className="mt-1">
              A counsellor can suggest where to begin and whether a refresher will help.
            </p>
            <Button
              href={`/book-demo?course=${courseSlug}&source=course-detail`}
              variant="outline"
              size="sm"
              className="mt-3"
            >
              Talk to a counsellor
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
