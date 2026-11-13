import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { NavIcon } from "@/components/student/NavIcon";
import { cn } from "@/lib/utils";

// Building blocks for the Admin dashboard and the Super Admin overview.
// Server components, no chart library: charts are plain SVG/HTML drawn from
// real series, and every chart also states its numbers in text so nothing
// is visual-only.

// Literal class names per tone (Tailwind only sees complete strings).
const TONES = {
  primary: { soft: "bg-primary/10 text-primary", solid: "bg-primary", text: "text-primary" },
  secondary: { soft: "bg-secondary/10 text-secondary", solid: "bg-secondary", text: "text-secondary" },
  success: { soft: "bg-success/10 text-success", solid: "bg-success", text: "text-success" },
  warning: { soft: "bg-warning/10 text-warning", solid: "bg-warning", text: "text-warning" },
  danger: { soft: "bg-danger/10 text-danger", solid: "bg-danger", text: "text-danger" },
  sky: { soft: "bg-sky-500/10 text-sky-600", solid: "bg-sky-500", text: "text-sky-600" },
  teal: { soft: "bg-teal-500/10 text-teal-600", solid: "bg-teal-500", text: "text-teal-600" },
  pink: { soft: "bg-pink-500/10 text-pink-600", solid: "bg-pink-500", text: "text-pink-600" },
  slate: { soft: "bg-slate-400/10 text-slate-500", solid: "bg-slate-300", text: "text-slate-500" },
};

const tone = (name) => TONES[name] || TONES.primary;

// One color per role, shared by the role charts and avatars.
export const ROLE_TONES = {
  SUPER_ADMIN: "secondary",
  ADMIN: "primary",
  COUNSELLOR: "sky",
  ACCOUNTANT: "warning",
  CONTENT_MANAGER: "pink",
  PLACEMENT_MANAGER: "teal",
  TRAINER: "success",
  STUDENT: "slate",
};

const TIME_ZONE = "Asia/Kolkata";

function greeting(now) {
  const hour = Number(new Intl.DateTimeFormat("en-GB", { hour: "numeric", hour12: false, timeZone: TIME_ZONE }).format(now));
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

export function initials(name = "") {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

const GLANCE_ICONS = {
  crm: "M3 4h14v9H8l-4 3v-3H3V4z",
  batches: "M3 6h14M3 10h14M3 14h9",
  payments: "M3 6h14v9H3V6zm0 3h14M6 12h2",
  students: "M10 10a3 3 0 100-6 3 3 0 000 6zM4 17c0-3.3 2.7-6 6-6s6 2.7 6 6",
  users: "M7.5 9a2.5 2.5 0 100-5 2.5 2.5 0 000 5zM2.5 16c0-2.8 2.2-5 5-5s5 2.2 5 5M13 4.5a2.3 2.3 0 010 4.5M14 11.3c1.9.5 3.5 2.2 3.5 4.7",
  roles: "M10 2.5l6 2.2v4.6c0 3.6-2.5 6.4-6 7.7-3.5-1.3-6-4.1-6-7.7V4.7l6-2.2zM7.5 10l2 2 3.5-4",
  profile: "M10 10a3 3 0 100-6 3 3 0 000 6zM4 17c0-3.3 2.7-6 6-6s6 2.7 6 6",
  attendance: "M4 10l4 4 8-9",
};

/**
 * Dashboard opener modelled on the public site's hero: a pill, a big
 * extrabold title with one gradient word, the description and CTA buttons
 * on the left; on the right a navy card with floating "glass" chips (like
 * the hero's skill chips) that hold today's key figures. `glance` =
 * [{ label, value, icon, progress? (0–1) }].
 */
export function DashboardHero({ name, title, description, actions = [], glance = [] }) {
  const now = new Date();
  const today = new Intl.DateTimeFormat("en-IN", { weekday: "long", day: "numeric", month: "long", timeZone: TIME_ZONE }).format(now);
  const words = title.split(" ");
  const last = words.pop();

  return (
    <section className="relative isolate overflow-hidden rounded-[28px] border border-white bg-white/70 p-6 shadow-[0_1px_2px_rgb(15_23_42/0.04),0_24px_48px_-28px_rgb(37_99_235/0.45)] backdrop-blur sm:p-8">
      <div aria-hidden="true" className="admin-grid-bg pointer-events-none absolute inset-0 -z-10" />
      <div aria-hidden="true" className="pointer-events-none absolute -left-20 -top-24 -z-10 h-72 w-72 rounded-full bg-primary/15 blur-3xl" />
      <div aria-hidden="true" className="pointer-events-none absolute -bottom-28 right-1/3 -z-10 h-72 w-72 rounded-full bg-secondary/15 blur-3xl" />

      <div className="grid items-center gap-8 lg:grid-cols-[1.15fr_1fr]">
        <div className="min-w-0">
          <span className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-white/80 px-4 py-1.5 text-xs font-semibold text-primary shadow-soft">
            <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-linear-to-br from-primary to-secondary" />
            {greeting(now)}, {name.split(" ")[0]} · {today}
          </span>
          <h1 className="mt-4 text-3xl font-extrabold leading-tight tracking-tight text-dark sm:text-[2.6rem]">
            {words.length > 0 && `${words.join(" ")} `}
            <span className="bg-linear-to-r from-primary to-secondary bg-clip-text text-transparent">{last}</span>
          </h1>
          {description && <p className="mt-3 max-w-lg text-base leading-relaxed text-muted">{description}</p>}
          {actions.length > 0 && (
            <div className="mt-6 flex flex-wrap gap-3">
              {actions.map((action, i) => (
                <Link
                  key={action.href}
                  href={action.href}
                  className={cn(
                    "inline-flex h-11 items-center gap-2 rounded-xl px-5 text-sm font-semibold transition-all",
                    "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary",
                    i === 0
                      ? "bg-linear-to-r from-primary to-secondary text-white shadow-[0_10px_24px_-10px_rgb(37_99_235/0.8)] hover:-translate-y-0.5"
                      : "border border-primary/25 bg-white text-primary hover:border-primary hover:bg-primary/5"
                  )}
                >
                  {action.icon && <NavIcon name={action.icon} className="flex-none" />}
                  {action.label}
                  {i === 0 && <span aria-hidden="true">→</span>}
                </Link>
              ))}
            </div>
          )}
        </div>

        {glance.length > 0 && (
          <div className="relative overflow-hidden rounded-[24px] bg-dark p-5 shadow-elevated sm:p-6">
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 opacity-40"
              style={{ backgroundImage: "radial-gradient(rgb(255 255 255 / 0.18) 1px, transparent 1px)", backgroundSize: "18px 18px" }}
            />
            <div aria-hidden="true" className="pointer-events-none absolute -bottom-20 -right-16 h-56 w-56 rounded-full bg-secondary/40 blur-3xl" />
            <div aria-hidden="true" className="pointer-events-none absolute -left-16 -top-16 h-48 w-48 rounded-full bg-primary/40 blur-3xl" />
            <p className="relative flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.16em] text-white/60">
              <span aria-hidden="true" className="relative flex h-2 w-2">
                <span className="animate-ping-soft absolute inline-flex h-full w-full rounded-full bg-emerald-400" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
              </span>
              Today at a glance
            </p>
            <dl className="relative mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
              {glance.map((g) => (
                <div key={g.label} className="rounded-2xl border border-white/10 bg-white/[0.07] p-3.5 backdrop-blur-md">
                  <div className="flex items-center gap-3">
                    <span aria-hidden="true" className="flex h-9 w-9 flex-none items-center justify-center rounded-full bg-white/10 text-cyan-200">
                      <svg width="17" height="17" viewBox="0 0 20 20" fill="none">
                        <path d={GLANCE_ICONS[g.icon] || GLANCE_ICONS.crm} stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </span>
                    <div className="min-w-0">
                      <dt className="truncate text-[11px] font-medium text-white/60">{g.label}</dt>
                      <dd className="truncate text-lg font-bold text-white">{g.value}</dd>
                    </div>
                  </div>
                  <div aria-hidden="true" className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/10">
                    <div
                      className="h-full rounded-full bg-linear-to-r from-cyan-300 to-violet-400"
                      style={{ width: `${Math.round(Math.min(1, Math.max(0.06, g.progress ?? 1)) * 100)}%` }}
                    />
                  </div>
                </div>
              ))}
            </dl>
          </div>
        )}
      </div>
    </section>
  );
}

/** Tiny trend line for a KPI card. Decorative: the card states the figures. */
export function Sparkline({ values, toneName = "primary" }) {
  if (!values?.length) return null;
  const max = Math.max(...values);
  const step = values.length > 1 ? 100 / (values.length - 1) : 100;
  const points = values.map((v, i) => `${(i * step).toFixed(2)},${(max > 0 ? 30 - (v / max) * 26 : 30).toFixed(2)}`);
  const line = points.join(" ");

  return (
    <svg viewBox="0 0 100 32" preserveAspectRatio="none" aria-hidden="true" className={cn("h-10 w-full", max > 0 ? tone(toneName).text : "text-border")}>
      {max > 0 && <polygon points={`0,32 ${line} 100,32`} fill="currentColor" opacity="0.1" />}
      <polyline points={line} fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

/**
 * KPI cards. `items` = [{ label, value, hint?, icon?, tone?, trend?, href? }].
 * Markup keeps the label immediately before the value (dt → dd) so the
 * figures read naturally to assistive tech and text-based checks.
 */
export function KpiGrid({ items, className }) {
  return (
    <dl className={cn("grid grid-cols-1 gap-4 sm:grid-cols-2", items.length >= 5 ? "xl:grid-cols-5" : "xl:grid-cols-4", className)}>
      {items.map((item) => {
        const t = tone(item.tone);
        return (
          <Card key={item.label} className="relative flex flex-col gap-3 overflow-hidden p-5" hoverable={Boolean(item.href)}>
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <dt className="text-xs font-medium uppercase tracking-wide text-muted">{item.label}</dt>
                <dd className="mt-1.5 truncate text-2xl font-extrabold tracking-tight text-dark sm:text-[1.75rem]">{item.value}</dd>
              </div>
              {item.icon && (
                <span aria-hidden="true" className={cn("flex h-11 w-11 flex-none items-center justify-center rounded-full ring-4 ring-white", t.soft)}>
                  <NavIcon name={item.icon} />
                </span>
              )}
            </div>
            {item.trend && <Sparkline values={item.trend} toneName={item.tone} />}
            {item.hint && <dd className="text-xs text-muted">{item.hint}</dd>}
            {item.href && (
              <Link href={item.href} className="absolute inset-0 rounded-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary">
                <span className="sr-only">Open {item.label}</span>
              </Link>
            )}
          </Card>
        );
      })}
    </dl>
  );
}

/** Card with a heading row (title, optional subtitle, optional "view all" link). */
export function Panel({ title, subtitle, href, linkLabel = "View all", className, children }) {
  return (
    <Card className={cn("flex flex-col", className)}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-sm font-semibold text-dark">{title}</h2>
          {subtitle && <p className="mt-0.5 text-xs text-muted">{subtitle}</p>}
        </div>
        {href && (
          <Link href={href} className="flex-none text-xs font-medium text-primary hover:text-primary-hover">
            {linkLabel} →
          </Link>
        )}
      </div>
      <div className="mt-4 flex flex-1 flex-col">{children}</div>
    </Card>
  );
}

/**
 * Share of a whole: one stacked bar plus a legend with counts and percentages.
 * `items` = [{ key, label, value, tone }]. Zero rows stay in the legend, muted.
 */
export function Distribution({ items, emptyText = "Nothing to show yet." }) {
  const total = items.reduce((s, i) => s + i.value, 0);
  if (total === 0) return <p className="text-sm text-muted">{emptyText}</p>;

  return (
    <div className="flex flex-col gap-4">
      <div aria-hidden="true" className="flex h-2.5 gap-0.5 overflow-hidden rounded-full bg-surface">
        {items
          .filter((i) => i.value > 0)
          .map((i) => (
            <div key={i.key} className={cn("h-full first:rounded-l-full last:rounded-r-full", tone(i.tone).solid)} style={{ width: `${(i.value / total) * 100}%` }} />
          ))}
      </div>
      <ul className="flex flex-col gap-2.5 text-sm">
        {items.map((i) => (
          <li key={i.key} className={cn("flex items-center gap-2.5", i.value === 0 && "opacity-50")}>
            <span aria-hidden="true" className={cn("h-2.5 w-2.5 flex-none rounded-full", tone(i.tone).solid)} />
            <span className="flex-1 truncate text-text">{i.label}</span>
            <span className="font-semibold text-dark">{i.value}</span>
            <span className="w-10 text-right text-xs text-muted">{Math.round((i.value / total) * 100)}%</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

const dayLabel = (day) => new Date(`${day}T00:00:00Z`).toLocaleDateString("en-IN", { day: "numeric", month: "short", timeZone: "UTC" });

/**
 * Multi-series daily line chart. `days` = ["YYYY-MM-DD", ...];
 * `series` = [{ key, label, tone, values }] aligned with `days`. Lines are an
 * SVG stretched to the plot box; gridlines, axis labels and the per-day hover
 * columns are HTML so text never distorts.
 */
export function TrendChart({ days, series }) {
  const totals = series.map((s) => s.values.reduce((a, b) => a + b, 0));
  const peak = Math.max(0, ...series.flatMap((s) => s.values));
  const top = Math.max(4, Math.ceil(peak / 4) * 4);
  const ticks = [top, (top * 3) / 4, top / 2, top / 4, 0];
  const n = days.length;
  const x = (i) => (n > 1 ? (i / (n - 1)) * 100 : 50);
  const y = (v) => 100 - (v / top) * 100;
  const summary = series.map((s, i) => `${s.label}: ${totals[i]}`).join(", ");

  return (
    <div className="flex flex-col gap-4">
      <ul className="flex flex-wrap gap-x-5 gap-y-2">
        {series.map((s, i) => (
          <li key={s.key} className="flex items-center gap-2 text-sm">
            <span aria-hidden="true" className={cn("h-2.5 w-2.5 rounded-full", tone(s.tone).solid)} />
            <span className="text-muted">{s.label}</span>
            <span className="font-semibold text-dark">{totals[i]}</span>
          </li>
        ))}
      </ul>

      <div className="flex gap-3">
        <div aria-hidden="true" className="flex h-48 flex-none flex-col justify-between text-right text-[10px] leading-none text-muted">
          {ticks.map((t) => (
            <span key={t} className="-translate-y-1/2 first:translate-y-0 last:translate-y-0">
              {Number.isInteger(t) ? t : t.toFixed(1)}
            </span>
          ))}
        </div>
        <div className="min-w-0 flex-1">
          <div role="img" aria-label={`Daily activity, ${dayLabel(days[0])} to ${dayLabel(days[n - 1])}. Totals: ${summary}.`} className="relative h-48">
            {ticks.map((t, i) => (
              <div key={t} aria-hidden="true" className={cn("absolute inset-x-0 border-t", i === ticks.length - 1 ? "border-border" : "border-dashed border-border/70")} style={{ top: `${(i / (ticks.length - 1)) * 100}%` }} />
            ))}
            <svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true" className="absolute inset-0 h-full w-full overflow-visible">
              {series.map((s) => {
                const pts = s.values.map((v, i) => `${x(i).toFixed(2)},${y(v).toFixed(2)}`).join(" ");
                return (
                  <g key={s.key} className={tone(s.tone).text}>
                    <polygon points={`0,100 ${pts} 100,100`} fill="currentColor" opacity="0.07" />
                    <polyline points={pts} fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
                  </g>
                );
              })}
            </svg>
            <div aria-hidden="true" className="absolute inset-0 flex">
              {days.map((day, i) => (
                <div
                  key={day}
                  title={`${dayLabel(day)} — ${series.map((s) => `${s.label}: ${s.values[i]}`).join(", ")}`}
                  className="flex-1 transition-colors hover:bg-primary/5"
                />
              ))}
            </div>
            {peak === 0 && (
              <p className="absolute inset-0 flex items-center justify-center text-sm text-muted">No activity in this period yet.</p>
            )}
          </div>
          <div aria-hidden="true" className="mt-2 flex justify-between text-[10px] text-muted">
            <span>{dayLabel(days[0])}</span>
            <span>{dayLabel(days[Math.floor((n - 1) / 2)])}</span>
            <span>{dayLabel(days[n - 1])}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

/** Round initials avatar; `toneName` picks the color. */
export function Avatar({ name, toneName = "primary", className }) {
  return (
    <span aria-hidden="true" className={cn("flex h-9 w-9 flex-none items-center justify-center rounded-full text-xs font-semibold", tone(toneName).soft, className)}>
      {initials(name) || "?"}
    </span>
  );
}

/** Grid of icon tiles linking to admin modules. `items` = [{ key, label, href, icon }]. */
export function ShortcutGrid({ items }) {
  return (
    <ul className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
      {items.map((item) => (
        <li key={item.key}>
          <Link
            href={item.href}
            className="group flex h-full flex-col items-center gap-2.5 rounded-2xl border border-border bg-white px-3 py-4 text-center text-sm font-semibold text-dark transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:text-primary hover:shadow-card focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          >
            <span aria-hidden="true" className="flex h-11 w-11 items-center justify-center rounded-full border border-border bg-white text-primary shadow-soft transition-colors group-hover:border-transparent group-hover:bg-linear-to-br group-hover:from-primary group-hover:to-secondary group-hover:text-white">
              <NavIcon name={item.icon} />
            </span>
            {item.label}
          </Link>
        </li>
      ))}
    </ul>
  );
}

/** Label/value rows with a status dot, for the platform health card. `rows` = [{ label, value, tone }]. */
export function HealthList({ rows }) {
  return (
    <dl className="flex flex-col divide-y divide-border text-sm">
      {rows.map((row) => (
        <div key={row.label} className="flex items-center justify-between gap-3 py-2.5 first:pt-0 last:pb-0">
          <dt className="text-muted">{row.label}</dt>
          <dd className="flex items-center gap-2 font-medium text-dark">
            {row.tone && <span aria-hidden="true" className={cn("h-2 w-2 rounded-full", tone(row.tone).solid)} />}
            {row.value}
          </dd>
        </div>
      ))}
    </dl>
  );
}
