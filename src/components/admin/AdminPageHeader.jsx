import Link from "next/link";

/** Page heading block: optional back link, h1, description and a right-aligned action slot. */
export function AdminPageHeader({ title, description, backHref, backLabel, children }) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        {backHref && (
          <Link href={backHref} className="text-xs font-medium text-primary hover:text-primary-hover">
            ← {backLabel}
          </Link>
        )}
        <h1 className="mt-1 break-words text-xl font-semibold tracking-tight text-dark">{title}</h1>
        {description && <p className="mt-1 text-sm text-muted">{description}</p>}
      </div>
      {children && <div className="flex-none">{children}</div>}
    </div>
  );
}
