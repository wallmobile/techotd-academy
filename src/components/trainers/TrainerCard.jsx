"use client";

import Link from "next/link";
import { Tilt } from "@/components/shared/Tilt";
import { cn } from "@/lib/utils";

/**
 * Trainer profile card. Profiles are placeholders for the design phase (see
 * data/trainers.js), so each card carries a small "Sample profile" tag.
 * `course` is the course this mentor's area maps to (or null if none yet).
 */
export function TrainerCard({ trainer, course, delay = 0, className }) {
  const skills = trainer.expertise.split("•").map((item) => item.trim()).filter(Boolean);

  return (
    <div className="animate-fade-up-in h-full" style={{ animationDelay: `${delay}ms` }}>
      <Tilt>
        <article
          className={cn(
            "group relative flex h-full flex-col overflow-hidden rounded-3xl border border-border bg-white shadow-card transition-[border-color,box-shadow] duration-300 hover:border-primary/30 hover:shadow-elevated",
            className
          )}
        >
          <div className="relative aspect-4/5 overflow-hidden bg-surface">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={trainer.photo}
              alt={`Illustrated portrait for ${trainer.name}`}
              loading="lazy"
              className="h-full w-full object-cover object-[50%_72%] transition-transform duration-700 group-hover:scale-105"
            />
            <span aria-hidden="true" className="absolute inset-0 bg-linear-to-t from-dark/70 via-dark/10 to-transparent" />
            <span className="absolute left-3 top-3 rounded-full bg-white/90 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-muted backdrop-blur">
              Sample profile
            </span>
            <div className="absolute inset-x-4 bottom-3 text-white">
              <h3 className="text-lg font-semibold leading-tight">{trainer.name}</h3>
              <p className="mt-0.5 text-[13px] font-medium text-white/85">{trainer.role}</p>
            </div>
          </div>

          <div className="flex flex-1 flex-col p-5">
            <p className="text-sm leading-relaxed text-muted">{trainer.tagline}</p>

            <div className="mt-4 flex flex-wrap gap-1.5">
              {skills.map((skill) => (
                <span
                  key={skill}
                  className="rounded-full border border-border bg-surface px-2.5 py-1 text-xs font-medium text-text transition-colors group-hover:border-primary/30"
                >
                  {skill}
                </span>
              ))}
            </div>

            <div className="mt-auto border-t border-border pt-4">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted">Teaches</p>
              {course ? (
                <Link
                  href={`/courses/${course.slug}`}
                  className="group/link mt-1.5 flex items-center gap-2 text-sm font-semibold text-dark transition-colors hover:text-primary"
                >
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-linear-to-br from-primary to-secondary text-[9px] font-black text-white">
                    {course.initials}
                  </span>
                  <span className="min-w-0 flex-1 truncate">{course.title}</span>
                  <span aria-hidden="true" className="transition-transform duration-300 group-hover/link:translate-x-1">
                    →
                  </span>
                </Link>
              ) : (
                <p className="mt-1.5 text-sm text-muted">A course in this area is coming soon.</p>
              )}
            </div>
          </div>
        </article>
      </Tilt>
    </div>
  );
}
