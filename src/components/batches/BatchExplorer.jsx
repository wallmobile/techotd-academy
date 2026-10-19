"use client";

import { useMemo, useState } from "react";
import { Container } from "@/components/layout/Container";
import { BatchSearch } from "@/components/batches/BatchSearch";
import { BatchGrid } from "@/components/batches/BatchGrid";
import { cn } from "@/lib/utils";

function enrich(batch, courseBySlug) {
  const course = courseBySlug.get(batch.courseSlug);
  return course ? { ...batch, course } : null;
}

function matchesQuery(entry, query) {
  if (!query.trim()) return true;
  const haystack = [entry.course.title, entry.course.category, entry.mode, entry.location]
    .join(" ")
    .toLowerCase();
  return haystack.includes(query.trim().toLowerCase());
}

function Segmented({ label, options, value, onChange }) {
  return (
    <div
      role="group"
      aria-label={label}
      className="flex max-w-full gap-1 overflow-x-auto rounded-full border border-border bg-white p-1 shadow-soft [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
    >
      {options.map((option) => {
        const active = value === option.value;
        return (
          <button
            key={option.value}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(option.value)}
            className={cn(
              "inline-flex shrink-0 items-center gap-2 whitespace-nowrap rounded-full px-4 py-2 text-sm font-medium transition-all duration-200",
              active ? "bg-dark text-white shadow-soft" : "text-text hover:bg-surface hover:text-primary"
            )}
          >
            {option.label}
            <span
              className={cn(
                "rounded-full px-1.5 text-xs",
                active ? "bg-white/20 text-white" : "bg-surface text-muted"
              )}
            >
              {option.count}
            </span>
          </button>
        );
      })}
    </div>
  );
}

function countBy(entries, key) {
  const counts = {};
  for (const entry of entries) counts[key(entry)] = (counts[key(entry)] || 0) + 1;
  return counts;
}

// `courses` is the published catalog, passed from the server page (the catalog is
// database-backed and can't be imported here).
export function BatchExplorer({ batches, courses = [] }) {
  const [query, setQuery] = useState("");
  const [mode, setMode] = useState("all");
  const [status, setStatus] = useState("all");
  const [category, setCategory] = useState("all");

  const enriched = useMemo(() => {
    const courseBySlug = new Map(courses.map((course) => [course.slug, course]));
    return batches.map((batch) => enrich(batch, courseBySlug)).filter(Boolean);
  }, [batches, courses]);

  const categories = useMemo(() => [...new Set(enriched.map((entry) => entry.course.category))], [enriched]);
  const modeOptions = useMemo(() => {
    const counts = countBy(enriched, (entry) => entry.mode);
    return [
      { value: "all", label: "All modes", count: enriched.length },
      ...Object.keys(counts).map((value) => ({ value, label: value, count: counts[value] })),
    ];
  }, [enriched]);
  const statusOptions = useMemo(() => {
    const counts = countBy(enriched, (entry) => entry.status);
    return [
      { value: "all", label: "Any status", count: enriched.length },
      ...Object.keys(counts).map((value) => ({ value, label: value, count: counts[value] })),
    ];
  }, [enriched]);

  const results = useMemo(
    () =>
      enriched.filter(
        (entry) =>
          matchesQuery(entry, query) &&
          (mode === "all" || entry.mode === mode) &&
          (status === "all" || entry.status === status) &&
          (category === "all" || entry.course.category === category)
      ),
    [enriched, query, mode, status, category]
  );

  const openCount = enriched.filter((entry) => entry.status === "Open").length;
  const hasConstraint = query.trim() !== "" || mode !== "all" || status !== "all" || category !== "all";
  const reset = () => {
    setQuery("");
    setMode("all");
    setStatus("all");
    setCategory("all");
  };

  return (
    <div className="relative isolate overflow-hidden bg-surface">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10">
        <div className="animate-drift absolute -left-24 -top-24 h-96 w-96 rounded-full bg-primary/15 blur-[100px]" />
        <div className="animate-drift-slow absolute -right-20 top-32 h-96 w-96 rounded-full bg-secondary/15 blur-[100px]" />
        <div className="animate-drift absolute bottom-0 left-1/3 h-72 w-72 rounded-full bg-primary/10 blur-[100px]" />
      </div>

      <Container className="py-10 sm:py-14">
        <header className="animate-fade-up-in flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-primary">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping-soft absolute inline-flex h-full w-full rounded-full bg-primary" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
              </span>
              Batches
            </p>
            <h1 className="mt-3 text-4xl font-bold leading-[1.1] tracking-tight text-dark sm:text-5xl">
              Upcoming{" "}
              <span className="bg-linear-to-r from-primary to-secondary bg-clip-text text-transparent">
                Learning Batches
              </span>
            </h1>
            <p className="mt-4 max-w-xl text-base text-muted">
              Sample batch schedules across our courses — exact dates and availability are confirmed during
              enrollment.
            </p>
          </div>

          <dl className="flex divide-x divide-border">
            <div className="pr-6">
              <dd className="bg-linear-to-r from-primary to-secondary bg-clip-text text-3xl font-bold text-transparent">
                {enriched.length}
              </dd>
              <dt className="mt-1 text-xs font-medium uppercase tracking-wider text-muted">Batches</dt>
            </div>
            <div className="px-6">
              <dd className="bg-linear-to-r from-primary to-secondary bg-clip-text text-3xl font-bold text-transparent">
                {openCount}
              </dd>
              <dt className="mt-1 text-xs font-medium uppercase tracking-wider text-muted">Open now</dt>
            </div>
            <div className="pl-6">
              <dd className="bg-linear-to-r from-primary to-secondary bg-clip-text text-3xl font-bold text-transparent">
                {categories.length}
              </dd>
              <dt className="mt-1 text-xs font-medium uppercase tracking-wider text-muted">Tracks</dt>
            </div>
          </dl>
        </header>

        <div className="animate-fade-up-in mt-10 flex flex-col gap-3" style={{ animationDelay: "100ms" }}>
          <BatchSearch value={query} onChange={setQuery} />
          <div className="flex flex-wrap items-center gap-3">
            <Segmented label="Filter by mode" options={modeOptions} value={mode} onChange={setMode} />
            <Segmented label="Filter by status" options={statusOptions} value={status} onChange={setStatus} />
            <select
              aria-label="Filter by category"
              value={category}
              onChange={(event) => setCategory(event.target.value)}
              className="h-11 rounded-full border border-border bg-white px-4 text-sm text-dark shadow-soft focus-visible:outline-2 focus-visible:outline-primary"
            >
              <option value="all">All categories</option>
              {categories.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="mt-8 flex items-center gap-3" aria-live="polite">
          <p className="text-sm text-muted">
            <span className="font-semibold text-dark">{results.length}</span>{" "}
            {results.length === 1 ? "batch" : "batches"} found
          </p>
          {hasConstraint && (
            <button
              type="button"
              onClick={reset}
              className="text-xs font-medium text-muted underline-offset-4 hover:text-primary hover:underline"
            >
              Clear all
            </button>
          )}
        </div>

        <div className="mt-4">
          <BatchGrid batches={results} spotlightFirst={!hasConstraint} />
        </div>
      </Container>
    </div>
  );
}
