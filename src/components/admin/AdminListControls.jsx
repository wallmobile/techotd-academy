import Link from "next/link";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { ROLES, ROLE_LABELS } from "@/lib/auth/roles";

const SORT_LABELS = { newest: "Newest first", oldest: "Oldest first", name: "Name (A–Z)" };

// Surface for every admin search/filter form (the shared ones here and the
// page-specific ones), so all list pages share one filter toolbar look.
export const FILTER_BAR_CLASS =
  "rounded-lg border border-white bg-white/80 p-4 shadow-[0_1px_2px_rgb(15_23_42/0.04),0_10px_30px_-18px_rgb(37_99_235/0.3)] backdrop-blur sm:p-5";
// The Apply / Reset pair at the end of a filter bar.
export function FilterActions({ resetHref, showReset }) {
  return (
    <div className="flex items-center gap-2">
      <button
        type="submit"
        className="inline-flex h-11 items-center gap-1.5 rounded-xl bg-primary px-5 text-sm font-semibold text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
      >
        <svg width="16" height="16" viewBox="0 0 20 20" fill="none" aria-hidden="true">
          <path d="M3 5h14M6 10h8M8.5 15h3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
        Apply
      </button>
      {showReset && (
        <Link
          href={resetHref}
          className="inline-flex h-11 items-center rounded-xl px-3 text-sm font-medium text-muted transition-colors hover:bg-surface hover:text-primary"
        >
          Reset
        </Link>
      )}
    </div>
  );
}

/**
 * Search/filter/sort bar as a plain GET <form>: it works without client
 * JS, and the server re-parses and sanitizes every value (see
 * parseListParams). Submitting resets to page 1.
 */
export function AdminSearchForm({ basePath, params, searchLabel, showRoleFilter = false, roles = ROLES }) {
  const hasFilters = params.q || params.role || params.sort !== "newest";
  return (
    <form method="get" action={basePath} role="search" className={`${FILTER_BAR_CLASS} grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-[2fr_1fr_1fr_auto] lg:items-end`}>
      <Input label="Search" id="q" name="q" type="search" defaultValue={params.q} placeholder={searchLabel} maxLength={100} />
      {showRoleFilter ? (
        <Select label="Role" id="role" name="role" defaultValue={params.role}>
          <option value="">All roles</option>
          {roles.map((role) => (
            <option key={role} value={role}>
              {ROLE_LABELS[role]}
            </option>
          ))}
        </Select>
      ) : (
        <div className="hidden lg:block" />
      )}
      <Select label="Sort" id="sort" name="sort" defaultValue={params.sort}>
        {Object.entries(SORT_LABELS).map(([value, label]) => (
          <option key={value} value={value}>
            {label}
          </option>
        ))}
      </Select>
      <FilterActions resetHref={basePath} showReset={Boolean(hasFilters)} />
    </form>
  );
}

function hrefFor(basePath, params, page) {
  const search = new URLSearchParams();
  // Preserve every active filter (q, role, status, course, …); page is set below.
  for (const [key, value] of Object.entries(params)) {
    if (key === 'page' || !value) continue;
    if (key === 'sort' && value === 'newest') continue;
    search.set(key, String(value));
  }
  if (page > 1) search.set('page', String(page));
  const qs = search.toString();
  return qs ? `${basePath}?${qs}` : basePath;
}

const chevron = (d) => (
  <svg width="16" height="16" viewBox="0 0 20 20" fill="none" aria-hidden="true">
    <path d={d} stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

/** Previous/Next pager that preserves the active search, role filter and sort. */
export function AdminPagination({ basePath, params, page, totalPages, total, pageSize }) {
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);
  const base = "inline-flex h-9 items-center gap-1 rounded-full border px-3.5 text-sm font-medium transition-colors";
  const linkClass = `${base} border-border bg-white text-text shadow-soft hover:border-primary/50 hover:text-primary`;
  const disabledClass = `${base} border-border/70 bg-white/60 text-muted/50`;

  return (
    <nav aria-label="Pagination" className="flex flex-wrap items-center justify-between gap-3">
      <p className="text-sm text-muted" role="status">
        Showing <span className="font-semibold text-dark">{from}–{to}</span> of <span className="font-semibold text-dark">{total}</span>
      </p>
      <div className="flex items-center gap-2">
        {page > 1 ? (
          <Link href={hrefFor(basePath, params, page - 1)} rel="prev" className={linkClass}>
            {chevron("M12 5l-5 5 5 5")}
            Previous
          </Link>
        ) : (
          <span aria-disabled="true" className={disabledClass}>
            {chevron("M12 5l-5 5 5 5")}
            Previous
          </span>
        )}
        <span className="rounded-full bg-white px-3 py-1 text-xs font-medium text-muted ring-1 ring-border">
          Page {page} of {totalPages}
        </span>
        {page < totalPages ? (
          <Link href={hrefFor(basePath, params, page + 1)} rel="next" className={linkClass}>
            Next
            {chevron("M8 5l5 5-5 5")}
          </Link>
        ) : (
          <span aria-disabled="true" className={disabledClass}>
            Next
            {chevron("M8 5l5 5-5 5")}
          </span>
        )}
      </div>
    </nav>
  );
}
