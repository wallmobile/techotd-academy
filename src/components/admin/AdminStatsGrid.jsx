import { cn } from "@/lib/utils";

// Number color per cell, cycled by position unless a stat names its own
// `tone` (literal class names so Tailwind sees them).
const TONES = {
  primary: "from-primary to-secondary",
  secondary: "from-secondary to-pink-500",
  success: "from-success to-teal-500",
  warning: "from-warning to-orange-500",
  danger: "from-danger to-pink-500",
  sky: "from-sky-500 to-primary",
};
const CYCLE = ["primary", "secondary", "success", "warning", "sky", "danger"];

const COLS = {
  2: "sm:grid-cols-2",
  3: "sm:grid-cols-3",
  4: "sm:grid-cols-2 xl:grid-cols-4",
  5: "sm:grid-cols-3 xl:grid-cols-5",
  6: "sm:grid-cols-3 xl:grid-cols-6",
};

/**
 * The public site's stats strip ("8 Courses | 8 Learning Paths | …"): one
 * card split by hairlines, each figure in gradient type above its label.
 * `stats` = [{ label, value, hint?, tone? }] — values come from real queries.
 * The label stays first in the markup (dt → dd) and is only moved below the
 * figure visually.
 */
export function AdminStatsGrid({ stats }) {
  // Each cell draws its own left/top hairline; the -1px offset hides the
  // outer ones, so an incomplete last row stays clean.
  return (
    <div data-slot="card" className="overflow-hidden rounded-lg border border-border bg-white shadow-card">
      <dl className={cn("-ml-px -mt-px grid grid-cols-2", COLS[stats.length] || "sm:grid-cols-3 xl:grid-cols-5")}>
        {stats.map((stat, i) => (
          <div
            key={stat.label}
            className="flex flex-col gap-1 px-5 py-4 shadow-[inset_1px_0_0_var(--brand-border),inset_0_1px_0_var(--brand-border)] transition-colors hover:bg-surface/60"
          >
            <dt className="order-2 text-xs font-medium text-muted">{stat.label}</dt>
            <dd
              className={cn(
                "order-1 truncate bg-linear-to-r bg-clip-text text-2xl font-extrabold tracking-tight text-transparent",
                TONES[stat.tone] || TONES[CYCLE[i % CYCLE.length]]
              )}
            >
              {stat.value}
            </dd>
            {stat.hint && <dd className="order-3 text-[11px] text-muted/80">{stat.hint}</dd>}
          </div>
        ))}
      </dl>
    </div>
  );
}
