"use client";

export function BatchSearch({ value, onChange }) {
  return (
    <div className="relative">
      <svg
        aria-hidden="true"
        width="18"
        height="18"
        viewBox="0 0 18 18"
        fill="none"
        className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-primary"
      >
        <circle cx="8" cy="8" r="5.5" stroke="currentColor" strokeWidth="1.6" />
        <path d="M16 16L12.5 12.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      </svg>
      <input
        type="search"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder="Search by course, mode or location..."
        aria-label="Search batches"
        className="h-12 w-full rounded-2xl border border-border bg-white pl-11 pr-4 text-sm text-text shadow-soft transition-shadow placeholder:text-muted focus:border-primary/50 focus:shadow-card"
      />
    </div>
  );
}
