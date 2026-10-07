"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Container } from "@/components/layout/Container";
import { Gradient } from "@/components/training/icons";
import { cn } from "@/lib/utils";

/** Searchable plain-language glossary of every technology taught in the courses. */
export function TechGlossary({ terms }) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("All");

  const categories = useMemo(() => ["All", ...new Set(terms.map((term) => term.category))], [terms]);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    return terms.filter((term) => {
      if (category !== "All" && term.category !== category) return false;
      if (!q) return true;
      return `${term.name} ${term.description}`.toLowerCase().includes(q);
    });
  }, [terms, query, category]);

  return (
    <section id="glossary" className="scroll-mt-28 bg-surface py-12 sm:py-14 lg:py-20">
      <Container>
        <div className="max-w-2xl">
          <p className="text-sm font-semibold uppercase tracking-wide text-primary">Tech glossary</p>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight text-dark sm:text-4xl">
            Tech terms, <Gradient>in plain language</Gradient>
          </h2>
          <p className="mt-3 text-base text-muted">
            New to the names? Look up what each technology is and which courses use it.
          </p>
        </div>

        <div className="mt-8 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div
            className="flex max-w-full gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden lg:flex-wrap lg:overflow-visible"
            role="group"
            aria-label="Filter terms by area"
          >
            {categories.map((item) => (
              <button
                key={item}
                type="button"
                aria-pressed={category === item}
                onClick={() => setCategory(item)}
                className={cn(
                  "shrink-0 whitespace-nowrap rounded-full border px-4 py-2 text-sm font-medium transition-all duration-200",
                  category === item
                    ? "border-transparent bg-dark text-white shadow-soft"
                    : "border-border bg-white text-text hover:border-primary/40 hover:text-primary"
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
              placeholder="Search a term..."
              aria-label="Search the glossary"
              className="h-11 w-full rounded-full border border-border bg-white pl-10 pr-4 text-sm text-text placeholder:text-muted focus:border-primary/50"
            />
          </div>
        </div>

        <p className="mt-6 text-sm text-muted" aria-live="polite">
          <span className="font-semibold text-dark">{results.length}</span> {results.length === 1 ? "term" : "terms"}
        </p>

        {results.length === 0 ? (
          <div className="animate-fade-up-in mt-4 rounded-3xl border border-dashed border-border bg-white/70 py-14 text-center">
            <p className="text-lg font-semibold text-dark">No terms match that.</p>
            <p className="mt-1 text-sm text-muted">Try another word or switch the area filter.</p>
          </div>
        ) : (
          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {results.map((term, index) => (
              <article
                key={term.name}
                className="animate-fade-up-in group flex flex-col rounded-2xl border border-border bg-white p-5 shadow-soft transition-all duration-300 hover:-translate-y-1 hover:border-primary/30 hover:shadow-elevated"
                style={{ animationDelay: `${Math.min(index, 9) * 40}ms` }}
              >
                <div className="flex items-center justify-between gap-3">
                  <h3 className="text-base font-semibold text-dark">{term.name}</h3>
                  <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-primary">
                    {term.category}
                  </span>
                </div>
                <p className="mt-2 text-sm leading-relaxed text-muted">{term.description}</p>
                {term.courses.length > 0 && (
                  <div className="mt-auto flex flex-wrap items-center gap-1.5 pt-4">
                    <span className="text-[11px] font-medium text-muted">Used in</span>
                    {term.courses.map((course) => (
                      <Link
                        key={course.slug}
                        href={`/courses/${course.slug}`}
                        title={course.title}
                        aria-label={`Used in ${course.title}`}
                        className="rounded-full bg-surface px-2 py-0.5 text-[11px] font-semibold text-text transition-colors hover:bg-primary hover:text-white"
                      >
                        {course.initials}
                      </Link>
                    ))}
                  </div>
                )}
              </article>
            ))}
          </div>
        )}
      </Container>
    </section>
  );
}
