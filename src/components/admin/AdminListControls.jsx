import Link from "next/link";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import { ROLES, ROLE_LABELS } from "@/lib/auth/roles";

const SORT_LABELS = { newest: "Newest first", oldest: "Oldest first", name: "Name (A–Z)" };

/**
 * Search/filter/sort bar as a plain GET <form>: it works without client
 * JS, and the server re-parses and sanitizes every value (see
 * parseListParams). Submitting resets to page 1.
 */
export function AdminSearchForm({ basePath, params, searchLabel, showRoleFilter = false }) {
  const hasFilters = params.q || params.role || params.sort !== "newest";
  return (
    <form method="get" action={basePath} role="search" className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-[2fr_1fr_1fr_auto] lg:items-end">
      <Input label="Search" id="q" name="q" type="search" defaultValue={params.q} placeholder={searchLabel} maxLength={100} />
      {showRoleFilter ? (
        <Select label="Role" id="role" name="role" defaultValue={params.role}>
          <option value="">All roles</option>
          {ROLES.map((role) => (
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
      <div className="flex items-center gap-3">
        <Button type="submit">Apply</Button>
        {hasFilters && (
          <Link href={basePath} className="text-sm font-medium text-primary hover:text-primary-hover">
            Reset
          </Link>
        )}
      </div>
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

/** Previous/Next pager that preserves the active search, role filter and sort. */
export function AdminPagination({ basePath, params, page, totalPages, total, pageSize }) {
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);
  const linkClass =
    "inline-flex h-9 items-center rounded-button border border-border bg-white px-3.5 text-sm font-medium text-text hover:border-primary hover:text-primary";
  const disabledClass =
    "inline-flex h-9 items-center rounded-button border border-border bg-white px-3.5 text-sm font-medium text-muted/60";

  return (
    <nav aria-label="Pagination" className="flex flex-wrap items-center justify-between gap-3">
      <p className="text-sm text-muted" role="status">
        Showing {from}–{to} of {total}
      </p>
      <div className="flex items-center gap-2">
        {page > 1 ? (
          <Link href={hrefFor(basePath, params, page - 1)} rel="prev" className={linkClass}>
            Previous
          </Link>
        ) : (
          <span aria-disabled="true" className={disabledClass}>
            Previous
          </span>
        )}
        <span className="text-sm text-muted">
          Page {page} of {totalPages}
        </span>
        {page < totalPages ? (
          <Link href={hrefFor(basePath, params, page + 1)} rel="next" className={linkClass}>
            Next
          </Link>
        ) : (
          <span aria-disabled="true" className={disabledClass}>
            Next
          </span>
        )}
      </div>
    </nav>
  );
}
