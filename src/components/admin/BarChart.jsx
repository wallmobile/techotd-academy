import { Card } from "@/components/ui/Card";

const dayLabel = (day) => new Date(`${day}T00:00:00Z`).toLocaleDateString("en-IN", { day: "numeric", month: "short", timeZone: "UTC" });

/**
 * Minimal daily bar chart (no chart library). `series` = [{ day, value }].
 * Rendered only when there is data; an all-zero series gets an empty state
 * instead of a flat, meaningless chart. Bars are decorative — the figure's
 * label states the total and peak so the information isn't visual-only.
 */
export function BarChart({ title, series, unit = "" }) {
  const total = series.reduce((sum, p) => sum + p.value, 0);
  if (series.length === 0 || total === 0) {
    return (
      <Card>
        <h3 className="text-sm font-semibold text-dark">{title}</h3>
        <div className="mt-4 flex h-24 items-center justify-center rounded-sm border border-dashed border-border bg-surface/50 text-sm text-muted">
          No data in this period.
        </div>
      </Card>
    );
  }
  const peak = series.reduce((best, p) => (p.value > best.value ? p : best), series[0]);
  const label = `${title}: ${total}${unit} in total, peaking at ${peak.value}${unit} on ${peak.day}`;
  // Even top so the middle gridline is a whole number too.
  const top = Math.max(2, Math.ceil(peak.value / 2) * 2);
  const mid = series[Math.floor((series.length - 1) / 2)];

  return (
    <Card>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <h3 className="text-sm font-semibold text-dark">{title}</h3>
        <div className="flex flex-wrap gap-2 text-xs">
          <span className="rounded-full bg-primary/10 px-2.5 py-1 font-medium text-primary">
            {total}
            {unit} total
          </span>
          <span className="rounded-full bg-surface px-2.5 py-1 text-muted ring-1 ring-border">
            peak {peak.value}
            {unit} on {dayLabel(peak.day)}
          </span>
        </div>
      </div>
      <div className="mt-5 flex gap-3">
        <div aria-hidden="true" className="flex h-36 flex-none flex-col justify-between text-right text-[10px] leading-none text-muted">
          <span>{top}</span>
          <span>{top / 2}</span>
          <span>0</span>
        </div>
        <div className="min-w-0 flex-1">
          <div role="img" aria-label={label} className="relative h-36">
            {[0, 50, 100].map((y) => (
              <div key={y} aria-hidden="true" className={`absolute inset-x-0 border-t ${y === 100 ? "border-border" : "border-dashed border-border/70"}`} style={{ top: `${y}%` }} />
            ))}
            <div className="absolute inset-0 flex items-end gap-[3px]">
              {series.map((p) => (
                <div key={p.day} title={`${dayLabel(p.day)}: ${p.value}${unit}`} className="group flex h-full min-w-px flex-1 items-end justify-center">
                  <div
                    className="w-full max-w-6 rounded-t-[4px] bg-linear-to-t from-primary to-secondary/80 opacity-85 transition-opacity group-hover:opacity-100"
                    style={{ height: `${p.value > 0 ? Math.max(3, (p.value / top) * 100) : 0}%` }}
                  />
                </div>
              ))}
            </div>
          </div>
          <div aria-hidden="true" className="mt-2 flex justify-between text-[10px] text-muted">
            <span>{dayLabel(series[0].day)}</span>
            <span>{dayLabel(mid.day)}</span>
            <span>{dayLabel(series[series.length - 1].day)}</span>
          </div>
        </div>
      </div>
    </Card>
  );
}
