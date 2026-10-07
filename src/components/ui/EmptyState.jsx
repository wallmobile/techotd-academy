import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

/**
 * Shared empty-state surface for any page/section that can legitimately
 * have zero records (no assignments published, no attendance yet, no
 * batch assigned, …). One consistent visual treatment — icon + title +
 * description + optional action — instead of every page inventing its
 * own single line of muted text. Never used to hide a real error; error
 * states have their own treatment at each call site.
 */
export function EmptyState({ title, description, actionLabel, actionHref, className }) {
  return (
    <Card className={className}>
      <div className="flex flex-col items-center gap-3 py-6 text-center">
        <div
          aria-hidden="true"
          className="flex h-12 w-12 items-center justify-center rounded-full bg-surface text-muted"
        >
          <svg width="22" height="22" viewBox="0 0 20 20" fill="none">
            <path
              d="M3 8.5L5.5 3h9L17 8.5M3 8.5v6.5a1.5 1.5 0 001.5 1.5h11a1.5 1.5 0 001.5-1.5V8.5M3 8.5h4.2a.5.5 0 01.47.33l.5 1.34a.5.5 0 00.47.33h2.72a.5.5 0 00.47-.33l.5-1.34a.5.5 0 01.47-.33H17"
              stroke="currentColor"
              strokeWidth="1.4"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
        <div className="flex flex-col gap-1">
          <p role="status" className="text-sm font-semibold text-dark">
            {title}
          </p>
          {description && <p className="max-w-sm text-sm text-muted">{description}</p>}
        </div>
        {actionLabel && actionHref && (
          <Button href={actionHref} size="sm" variant="outline" className="mt-1">
            {actionLabel}
          </Button>
        )}
      </div>
    </Card>
  );
}
