import Link from "next/link";
import { getMyFees } from "@/lib/student/fees";
import { getCurrentUser } from "@/lib/auth/currentUser";
import { StudentShell } from "@/components/student/StudentShell";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { formatMinor } from "@/lib/money";
import { FEE_STATUS_LABELS, PAYMENT_METHOD_LABELS } from "@/constants/fees";

export const metadata = {
  title: "Fees",
  robots: { index: false, follow: false },
};

const STATUS_VARIANT = { PENDING: "warning", PARTIALLY_PAID: "primary", PAID: "success", OVERDUE: "danger", CANCELLED: "neutral" };

export default async function StudentFeesPage() {
  // getMyFees() derives the student from the session — there is no id in
  // this route to spoof another student's fees. Read-only.
  const [fees, user] = await Promise.all([getMyFees(), getCurrentUser()]);

  return (
    <StudentShell user={user} title="Fees">
      <div className="flex flex-col gap-6">
        <p className="text-sm text-muted">Your course fees and the payments recorded against them.</p>

        {fees.length === 0 ? (
          <EmptyState title="No fees yet" description="Fees appear here once the academy has assigned a fee to one of your enrollments." />
        ) : (
          <ul className="flex flex-col gap-4">
            {fees.map((fee) => (
              <li key={fee.id}>
                <Card>
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-dark">{fee.courseTitle}</p>
                      <p className="text-xs text-muted">{fee.batchLabel}</p>
                    </div>
                    <Badge variant={STATUS_VARIANT[fee.status] || "neutral"}>{FEE_STATUS_LABELS[fee.status] || fee.status}</Badge>
                  </div>

                  <dl className="mt-4 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
                    <Stat label="Net fee" value={formatMinor(fee.netMinor, fee.currency)} />
                    <Stat label="Paid" value={formatMinor(fee.paidMinor, fee.currency)} />
                    <Stat label="Outstanding" value={formatMinor(fee.outstandingMinor, fee.currency)} />
                    <Stat label="Due date" value={fee.dueDate || "—"} />
                  </dl>
                  {fee.discountMinor > 0 && (
                    <p className="mt-2 text-xs text-muted">Includes a discount of {formatMinor(fee.discountMinor, fee.currency)}.</p>
                  )}

                  <h3 className="mt-5 text-xs font-medium uppercase tracking-wide text-muted">Payments</h3>
                  {fee.payments.length === 0 ? (
                    <p className="mt-2 text-sm text-muted">No payments recorded yet.</p>
                  ) : (
                    <ul className="mt-2 divide-y divide-border">
                      {fee.payments.map((p) => (
                        <li key={p.id} className="flex flex-wrap items-center justify-between gap-2 py-2 text-sm">
                          <span className="text-text">
                            {formatMinor(p.amountMinor, p.currency)} · {PAYMENT_METHOD_LABELS[p.method] || p.method} · {p.paidOn}
                          </span>
                          <Link href={`/student/fees/receipt/${p.receiptToken}`} className="font-medium text-primary hover:text-primary-hover">
                            Receipt {p.receiptNumber}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  )}
                </Card>
              </li>
            ))}
          </ul>
        )}

        <p className="text-xs text-muted">
          Online payment isn&apos;t available yet. Please pay through the academy&apos;s offline channels and keep your receipt; payments appear here once they are recorded by the academy.
        </p>
      </div>
    </StudentShell>
  );
}

function Stat({ label, value }) {
  return (
    <div>
      <dt className="text-xs text-muted">{label}</dt>
      <dd className="font-semibold text-dark">{value}</dd>
    </div>
  );
}
