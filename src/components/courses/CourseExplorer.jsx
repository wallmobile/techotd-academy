"use client";

import { useMemo, useState } from "react";
import { Container } from "@/components/layout/Container";
import { cn } from "@/lib/utils";
import { CourseSearch } from "@/components/courses/CourseSearch";
import { CourseFilters } from "@/components/courses/CourseFilters";
import { CourseGrid } from "@/components/courses/CourseGrid";
import { SORT_OPTIONS } from "@/data/courseFilters";

const EMPTY_FILTERS = { category: "all", levels: [], modes: [], durationBands: [] };

function matchesQuery(course, query) {
  if (!query.trim()) return true;
  const haystack = [course.title, course.shortDescription, course.category, ...course.technologies]
    .join(" ")
    .toLowerCase();
  return haystack.includes(query.trim().toLowerCase());
}

function matchesFilters(course, filters) {
  if (filters.category !== "all" && course.categorySlug !== filters.category) return false;
  if (filters.levels.length > 0 && !filters.levels.includes(course.level)) return false;
  if (filters.modes.length > 0 && !filters.modes.some((mode) => course.modes.includes(mode))) return false;
  if (filters.durationBands.length > 0 && !filters.durationBands.includes(course.durationBand)) return false;
  return true;
}

function sortCourses(courses, sort) {
  const sorted = [...courses];
  if (sort === "az") return sorted.sort((a, b) => a.title.localeCompare(b.title));
  if (sort === "newest") return sorted.sort((a, b) => b.order - a.order);
  return sorted; // "recommended" — authored order
}

function CategoryButton({ active, code, label, count, onClick, disabled = false }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      disabled={disabled}
      onClick={onClick}
      title={disabled ? "Courses in this category are coming soon" : undefined}
      className={cn(
        "group relative flex shrink-0 items-center gap-3 rounded-2xl px-3 py-2.5 text-left text-sm transition-all duration-200 lg:w-full",
        disabled && "cursor-not-allowed opacity-50",
        active
          ? "bg-white shadow-card ring-1 ring-primary/20"
          : !disabled && "hover:bg-white/70"
      )}
    >
      {active && (
        <span
          aria-hidden="true"
          className="absolute inset-y-2 left-0 hidden w-1 rounded-full bg-linear-to-b from-primary to-secondary lg:block"
        />
      )}
      <span
        className={cn(
          "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-xs font-bold transition-colors",
          active
            ? "bg-linear-to-br from-primary to-secondary text-white"
            : "bg-surface text-primary group-hover:bg-primary/10"
        )}
      >
        {code}
      </span>
      <span className={cn("whitespace-nowrap font-medium lg:flex-1 lg:whitespace-normal", active ? "text-dark" : "text-text")}>
        {label}
      </span>
      <span
        className={cn(
          "hidden rounded-full px-2 py-0.5 text-xs font-semibold lg:inline",
          active ? "bg-primary/10 text-primary" : "text-muted"
        )}
      >
        {disabled ? "Soon" : count}
      </span>
    </button>
  );
}

export function CourseExplorer({ courses, categories, initialCategory }) {
  const [query, setQuery] = useState("");
  const [filters, setFilters] = useState(() =>
    initialCategory &&
    categories.some(
      (category) =>
        category.slug === initialCategory && courses.some((course) => course.categorySlug === category.slug)
    )
      ? { ...EMPTY_FILTERS, category: initialCategory }
      : EMPTY_FILTERS
  );
  const [sort, setSort] = useState("recommended");
  const [filtersOpen, setFiltersOpen] = useState(false);

  const results = useMemo(() => {
    const filtered = courses.filter((course) => matchesQuery(course, query) && matchesFilters(course, filters));
    return sortCourses(filtered, sort);
  }, [courses, query, filters, sort]);

  const categoryCounts = useMemo(() => {
    const counts = {};
    for (const course of courses) counts[course.categorySlug] = (counts[course.categorySlug] || 0) + 1;
    return counts;
  }, [courses]);

  const refinements = [
    ...filters.levels.map((value) => ({ key: "levels", value })),
    ...filters.modes.map((value) => ({ key: "modes", value })),
    ...filters.durationBands.map((value) => ({ key: "durationBands", value })),
  ];
  const activeFilterCount = refinements.length;
  const hasAnyConstraint = activeFilterCount > 0 || filters.category !== "all" || query.trim() !== "";

  const clearFilters = () => setFilters(EMPTY_FILTERS);
  const removeRefinement = ({ key, value }) =>
    setFilters({ ...filters, [key]: filters[key].filter((item) => item !== value) });
  const isDefaultView = !hasAnyConstraint && sort === "recommended";

  return (
    <div className="relative isolate overflow-hidden bg-surface">
      {/* soft pastel glow */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10">
        <div className="animate-drift absolute -left-24 -top-24 h-96 w-96 rounded-full bg-primary/15 blur-[100px]" />
        <div className="animate-drift-slow absolute -right-20 top-32 h-96 w-96 rounded-full bg-secondary/15 blur-[100px]" />
        <div className="animate-drift absolute bottom-0 left-1/3 h-72 w-72 rounded-full bg-primary/10 blur-[100px]" />
      </div>

      <Container className="py-10 sm:py-12">
        <header className="animate-fade-up-in flex flex-col gap-2">
          <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-primary">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping-soft absolute inline-flex h-full w-full rounded-full bg-primary" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
            </span>
            {courses.length} programs · Mentor-led
          </p>
          <h1 className="text-3xl font-semibold tracking-tight text-dark sm:text-4xl">
            Find the course that{" "}
            <span className="bg-linear-to-r from-primary to-secondary bg-clip-text text-transparent">
              fits your career
            </span>
          </h1>
        </header>

        <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-[272px_1fr] lg:gap-8">
          {/* Categories */}
          <nav
            aria-label="Course categories"
            className="animate-fade-up-in min-w-0 lg:sticky lg:top-24 lg:self-start"
            style={{ animationDelay: "80ms" }}
          >
            <p className="mb-3 hidden px-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted lg:block">
              Categories
            </p>
            <div className="-mx-6 flex gap-2 overflow-x-auto px-6 pb-1 [scrollbar-width:none] sm:-mx-8 sm:px-8 lg:mx-0 lg:flex-col lg:gap-1 lg:overflow-visible lg:rounded-3xl lg:border lg:border-border lg:bg-surface/70 lg:p-2 lg:pb-2 lg:backdrop-blur [&::-webkit-scrollbar]:hidden">
              <CategoryButton
                active={filters.category === "all"}
                code="∗"
                label="All Courses"
                count={courses.length}
                onClick={() => setFilters({ ...filters, category: "all" })}
              />
              {categories.map((category) => (
                <CategoryButton
                  key={category.slug}
                  active={filters.category === category.slug}
                  code={category.code}
                  label={category.title}
                  count={categoryCounts[category.slug] || 0}
                  disabled={!categoryCounts[category.slug]}
                  onClick={() => setFilters({ ...filters, category: category.slug })}
                />
              ))}
            </div>
          </nav>

          {/* Results */}
          <div className="min-w-0">
            <div
              className="animate-fade-up-in flex flex-col gap-3 sm:flex-row"
              style={{ animationDelay: "140ms" }}
            >
              <div className="flex-1">
                <CourseSearch value={query} onChange={setQuery} />
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  aria-expanded={filtersOpen}
                  onClick={() => setFiltersOpen((open) => !open)}
                  className={cn(
                    "inline-flex h-12 flex-1 items-center justify-center gap-2 rounded-2xl border px-5 text-sm font-medium shadow-soft transition-colors sm:flex-none",
                    filtersOpen
                      ? "border-dark bg-dark text-white"
                      : "border-border bg-white text-dark hover:border-primary/40 hover:text-primary"
                  )}
                >
                  <svg aria-hidden="true" viewBox="0 0 16 16" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
                    <path d="M2 4h12M4.5 8h7M7 12h2" />
                  </svg>
                  Filters
                  {activeFilterCount > 0 && (
                    <span className="rounded-full bg-primary px-2 text-xs text-white">{activeFilterCount}</span>
                  )}
                </button>
                <select
                  id="course-sort"
                  aria-label="Sort courses"
                  value={sort}
                  onChange={(event) => setSort(event.target.value)}
                  className="h-12 flex-1 rounded-2xl border border-border bg-white px-4 text-sm text-dark shadow-soft focus-visible:outline-2 focus-visible:outline-primary sm:flex-none"
                >
                  {SORT_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      Sort: {option.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {filtersOpen && (
              <div className="animate-fade-up-in mt-3 rounded-3xl border border-border bg-white p-5 shadow-card sm:p-6">
                <CourseFilters filters={filters} onChange={setFilters} onClear={clearFilters} />
              </div>
            )}

            <div className="mt-5 flex flex-wrap items-center gap-2" aria-live="polite">
              <p className="mr-1 text-sm text-muted">
                <span className="font-semibold text-dark">{results.length}</span>{" "}
                {results.length === 1 ? "course" : "courses"}
              </p>
              {refinements.map((item) => (
                <button
                  key={`${item.key}-${item.value}`}
                  type="button"
                  onClick={() => removeRefinement(item)}
                  aria-label={`Remove filter ${item.value}`}
                  className="animate-fade-up-in inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary transition-colors hover:bg-primary/20"
                >
                  {item.value}
                  <span aria-hidden="true">×</span>
                </button>
              ))}
              {hasAnyConstraint && (
                <button
                  type="button"
                  onClick={() => {
                    clearFilters();
                    setQuery("");
                  }}
                  className="text-xs font-medium text-muted underline-offset-4 hover:text-primary hover:underline"
                >
                  Clear all
                </button>
              )}
            </div>

            <div className="mt-4">
              <CourseGrid courses={results} spotlightFirst={isDefaultView} />
            </div>
          </div>
        </div>
      </Container>
    </div>
  );
}
