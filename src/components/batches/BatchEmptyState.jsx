export function BatchEmptyState() {
  return (
    <div className="animate-fade-up-in flex flex-col items-center gap-2 rounded-3xl border border-dashed border-border bg-white/70 py-20 text-center">
      <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary" aria-hidden="true">
        <svg viewBox="0 0 20 20" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="4.5" width="14" height="12" rx="2" />
          <path d="M3 8.5h14M7 3v3M13 3v3" />
        </svg>
      </span>
      <p className="mt-2 text-lg font-semibold text-dark">No batches match that.</p>
      <p className="text-sm text-muted">Try another keyword or reset your filters.</p>
    </div>
  );
}
