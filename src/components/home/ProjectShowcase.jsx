"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

// Alternates the two brand accents; the stage is a saturated gradient so the
// white browser mockup pops against it.
const THEMES = [
  {
    stage: "from-blue-600 via-primary to-sky-400",
    text: "text-primary",
    soft: "bg-primary/10 text-primary",
    chip: "border-primary/20 bg-primary/10 text-primary",
    glow: "bg-cyan-300/40",
  },
  {
    stage: "from-violet-700 via-secondary to-fuchsia-500",
    text: "text-secondary",
    soft: "bg-secondary/10 text-secondary",
    chip: "border-secondary/20 bg-secondary/10 text-secondary",
    glow: "bg-pink-300/40",
  },
];

const dotPattern = {
  backgroundImage: "radial-gradient(rgb(255 255 255 / 0.22) 1px, transparent 1px)",
  backgroundSize: "20px 20px",
};

// Where the three floating tech badges sit around the mockup (large screens).
const FLOATERS = [
  "left-[6%] top-[14%]",
  "right-[6%] top-[22%]",
  "bottom-[12%] left-[12%]",
];

/**
 * Interactive project showcase: a list of example projects on the left and a
 * large preview of the selected one on the right. It advances on its own
 * every few seconds (progress bar on the active tab) and pauses while the
 * pointer or focus is inside. Previews are decorative wireframes passed in as
 * nodes — illustrations of the *kind* of interface students build, not
 * screenshots of real student work.
 */
export function ProjectShowcase({ projects }) {
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);
  const project = projects[active];
  const theme = THEMES[active % THEMES.length];
  const tech = project.tech.split(",").map((item) => item.trim());

  const goTo = (index) => setActive((index + projects.length) % projects.length);

  return (
    <div
      className="grid gap-5 lg:grid-cols-12 lg:gap-6"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
    >
      <div
        role="tablist"
        aria-label="Example projects"
        aria-orientation="vertical"
        className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] lg:col-span-4 lg:mx-0 lg:flex-col lg:overflow-visible lg:px-0 [&::-webkit-scrollbar]:hidden"
      >
        {projects.map((item, index) => {
          const selected = index === active;
          return (
            <button
              key={item.title}
              type="button"
              role="tab"
              id={`project-tab-${index}`}
              aria-selected={selected}
              aria-controls="project-panel"
              tabIndex={selected ? 0 : -1}
              onClick={() => goTo(index)}
              onKeyDown={(event) => {
                const step =
                  event.key === "ArrowDown" || event.key === "ArrowRight"
                    ? 1
                    : event.key === "ArrowUp" || event.key === "ArrowLeft"
                      ? -1
                      : 0;
                if (!step) return;
                event.preventDefault();
                const next = (index + step + projects.length) % projects.length;
                goTo(next);
                document.getElementById(`project-tab-${next}`)?.focus();
              }}
              className={cn(
                "group relative flex flex-none items-center gap-3 overflow-hidden rounded-xl border px-4 py-3 text-left transition-all duration-300 lg:flex-1",
                selected
                  ? "border-transparent bg-gradient-to-r from-primary to-secondary shadow-[0_12px_30px_-10px] shadow-secondary/60 lg:translate-x-2"
                  : "border-border bg-white hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-card"
              )}
            >
              <span
                className={cn(
                  "flex h-9 min-w-9 flex-none items-center justify-center rounded-lg text-xs font-bold transition-colors duration-300",
                  selected
                    ? "bg-white/20 text-white"
                    : cn("bg-surface text-muted", index % 2 ? "group-hover:text-secondary" : "group-hover:text-primary")
                )}
              >
                {String(index + 1).padStart(2, "0")}
              </span>
              <span className="min-w-0">
                <span
                  className={cn(
                    "block whitespace-nowrap text-sm font-semibold lg:whitespace-normal",
                    selected ? "text-white" : "text-dark"
                  )}
                >
                  {item.title}
                </span>
                <span className={cn("mt-0.5 hidden truncate text-xs lg:block", selected ? "text-white/75" : "text-muted")}>
                  {item.tech}
                </span>
              </span>
              <span
                aria-hidden="true"
                className={cn(
                  "ml-auto hidden text-lg text-white transition-all duration-300 lg:block",
                  selected ? "translate-x-0 opacity-100" : "-translate-x-2 opacity-0"
                )}
              >
                →
              </span>

              {selected && (
                <span
                  key={`progress-${active}`}
                  aria-hidden="true"
                  onAnimationEnd={() => goTo(active + 1)}
                  style={{ animationPlayState: paused ? "paused" : "running" }}
                  className="animate-progress-fill absolute inset-x-0 bottom-0 h-1 bg-white/60"
                />
              )}
            </button>
          );
        })}
      </div>

      <div
        role="tabpanel"
        id="project-panel"
        aria-labelledby={`project-tab-${active}`}
        className="overflow-hidden rounded-2xl border border-border bg-white shadow-elevated lg:col-span-8"
      >
        <div key={active} className="animate-fade-up-in">
          <div
            aria-hidden="true"
            className={cn(
              "relative flex min-h-[18rem] items-center justify-center overflow-hidden bg-gradient-to-br px-6 py-8 sm:min-h-[24rem]",
              theme.stage
            )}
          >
            <div className="absolute inset-0" style={dotPattern} />
            <div className={cn("animate-drift absolute -right-10 -top-10 h-48 w-48 rounded-full blur-3xl", theme.glow)} />
            <div className="animate-drift-slow absolute -bottom-12 -left-10 h-48 w-48 rounded-full bg-white/25 blur-3xl" />

            {tech.slice(0, FLOATERS.length).map((item, index) => (
              <span
                key={item}
                style={{ animationDelay: `${index * 0.8}s` }}
                className={cn(
                  "animate-float absolute hidden rounded-full border border-white/30 bg-white/20 px-3 py-1.5 text-xs font-semibold text-white shadow-soft backdrop-blur sm:block",
                  FLOATERS[index]
                )}
              >
                {item}
              </span>
            ))}

            <div className="animate-float relative w-[20rem] max-w-full sm:scale-[1.55]">
              <div className="overflow-hidden rounded-xl border border-white/40 bg-surface shadow-[0_24px_60px_-12px_rgb(15_23_42/0.5)]">
                <div className="flex items-center gap-1.5 border-b border-border bg-white px-3 py-2">
                  <span className="h-2 w-2 rounded-full bg-red-300" />
                  <span className="h-2 w-2 rounded-full bg-amber-300" />
                  <span className="h-2 w-2 rounded-full bg-emerald-300" />
                  <span className="ml-2 h-2 flex-1 rounded-full bg-surface" />
                </div>
                <div className="h-36 p-3">{project.preview}</div>
              </div>
            </div>
          </div>

          <div className="p-6 sm:p-8">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h3 className="text-2xl font-semibold tracking-tight text-dark">{project.title}</h3>
              <span className={cn("rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide", theme.soft)}>
                Example project
              </span>
            </div>
            <p className="mt-2 text-base leading-relaxed text-muted">{project.problem}</p>

            <div className="mt-5 grid gap-4 border-t border-border pt-5 sm:grid-cols-2">
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest text-muted">Tech stack</p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {tech.map((item, index) => (
                    <span
                      key={item}
                      style={{ animationDelay: `${0.15 + index * 0.08}s` }}
                      className={cn("animate-fade-up-in rounded-md border px-2.5 py-1 text-xs font-semibold", theme.chip)}
                    >
                      {item}
                    </span>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest text-muted">You build</p>
                <p className="mt-2 text-sm leading-relaxed text-text">{project.build}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
