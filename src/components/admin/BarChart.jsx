import { Card } from "@/components/ui/Card";

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
        <p className="mt-3 text-sm text-muted">No data in this period.</p>
      </Card>
    );
  }
  const peak = series.reduce((best, p) => (p.value > best.value ? p : best), series[0]);
  const label = `${title}: ${total}${unit} in total, peaking at ${peak.value}${unit} on ${peak.day}`;

  return (
    <Card>
      <h3 className="text-sm font-semibold text-dark">{title}</h3>
      <p className="mt-1 text-xs text-muted">
        {total}
        {unit} total · peak {peak.value}
        {unit} on {peak.day}
      </p>
      <div role="img" aria-label={label} className="mt-4 flex h-32 items-end gap-px">
        {series.map((p) => (
          <div
            key={p.day}
            title={`${p.day}: ${p.value}${unit}`}
            className="min-w-px flex-1 rounded-t-sm bg-primary/80"
            style={{ height: `${Math.max(p.value > 0 ? 4 : 0, (p.value / peak.value) * 100)}%` }}
          />
        ))}
      </div>
      <div className="mt-1 flex justify-between text-[10px] text-muted">
        <span>{series[0].day}</span>
        <span>{series[series.length - 1].day}</span>
      </div>
    </Card>
  );
}
