"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";

const TABS = ["All", "Live Online", "Classroom", "Hybrid"];

// Card colours alternate between the two brand accents so the grid reads as
// one system; only the header artwork differs per learning path.
const THEMES = [
  {
    header: "from-primary/10 to-primary/30",
    tile: "bg-primary",
    soft: "bg-primary/40",
    text: "text-primary",
    stats: "bg-primary/5 text-primary",
    outline: "border-primary text-primary hover:bg-primary/5",
    solid: "bg-primary hover:bg-primary-hover",
    card: "hover:border-primary/40",
  },
  {
    header: "from-secondary/10 to-secondary/30",
    tile: "bg-secondary",
    soft: "bg-secondary/40",
    text: "text-secondary",
    stats: "bg-secondary/5 text-secondary",
    outline: "border-secondary text-secondary hover:bg-secondary/5",
    solid: "bg-secondary hover:bg-secondary-hover",
    card: "hover:border-secondary/40",
  },
];

// Header illustration per category; anything else falls back by position.
const KINDS = {
  "full-stack-development": "code",
  "frontend-development": "browser",
  "backend-development": "server",
  "ai-generative-ai": "robot",
  "data-analytics": "chart",
  "cloud-devops": "cloud",
};
const FALLBACK_KINDS = Object.values(KINDS);

const MAX_TAGS = 3;

const icons = {
  duration: (
    <>
      <circle cx="10" cy="10" r="7" stroke="currentColor" strokeWidth="1.6" />
      <path d="M10 6v4.2l2.8 1.6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </>
  ),
  level: <path d="M4 16V11M10 16V7M16 16V3" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />,
  certificate: (
    <>
      <rect x="3" y="3.5" width="14" height="10" rx="1.5" stroke="currentColor" strokeWidth="1.6" />
      <path d="M7 7h6M7 10h3M12.5 13.5V17l2-1.2 2 1.2v-3.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </>
  ),
};

function Stat({ icon, value, label }) {
  return (
    <div className="flex min-w-0 flex-col items-center gap-1 px-1.5 py-3 text-center">
      <svg aria-hidden="true" width="20" height="20" viewBox="0 0 20 20" fill="none">
        {icon}
      </svg>
      <span className="text-xs font-semibold leading-tight text-dark">{value}</span>
      <span className="text-[10px] font-medium leading-tight text-muted">{label}</span>
    </div>
  );
}

function Dots() {
  return (
    <div className="mb-2.5 flex gap-1">
      <span className="h-1.5 w-1.5 rounded-full bg-red-400" />
      <span className="h-1.5 w-1.5 rounded-full bg-amber-300" />
      <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
    </div>
  );
}

function FloatTile({ className, children }) {
  return (
    <span
      className={cn(
        "absolute z-10 flex h-12 min-w-12 items-center justify-center rounded-xl px-2.5 text-xs font-bold shadow-elevated",
        className
      )}
    >
      {children}
    </span>
  );
}

// Decorative header artwork, one per learning path. Purely visual.
function Illustration({ kind, theme, initials }) {
  const initialsTile = (
    <FloatTile className={cn("bottom-12 right-6 text-white", theme.tile)}>{initials}</FloatTile>
  );

  if (kind === "browser") {
    return (
      <>
        <div className="absolute -bottom-2 right-8 z-0 w-52 rounded-t-lg border border-white/10 bg-dark p-2.5 shadow-elevated sm:w-60">
          <Dots />
          <div className="flex gap-2 pb-8">
            <span className="block h-8 w-8 rounded-md bg-white/15" />
            <div className="flex-1 space-y-1.5">
              <span className="block h-1.5 w-full rounded-full bg-white/30" />
              <span className="block h-1.5 w-2/3 rounded-full bg-fuchsia-300/70" />
              <span className="block h-1.5 w-3/4 rounded-full bg-white/20" />
            </div>
          </div>
        </div>
        <FloatTile className={cn("bottom-10 left-6 h-14 w-14 bg-white", theme.text)}>
          <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <ellipse cx="12" cy="12" rx="10" ry="4" />
            <ellipse cx="12" cy="12" rx="10" ry="4" transform="rotate(60 12 12)" />
            <ellipse cx="12" cy="12" rx="10" ry="4" transform="rotate(120 12 12)" />
            <circle cx="12" cy="12" r="1.6" fill="currentColor" />
          </svg>
        </FloatTile>
        <FloatTile className={cn("bottom-14 right-4 text-white", theme.tile)}>{initials}</FloatTile>
      </>
    );
  }

  if (kind === "server") {
    return (
      <>
        <div className="absolute bottom-0 left-8 z-0 w-28 space-y-1.5">
          {[0, 1, 2].map((row) => (
            <div key={row} className="flex items-center justify-between rounded-md bg-dark px-2.5 py-2.5 shadow-elevated">
              <span className="h-1.5 w-10 rounded-full bg-white/30" />
              <span className="flex gap-1">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                <span className="h-1.5 w-1.5 rounded-full bg-orange-300" />
              </span>
            </div>
          ))}
        </div>
        <div className="absolute bottom-6 right-7 z-0 h-16 w-28 rounded-full bg-white/80 shadow-elevated" />
        <div className="absolute bottom-14 right-14 z-0 h-14 w-14 rounded-full bg-white/80" />
        {initialsTile}
      </>
    );
  }

  if (kind === "robot") {
    return (
      <>
        <svg viewBox="0 0 120 130" className="absolute bottom-0 left-1/2 z-0 h-40 -translate-x-1/2">
          <rect x="52" y="6" width="16" height="16" rx="8" fill="white" />
          <rect x="58" y="18" width="4" height="12" fill="white" />
          <rect x="22" y="28" width="76" height="56" rx="24" fill="white" />
          <rect x="30" y="38" width="60" height="36" rx="16" fill="#0b1f3a" />
          <circle cx="47" cy="56" r="6" fill="#67e8f9" />
          <circle cx="73" cy="56" r="6" fill="#67e8f9" />
          <rect x="34" y="88" width="52" height="42" rx="18" fill="white" />
          <circle cx="60" cy="106" r="6" fill="#34d399" />
        </svg>
        <FloatTile className={cn("bottom-12 left-6 h-14 w-14 bg-white", theme.text)}>
          <svg width="26" height="26" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2l2.2 6.3L21 10.5l-6.8 2.2L12 19l-2.2-6.3L3 10.5l6.8-2.2L12 2z" />
          </svg>
        </FloatTile>
        {initialsTile}
      </>
    );
  }

  if (kind === "chart") {
    return (
      <>
        <div className="absolute -bottom-2 left-1/2 z-0 w-52 -translate-x-1/2 rounded-t-lg bg-white p-3 shadow-elevated sm:w-60">
          <div className="flex h-24 items-end gap-2">
            {[40, 65, 50, 85, 60, 95].map((height, i) => (
              <span
                key={height}
                className={cn("flex-1 rounded-t", i % 2 ? theme.soft : theme.tile)}
                style={{ height: `${height}%` }}
              />
            ))}
          </div>
        </div>
        {initialsTile}
      </>
    );
  }

  if (kind === "cloud") {
    return (
      <>
        <div className="absolute bottom-5 left-1/2 z-0 h-16 w-44 -translate-x-1/2 rounded-full bg-white shadow-elevated" />
        <div className="absolute bottom-12 left-[38%] z-0 h-16 w-16 rounded-full bg-white" />
        <div className="absolute bottom-14 left-[52%] z-0 h-12 w-12 rounded-full bg-white" />
        <FloatTile className={cn("bottom-14 left-6 h-12 w-12 bg-white", theme.text)}>
          <svg width="22" height="22" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M10 16V5M5 9l5-5 5 5" />
          </svg>
        </FloatTile>
        {initialsTile}
      </>
    );
  }

  // "code": laptop-style editor with a floating code tile.
  return (
    <>
      <div className="absolute -bottom-2 left-1/2 z-0 w-52 -translate-x-1/2 rounded-t-lg border border-white/10 bg-dark p-2.5 shadow-elevated sm:w-60">
        <Dots />
        <div className="flex gap-2 pb-8">
          <div className="w-1/4 space-y-1.5">
            <span className="block h-1.5 rounded-full bg-white/25" />
            <span className="block h-1.5 w-3/4 rounded-full bg-white/15" />
            <span className="block h-1.5 rounded-full bg-white/25" />
          </div>
          <div className="flex-1 space-y-1.5">
            <span className="block h-1.5 w-2/3 rounded-full bg-sky-300/70" />
            <span className="block h-1.5 w-full rounded-full bg-white/25" />
            <span className="block h-1.5 w-1/2 rounded-full bg-violet-300/70" />
            <span className="block h-1.5 w-3/4 rounded-full bg-white/20" />
          </div>
        </div>
      </div>
      <FloatTile className={cn("bottom-10 left-6 h-12 w-12 bg-white", theme.text)}>
        <svg width="24" height="24" viewBox="0 0 20 20" fill="none">
          <path d="M7 6L3 10l4 4M13 6l4 4-4 4M11 4.5l-2 11" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </FloatTile>
      {initialsTile}
    </>
  );
}

function CourseSlide({ course, index }) {
  const kind = KINDS[course.categorySlug] ?? FALLBACK_KINDS[index % FALLBACK_KINDS.length];
  const theme = THEMES[index % THEMES.length];
  const extra = Math.max(course.technologies.length - MAX_TAGS, 0);
  const duration = course.duration.replace(" (sample)", "");

  return (
    <article
      className={cn(
        "flex w-[19.5rem] flex-none snap-start flex-col overflow-hidden rounded-lg border border-border bg-white shadow-card transition-all duration-200 hover:-translate-y-1 hover:shadow-elevated sm:w-[23rem]",
        theme.card
      )}
    >
      <div className={cn("relative h-52 overflow-hidden bg-gradient-to-br", theme.header)}>
        <span aria-hidden="true" className="absolute -right-10 -top-12 h-40 w-40 rounded-full bg-white/40 blur-2xl" />
        <span aria-hidden="true" className="absolute left-6 top-20 h-1.5 w-1.5 rounded-full bg-white" />
        <span aria-hidden="true" className="absolute right-10 top-24 h-2 w-2 rounded-full bg-white/80" />

        <div className="relative z-10 flex items-start justify-between gap-2 p-4">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-[11px] font-bold uppercase tracking-wide text-dark shadow-soft">
            <span aria-hidden="true" className={cn("h-2 w-2 rounded-full", theme.tile)} />
            {course.modes[0]}
          </span>
          {course.popular && (
            <span className={cn("inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-[11px] font-bold uppercase tracking-wide shadow-soft", theme.text)}>
              <svg aria-hidden="true" width="12" height="12" viewBox="0 0 20 20" fill="currentColor">
                <path d="M10 1.5c.5 3-1.6 4.4-3 6.2C5.6 9.5 5 10.8 5 12.5a5 5 0 0010 0c0-1.6-.7-2.8-1.6-3.8-.3 1-.9 1.6-1.6 1.8.5-3-.2-6.5-2.8-9z" />
              </svg>
              Most popular
            </span>
          )}
        </div>

        <div aria-hidden="true" className="absolute inset-x-3 bottom-0 top-0 origin-bottom -translate-y-3 scale-[1.2]">
          <Illustration kind={kind} theme={theme} initials={course.initials} />
        </div>
      </div>

      <div className="relative z-20 -mt-5 flex flex-1 flex-col rounded-t-2xl bg-white p-4 sm:p-5">
        <h3 className="truncate text-lg font-semibold leading-7 text-dark">{course.title}</h3>
        <p className="mt-1 line-clamp-2 h-10 text-sm leading-5 text-muted">{course.shortDescription}</p>

        <p className="mt-3 text-xs font-semibold text-dark">Tech Stack</p>
        <div className="mt-2 flex h-7 items-center gap-1.5 overflow-hidden whitespace-nowrap">
          {course.technologies.slice(0, MAX_TAGS).map((tech) => (
            <span key={tech} className="shrink-0 rounded-sm border border-border bg-surface px-2 py-1 text-[11px] text-text">
              {tech}
            </span>
          ))}
          {extra > 0 && <span className={cn("shrink-0 px-1.5 py-1 text-[11px] font-medium", theme.text)}>+{extra} more</span>}
        </div>

        <div className={cn("mt-3 grid grid-cols-3 divide-x divide-white rounded-md", theme.stats)}>
          <Stat icon={icons.duration} value={duration} label="Duration" />
          <Stat icon={icons.level} value={course.level} label="Level" />
          <Stat icon={icons.certificate} value="Certificate" label="Included" />
        </div>

        <div className="mt-auto flex gap-2 pt-3">
          <Button
            href={`/courses/${course.slug}`}
            variant="outline"
            size="sm"
            className={cn("flex-1 whitespace-nowrap", theme.outline)}
          >
            View Details
          </Button>
          <Button
            href={`/book-demo?course=${course.slug}&source=homepage-courses`}
            size="sm"
            className={cn("flex-1 whitespace-nowrap", theme.solid)}
          >
            Start Learning
            <span aria-hidden="true">→</span>
          </Button>
        </div>
      </div>
    </article>
  );
}

export function PopularCoursesCarousel({ courses }) {
  const [tab, setTab] = useState("All");
  const [progress, setProgress] = useState({ ratio: 1, start: 0 });
  const [edges, setEdges] = useState({ atStart: true, atEnd: true });
  const scroller = useRef(null);

  const visible = tab === "All" ? courses : courses.filter((course) => course.modes.includes(tab));

  const update = useCallback(() => {
    const el = scroller.current;
    if (!el) return;
    const max = el.scrollWidth - el.clientWidth;
    const ratio = el.scrollWidth > 0 ? el.clientWidth / el.scrollWidth : 1;
    const start = max > 0 ? (el.scrollLeft / max) * (1 - ratio) : 0;
    setProgress({ ratio, start });
    setEdges({ atStart: el.scrollLeft <= 4, atEnd: el.scrollLeft >= max - 4 });
  }, []);

  useEffect(() => {
    const el = scroller.current;
    if (el) el.scrollTo({ left: 0 });
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, [tab, update]);

  function scrollByCard(direction) {
    const el = scroller.current;
    if (!el) return;
    el.scrollBy({ left: direction * 376, behavior: "smooth" });
  }

  return (
    <div>
      <div className="mx-auto flex w-fit max-w-full overflow-x-auto rounded-full border border-border bg-white/80 p-1.5 shadow-card backdrop-blur [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <div role="tablist" aria-label="Filter courses by learning mode" className="flex gap-1">
          {TABS.map((name) => {
            const count = name === "All" ? courses.length : courses.filter((course) => course.modes.includes(name)).length;
            const active = tab === name;
            return (
              <button
                key={name}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setTab(name)}
                className={cn(
                  "flex items-center gap-2 whitespace-nowrap rounded-full px-4 py-2 text-sm font-semibold transition-all duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary",
                  active
                    ? "bg-gradient-to-r from-primary to-secondary text-white shadow-soft"
                    : "text-muted hover:bg-primary/5 hover:text-primary"
                )}
              >
                {name}
                <span
                  className={cn(
                    "rounded-full px-1.5 py-0.5 text-[11px] font-semibold leading-none",
                    active ? "bg-white/25 text-white" : "bg-surface text-muted"
                  )}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="mt-8 rounded-lg border border-border bg-white p-4 shadow-elevated sm:p-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-text">
            <span className="font-semibold text-dark">{visible.length}</span>{" "}
            {visible.length === 1 ? "course" : "courses"}
            {tab === "Classroom" || tab === "Hybrid" ? " · Classroom location: Noida" : ""}
          </p>
          <div className="flex gap-2">
            {[-1, 1].map((dir) => (
              <button
                key={dir}
                type="button"
                aria-label={dir < 0 ? "Scroll courses left" : "Scroll courses right"}
                disabled={dir < 0 ? edges.atStart : edges.atEnd}
                onClick={() => scrollByCard(dir)}
                className="flex h-9 w-9 items-center justify-center rounded-full border border-border bg-white text-dark transition-colors hover:border-primary hover:text-primary disabled:pointer-events-none disabled:opacity-40"
              >
                <span aria-hidden="true">{dir < 0 ? "←" : "→"}</span>
              </button>
            ))}
          </div>
        </div>

        <div
          ref={scroller}
          onScroll={update}
          tabIndex={0}
          role="region"
          aria-label="Course list"
          className="-mx-1 flex snap-x snap-mandatory gap-4 overflow-x-auto px-1 pb-3 pt-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {visible.map((course, index) => (
            <CourseSlide key={course.slug} course={course} index={index} />
          ))}
        </div>

        <div className="mx-auto mt-4 h-1 w-20 overflow-hidden rounded-full bg-primary/15" aria-hidden="true">
          <div
            className="h-full rounded-full bg-primary transition-[margin,width] duration-150"
            style={{ width: `${progress.ratio * 100}%`, marginLeft: `${progress.start * 100}%` }}
          />
        </div>
      </div>
    </div>
  );
}
