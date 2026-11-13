import Link from "next/link";

const GRADIENT_TEXT = "bg-linear-to-r from-primary to-secondary bg-clip-text text-transparent";

// Like the public site's section titles ("Popular Courses"): one word carries
// the brand gradient. Top-level pages highlight the last word; detail pages
// (with a back link) show record names, so they stay plain.
function Title({ text, highlight }) {
  if (!highlight || typeof text !== "string") return text;
  const words = text.trim().split(/\s+/);
  const last = words.pop();
  return (
    <>
      {words.length > 0 && `${words.join(" ")} `}
      <span className={GRADIENT_TEXT}>{last}</span>
    </>
  );
}

/** Page heading block: optional back link or eyebrow pill, h1, description and a right-aligned action slot. */
export function AdminPageHeader({ title, description, eyebrow, backHref, backLabel, children }) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        {backHref ? (
          <Link
            href={backHref}
            className="mb-3 inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-white py-1 pl-2 pr-3.5 text-xs font-semibold text-primary shadow-soft transition-colors hover:border-primary/50 hover:bg-primary/5"
          >
            <svg width="14" height="14" viewBox="0 0 20 20" fill="none" aria-hidden="true">
              <path d="M12 5l-5 5 5 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            {backLabel}
          </Link>
        ) : (
          eyebrow && (
            <span className="mb-3 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-white/80 px-3.5 py-1 text-[11px] font-bold uppercase tracking-[0.14em] text-primary shadow-soft">
              <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-linear-to-br from-primary to-secondary" />
              {eyebrow}
            </span>
          )
        )}
        <h1 className="break-words text-[1.75rem] font-extrabold leading-tight tracking-tight text-dark">
          <Title text={title} highlight={!backHref} />
        </h1>
        {description && <p className="mt-1.5 max-w-3xl text-sm leading-relaxed text-muted">{description}</p>}
      </div>
      {children && <div className="flex flex-none flex-wrap items-center gap-2.5">{children}</div>}
    </div>
  );
}
