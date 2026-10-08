import { Badge } from "@/components/ui/Badge";
import { ROLE_LABELS } from "@/constants/roles";
import { LEAD_STATUS_LABELS } from "@/constants/crm";
import { ENROLLMENT_STATUS_LABELS } from "@/constants/enrollment";

const STATUS_VARIANT = { ACTIVE: "success", INACTIVE: "neutral", SUSPENDED: "danger" };

export function StatusBadge({ status }) {
  return <Badge variant={STATUS_VARIANT[status] || "neutral"}>{status}</Badge>;
}

export function RoleBadge({ role }) {
  return <Badge variant={role === "SUPER_ADMIN" || role === "ADMIN" ? "secondary" : "primary"}>{ROLE_LABELS[role] || role}</Badge>;
}

/**
 * Responsive list: a real <table> from md up, stacked cards below — so
 * 320–375px phones never need horizontal scrolling. `columns` =
 * [{ key, label, render(row), primary? }]; the `primary` column is the
 * card heading. Server component: pass only serializable-free render
 * functions from other server components.
 */
export function AdminDataList({ columns, rows, caption, rowKey = (row) => row.id }) {
  const primary = columns.find((c) => c.primary) || columns[0];
  const rest = columns.filter((c) => c !== primary);

  return (
    <>
      <div className="hidden overflow-hidden rounded-md border border-border bg-white shadow-card md:block">
        <table className="w-full text-left text-sm">
          <caption className="sr-only">{caption}</caption>
          <thead className="border-b border-border bg-surface text-xs uppercase tracking-wide text-muted">
            <tr>
              {columns.map((c) => (
                <th key={c.key} scope="col" className="px-4 py-3 font-medium">
                  {c.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {rows.map((row) => (
              <tr key={rowKey(row)}>
                {columns.map((c) => (
                  <td key={c.key} className="max-w-[16rem] break-words px-4 py-3 align-top text-text">
                    {c.render(row)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ul className="flex flex-col gap-3 md:hidden" aria-label={caption}>
        {rows.map((row) => (
          <li key={rowKey(row)} className="rounded-md border border-border bg-white p-4 shadow-card">
            <div className="break-words text-sm font-semibold text-dark">{primary.render(row)}</div>
            <dl className="mt-3 flex flex-col gap-1.5 text-xs">
              {rest.map((c) => (
                <div key={c.key} className="flex justify-between gap-3">
                  <dt className="flex-none text-muted">{c.label}</dt>
                  <dd className="min-w-0 break-words text-right font-medium text-text">{c.render(row)}</dd>
                </div>
              ))}
            </dl>
          </li>
        ))}
      </ul>
    </>
  );
}

const LEAD_STATUS_VARIANT = {
  NEW: "primary",
  CONTACTED: "neutral",
  QUALIFIED: "secondary",
  FOLLOW_UP: "warning",
  CONVERTED: "success",
  LOST: "danger",
};

export function LeadStatusBadge({ status }) {
  return <Badge variant={LEAD_STATUS_VARIANT[status] || "neutral"}>{LEAD_STATUS_LABELS[status] || status}</Badge>;
}

const ENROLLMENT_VARIANT = { ACTIVE: "success", COMPLETED: "primary", CANCELLED: "neutral" };

export function EnrollmentStatusBadge({ status }) {
  return <Badge variant={ENROLLMENT_VARIANT[status] || "neutral"}>{ENROLLMENT_STATUS_LABELS[status] || status}</Badge>;
}
