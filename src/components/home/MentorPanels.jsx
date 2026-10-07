"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

const ACCENTS = [
  { chip: "bg-sky-400/20 text-sky-100 ring-sky-300/30", line: "from-sky-400 to-primary" },
  { chip: "bg-fuchsia-400/20 text-fuchsia-100 ring-fuchsia-300/30", line: "from-fuchsia-400 to-secondary" },
  { chip: "bg-emerald-400/20 text-emerald-100 ring-emerald-300/30", line: "from-emerald-400 to-teal-400" },
  { chip: "bg-pink-400/20 text-pink-100 ring-pink-300/30", line: "from-pink-400 to-orange-400" },
];

const AUTO_ADVANCE_MS = 3500;

/**
 * Expanding photo panels: the active mentor opens wide (or tall on mobile)
 * while the others fold down to a slim strip. The open panel advances on its
 * own, so the row keeps moving; hover, focus or tap takes over and pauses it.
 */
export function MentorPanels({ mentors }) {
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (paused) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const timer = setInterval(() => setActive((current) => (current + 1) % mentors.length), AUTO_ADVANCE_MS);
    return () => clearInterval(timer);
  }, [paused, mentors.length]);

  return (
    <div
      className="flex flex-col gap-2.5 lg:h-[32rem] lg:flex-row"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
    >
      {mentors.map((mentor, index) => {
        const open = index === active;
        const accent = ACCENTS[index % ACCENTS.length];
        const skills = mentor.expertise.split("•").map((item) => item.trim());

        return (
          <article
            key={mentor.name}
            tabIndex={0}
            aria-label={`${mentor.name}, ${mentor.role}`}
            onMouseEnter={() => setActive(index)}
            onFocus={() => setActive(index)}
            onClick={() => setActive(index)}
            className={cn(
              "group relative min-w-0 cursor-pointer overflow-hidden rounded-3xl bg-dark shadow-card outline-none transition-all duration-700 ease-[cubic-bezier(.22,1,.36,1)] focus-visible:ring-2 focus-visible:ring-primary",
              open ? "h-[28rem] lg:h-auto lg:flex-[5]" : "h-20 lg:h-auto lg:flex-1"
            )}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={mentor.photo}
              alt=""
              loading="lazy"
              draggable="false"
              className={cn(
                "absolute inset-0 h-full w-full object-cover object-[50%_35%] transition-all duration-700",
                open ? "scale-100 opacity-100" : "scale-110 opacity-50 saturate-50"
              )}
            />
            <div
              aria-hidden="true"
              className={cn(
                "absolute inset-0",
                open
                  ? "bg-gradient-to-t from-dark via-dark/40 to-transparent"
                  : "bg-gradient-to-t from-dark/90 via-dark/40 to-dark/30"
              )}
            />

            <span
              aria-hidden="true"
              className={cn(
                "absolute left-4 top-4 flex h-8 w-8 items-center justify-center rounded-full border border-white/25 bg-white/10 text-[11px] font-bold text-white backdrop-blur transition-all duration-500",
                !open && "lg:left-1/2 lg:-translate-x-1/2"
              )}
            >
              {String(index + 1).padStart(2, "0")}
            </span>

            {/* Folded state: role label */}
            <span
              className={cn(
                "absolute whitespace-nowrap text-sm font-semibold text-white transition-all duration-500",
                "left-16 top-1/2 -translate-y-1/2 lg:left-1/2 lg:top-auto lg:bottom-6 lg:-translate-x-1/2 lg:translate-y-0 lg:[writing-mode:vertical-rl] lg:rotate-180",
                open ? "pointer-events-none opacity-0" : "opacity-100 delay-300"
              )}
            >
              {mentor.role.replace(" Mentor", "")}
            </span>

            {/* Open state: full profile */}
            <div
              className={cn(
                "absolute inset-x-0 bottom-0 flex flex-col gap-3 p-6 transition-all duration-500 sm:p-7",
                open ? "translate-y-0 opacity-100 delay-200" : "pointer-events-none translate-y-4 opacity-0"
              )}
            >
              <span className={cn("h-1 w-12 rounded-full bg-gradient-to-r", accent.line)} />
              <div>
                <h3 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">{mentor.name}</h3>
                <p className="mt-1 text-sm font-medium text-white/80">{mentor.role}</p>
              </div>
              <p className="max-w-sm text-sm leading-relaxed text-white/70">{mentor.tagline}</p>
              <div className="flex flex-wrap gap-1.5">
                {skills.map((skill) => (
                  <span
                    key={skill}
                    className={cn("rounded-full px-3 py-1 text-xs font-semibold ring-1 backdrop-blur", accent.chip)}
                  >
                    {skill}
                  </span>
                ))}
              </div>
            </div>
          </article>
        );
      })}
    </div>
  );
}
