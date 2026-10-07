"use client";

import { useMemo, useState } from "react";
import { Container } from "@/components/layout/Container";
import { TrainerCard } from "@/components/trainers/TrainerCard";
import { Gradient } from "@/components/training/icons";
import { cn } from "@/lib/utils";

// Role keywords -> a short filter label, checked in order.
const TRACKS = [
  ["Full Stack", "Full Stack"],
  ["Data", "Data & AI"],
  ["AI", "Data & AI"],
  ["Cloud", "Cloud & DevOps"],
  ["Backend", "Backend"],
  ["Python", "Backend"],
  ["UI/UX", "Design"],
  ["Mobile", "Mobile"],
  ["Cyber", "Security"],
  ["QA", "Quality"],
];

function trackOf(trainer) {
  const match = TRACKS.find(([keyword]) => trainer.role.includes(keyword));
  return match ? match[1] : "Other";
}

export function TrainerExplorer({ trainers }) {
  const [query, setQuery] = useState("");
  const [track, setTrack] = useState("All");

  const enriched = useMemo(() => trainers.map((trainer) => ({ ...trainer, track: trackOf(trainer) })), [trainers]);
  const tracks = useMemo(() => ["All", ...new Set(enriched.map((trainer) => trainer.track))], [enriched]);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    return enriched.filter((trainer) => {
      if (track !== "All" && trainer.track !== track) return false;
      if (!q) return true;
      return [trainer.name, trainer.role, trainer.expertise, trainer.tagline].join(" ").toLowerCase().includes(q);
    });
  }, [enriched, query, track]);

  return (
    <section id="mentors" className="scroll-mt-28 bg-surface py-12 sm:py-14 lg:py-20">
      <Container>
        <div className="max-w-2xl">
          <p className="text-sm font-semibold uppercase tracking-wide text-primary">Meet the mentors</p>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight text-dark sm:text-4xl">
            Find a mentor in <Gradient>your area</Gradient>
          </h2>
          <p className="mt-3 text-base text-muted">
            Profiles below are sample placeholders for the design preview. Real trainer profiles and photos will
            replace them before launch.
          </p>
        </div>

        <div className="mt-8 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div
            className="flex max-w-full gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden lg:flex-wrap lg:overflow-visible"
            role="group"
            aria-label="Filter mentors by area"
          >
            {tracks.map((item) => (
              <button
                key={item}
                type="button"
                aria-pressed={track === item}
                onClick={() => setTrack(item)}
                className={cn(
                  "shrink-0 whitespace-nowrap rounded-full border px-4 py-2 text-sm font-medium transition-all duration-200",
                  track === item
                    ? "border-transparent bg-linear-to-r from-primary to-secondary text-white shadow-md shadow-primary/25"
                    : "border-border bg-white text-text hover:-translate-y-0.5 hover:border-primary/40 hover:text-primary"
                )}
              >
                {item}
              </button>
            ))}
          </div>

          <div className="relative w-full lg:max-w-xs">
            <svg aria-hidden="true" width="16" height="16" viewBox="0 0 18 18" fill="none" className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-primary">
              <circle cx="8" cy="8" r="5.5" stroke="currentColor" strokeWidth="1.6" />
              <path d="M16 16L12.5 12.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
            </svg>
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search by name or skill..."
              aria-label="Search mentors"
              className="h-11 w-full rounded-full border border-border bg-white pl-10 pr-4 text-sm text-text shadow-soft placeholder:text-muted focus:border-primary/50"
            />
          </div>
        </div>

        <p className="mt-6 text-sm text-muted" aria-live="polite">
          <span className="font-semibold text-dark">{results.length}</span> {results.length === 1 ? "mentor" : "mentors"}
        </p>

        {results.length === 0 ? (
          <div className="animate-fade-up-in mt-4 rounded-3xl border border-dashed border-border bg-white/70 py-16 text-center">
            <p className="text-lg font-semibold text-dark">No mentors match that.</p>
            <p className="mt-1 text-sm text-muted">Try another skill or clear the filter.</p>
          </div>
        ) : (
          <div className="mt-4 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {results.map((trainer, index) => (
              <TrainerCard key={trainer.name} trainer={trainer} course={trainer.course} delay={Math.min(index, 8) * 60} />
            ))}
          </div>
        )}
      </Container>
    </section>
  );
}
