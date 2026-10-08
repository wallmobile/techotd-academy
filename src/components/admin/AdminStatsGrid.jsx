import { Card } from "@/components/ui/Card";

/** Grid of label/value stat cards. `stats` = [{ label, value, hint? }] — values come from real queries. */
export function AdminStatsGrid({ stats }) {
  return (
    <dl className={`grid grid-cols-1 gap-4 sm:grid-cols-2 ${stats.length === 6 ? "xl:grid-cols-6" : "xl:grid-cols-5"}`}>
      {stats.map((stat) => (
        <Card key={stat.label} className="flex flex-col gap-1 p-5">
          <dt className="text-xs font-medium uppercase tracking-wide text-muted">{stat.label}</dt>
          <dd className="text-2xl font-semibold tracking-tight text-dark">{stat.value}</dd>
          {stat.hint && <dd className="text-xs text-muted">{stat.hint}</dd>}
        </Card>
      ))}
    </dl>
  );
}
