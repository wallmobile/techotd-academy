"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";

// One book per resource, matched by index. `h` is the spine height.
const BOOKS = [
  {
    tone: "from-sky-500 via-primary to-blue-700",
    band: "bg-sky-200/70",
    h: "h-72 sm:h-80",
    icon: <path d="M8 7l-5 5 5 5M16 7l5 5-5 5M13.5 5l-3 14" />,
  },
  {
    tone: "from-fuchsia-500 via-secondary to-violet-700",
    band: "bg-fuchsia-200/70",
    h: "h-64 sm:h-72",
    icon: (
      <>
        <path d="M6 21V4" />
        <path d="M6 5h12l-3 4.5 3 4.5H6" />
      </>
    ),
  },
  {
    tone: "from-amber-400 via-orange-500 to-rose-600",
    band: "bg-amber-100/80",
    h: "h-[17.5rem] sm:h-[19.5rem]",
    icon: (
      <>
        <rect x="9" y="3" width="6" height="11" rx="3" />
        <path d="M5 11a7 7 0 0014 0M12 18v3" />
      </>
    ),
  },
  {
    tone: "from-emerald-400 via-teal-500 to-cyan-700",
    band: "bg-emerald-100/80",
    h: "h-60 sm:h-[17rem]",
    icon: (
      <>
        <circle cx="12" cy="9" r="6" />
        <path d="M8.5 14.5L7 21l5-3 5 3-1.5-6.5" />
      </>
    ),
  },
];

const AUTO_ADVANCE_MS = 3800;

// Slim filler books that make the shelf feel full.
const Filler = ({ className }) => <span aria-hidden="true" className={cn("hidden w-4 flex-none rounded-t-md bg-gradient-to-b sm:block", className)} />;

/**
 * A bookshelf of resources. The active book slides up off the shelf and its
 * details show in the panel beside it. Cycles on its own; hover, focus or tap
 * takes over and pauses it.
 */
export function ResourceShelf({ resources }) {
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);
  const total = resources.length;
  const current = resources[active];
  const look = BOOKS[active % BOOKS.length];

  useEffect(() => {
    if (paused) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const timer = setInterval(() => setActive((i) => (i + 1) % total), AUTO_ADVANCE_MS);
    return () => clearInterval(timer);
  }, [paused, total]);

  return (
    <div
      className="grid items-end gap-10 lg:grid-cols-12 lg:gap-14"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
    >
      {/* Detail panel for the active book */}
      <div className="order-2 lg:order-1 lg:col-span-5">
        <div key={active} className="animate-fade-up-in relative overflow-hidden rounded-3xl border border-border bg-white p-6 shadow-elevated sm:p-8">
          <span aria-hidden="true" className={cn("absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r", look.tone)} />
          <div className="flex items-center gap-3">
            <span
              aria-hidden="true"
              className={cn("flex h-12 w-12 flex-none items-center justify-center rounded-2xl bg-gradient-to-br text-white shadow-card", look.tone)}
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                {look.icon}
              </svg>
            </span>
            <span className="text-xs font-bold uppercase tracking-[0.25em] text-muted">
              Shelf {String(active + 1).padStart(2, "0")} / {String(total).padStart(2, "0")}
            </span>
          </div>
          <h3 className="mt-5 text-2xl font-bold tracking-tight text-dark sm:text-3xl">{current.title}</h3>
          <p className="mt-2 text-base leading-relaxed text-muted">{current.description}</p>
          <div className="mt-6">
            {current.built ? (
              <Link
                href={current.href}
                className={cn(
                  "group inline-flex items-center gap-2 rounded-full bg-gradient-to-r px-5 py-2.5 text-sm font-semibold text-white shadow-card transition-all duration-300 hover:gap-3",
                  look.tone
                )}
              >
                Explore <span aria-hidden="true">→</span>
              </Link>
            ) : (
              <span className="inline-flex items-center gap-2 rounded-full border border-border bg-surface px-3.5 py-1.5 text-xs font-semibold text-muted">
                <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-amber-400" />
                Coming soon
              </span>
            )}
          </div>
        </div>
      </div>

      {/* The shelf */}
      <div className="order-1 lg:order-2 lg:col-span-7">
        <div className="relative">
          <div className="flex items-end justify-center gap-2 px-4 sm:gap-3 sm:px-8">
            <Filler className="h-44 from-slate-300 to-slate-400" />
            {resources.map((resource, index) => {
              const book = BOOKS[index % BOOKS.length];
              const open = index === active;
              return (
                <button
                  key={resource.title}
                  type="button"
                  aria-label={resource.title}
                  aria-pressed={open}
                  onMouseEnter={() => setActive(index)}
                  onFocus={() => setActive(index)}
                  onClick={() => setActive(index)}
                  className={cn(
                    "group relative flex w-16 flex-none flex-col items-center overflow-hidden rounded-t-xl bg-gradient-to-b py-4 text-white outline-none transition-all duration-500 ease-out focus-visible:ring-4 focus-visible:ring-primary/40 sm:w-20 lg:w-24",
                    book.tone,
                    book.h,
                    open ? "-translate-y-6 shadow-[0_30px_40px_-16px] shadow-black/40" : "opacity-90 hover:-translate-y-2"
                  )}
                >
                  <span aria-hidden="true" className={cn("absolute inset-x-0 top-6 h-1.5", book.band)} />
                  <span aria-hidden="true" className={cn("absolute inset-x-0 top-9 h-0.5", book.band)} />
                  <span aria-hidden="true" className={cn("absolute inset-x-0 bottom-6 h-1.5", book.band)} />
                  <span aria-hidden="true" className="absolute inset-y-0 left-0 w-1.5 bg-black/15" />
                  <span aria-hidden="true" className="absolute inset-y-0 right-0 w-1 bg-white/15" />

                  <svg aria-hidden="true" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className="relative mt-10 flex-none opacity-90">
                    {book.icon}
                  </svg>
                  <span className="relative mt-4 flex-1 overflow-hidden whitespace-nowrap pb-6 text-xs font-bold tracking-normal [text-orientation:mixed] [writing-mode:vertical-rl] sm:text-sm">
                    {resource.title}
                  </span>
                </button>
              );
            })}
            <Filler className="h-52 from-slate-200 to-slate-300" />
            <Filler className="h-40 rotate-6 from-slate-300 to-slate-400" />
          </div>

          {/* Shelf board */}
          <div aria-hidden="true" className="relative z-10 -mt-px h-4 rounded-md bg-gradient-to-b from-slate-300 to-slate-400 shadow-[0_12px_20px_-8px] shadow-black/30" />
          <div aria-hidden="true" className="mx-6 h-3 rounded-b-xl bg-gradient-to-b from-slate-400/40 to-transparent" />
        </div>
      </div>
    </div>
  );
}
