import Link from "next/link";
import { notFound } from "next/navigation";
import { requireFinanceContext } from "@/lib/fees/context";
import { getFeeDetail, newIdempotencyKey } from "@/lib/fees/service";
import { AdminShell } from "@/components/admin/AdminShell";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { AdminStatsGrid } from "@/components/admin/AdminStatsGrid";
import { FeeStatusBadge } from "@/components/admin/AdminDataList";
import { RecordPaymentForm, UpdateFeeForm, CancelFeeForm, VoidPaymentForm } from "@/components/admin/FeeForms";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { formatMinor, minorToInput } from "@/lib/money";
import { PAYMENT_METHOD_LABELS, PAYMENT_STATUS_LABELS } from "@/constants/fees";
import { formatDbDate } from "@/lib/utils";

export const metadata = {
  title: "Fee Detail",
  robots: { index: false, follow: false },
};

export default async function AdminFeeDetailPage({ params }) {
  const { user } = await requireFinanceContext();
  const { "fee-id": feeId } = await params;
  const detail = await getFeeDetail(feeId);
  if (!detail) notFound();

  const { plan, payments, history } = detail;
  const cancelled = plan.planStatus === "CANCELLED";
  const hasCounted = payments.some((p) => p.status !== "VOIDED");
  const today = new Date().toISOString().slice(0, 10);

  return (
    <AdminShell user={user} title="Fees">
      <div className="flex flex-col gap-6">
        <AdminPageHeader title={`${plan.studentName} — ${plan.courseTitle}`} backHref="/admin/fees" backLabel="Back to Fees">
          <FeeStatusBadge status={plan.status} />
        </AdminPageHeader>

        <AdminStatsGrid
          stats={[
            { label: "Total fee", value: formatMinor(plan.totalMinor, plan.currency) },
            { label: "Discount", value: formatMinor(plan.discountMinor, plan.currency) },
            { label: "Net payable", value: formatMinor(plan.netMinor, plan.currency) },
            { label: "Paid", value: formatMinor(plan.paidMinor, plan.currency) },
            { label: "Outstanding", value: formatMinor(plan.outstandingMinor, plan.currency) },
          ]}
        />

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <Card>
            <h2 className="text-sm font-semibold text-dark">Fee details</h2>
            <dl className="mt-4 flex flex-col gap-2.5 text-sm">
              <Row label="Student">
                <Link href={`/admin/students/${plan.studentUserId}`} className="text-primary hover:text-primary-hover">
                  {plan.studentName}
                </Link>
              </Row>
              <Row label="Email">{plan.studentEmail}</Row>
              <Row label="Course">{plan.courseTitle}</Row>
              <Row label="Batch">{plan.batchLabel}</Row>
              <Row label="Enrollment">
                <Link href={`/admin/enrollments/${plan.enrollmentId}`} className="text-primary hover:text-primary-hover">
                  View enrollment
                </Link>
              </Row>
              <Row label="Due date">{plan.dueDate || "—"}</Row>
              <Row label="Internal note">{plan.note || "—"}</Row>
            </dl>
          </Card>

          <Card>
            <h2 className="text-sm font-semibold text-dark">Record a payment</h2>
            {cancelled ? (
              <p className="mt-3 text-sm text-muted">This fee was cancelled; no payments can be recorded.</p>
            ) : plan.outstandingMinor === 0 ? (
              <p className="mt-3 text-sm text-muted">This fee is fully paid.</p>
            ) : (
              <div className="mt-4">
                <RecordPaymentForm feePlanId={plan.id} idempotencyKey={newIdempotencyKey()} today={today} />
              </div>
            )}
          </Card>
        </div>

        <Card>
          <h2 className="text-sm font-semibold text-dark">Payment history</h2>
          {payments.length === 0 ? (
            <p className="mt-3 text-sm text-muted">No payments recorded yet.</p>
          ) : (
            <ul className="mt-3 divide-y divide-border">
              {payments.map((p) => (
                <li key={p.id} className="py-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm font-semibold text-dark">{formatMinor(p.amountMinor, p.currency)}</p>
                    <Badge variant={p.status === "VOIDED" ? "danger" : p.source === "GATEWAY" ? "success" : "neutral"}>
                      {PAYMENT_STATUS_LABELS[p.status] || p.status}
                    </Badge>
                  </div>
                  <p className="mt-1 text-xs text-muted">
                    {PAYMENT_METHOD_LABELS[p.method] || p.method} · {p.paidOn} · {p.receiptNumber}
                    {p.recordedByName ? ` · by ${p.recordedByName}` : ""}
                  </p>
                  {p.note && <p className="mt-1 break-words text-xs text-text">{p.note}</p>}
                  {p.status === "VOIDED" ? (
                    <p className="mt-1 text-xs text-danger">
                      Voided {formatDbDate(p.voidedAt)}: {p.voidReason}
                    </p>
                  ) : (
                    <div className="mt-2 flex flex-col gap-3">
                      <Link href={`/admin/fees/${plan.id}/receipt/${p.id}`} className="text-xs font-medium text-primary hover:text-primary-hover">
                        View receipt
                      </Link>
                      <VoidPaymentForm paymentId={p.id} />
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </Card>

        {!cancelled && (
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <Card>
              <h2 className="text-sm font-semibold text-dark">Edit fee</h2>
              <div className="mt-4">
                <UpdateFeeForm
                  feePlanId={plan.id}
                  total={minorToInput(plan.totalMinor)}
                  discount={minorToInput(plan.discountMinor)}
                  dueDate={plan.dueDate}
                  note={plan.note}
                />
              </div>
            </Card>
            {!hasCounted && (
              <Card>
                <h2 className="text-sm font-semibold text-dark">Cancel fee</h2>
                <div className="mt-4">
                  <CancelFeeForm feePlanId={plan.id} />
                </div>
              </Card>
            )}
          </div>
        )}

        <Card>
          <h2 className="text-sm font-semibold text-dark">Change history</h2>
          {history.length === 0 ? (
            <p className="mt-3 text-sm text-muted">No changes recorded.</p>
          ) : (
            <ul className="mt-3 divide-y divide-border text-sm">
              {history.map((h, i) => (
                <li key={i} className="flex flex-wrap justify-between gap-2 py-2">
                  <span className="text-text">{h.action.replaceAll("_", " ").toLowerCase()}</span>
                  <span className="text-xs text-muted">
                    {h.actorName || "System"} · {formatDbDate(h.at)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </AdminShell>
  );
}

function Row({ label, children }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <dt className="text-muted">{label}</dt>
      <dd className="min-w-0 break-words text-right font-medium text-text">{children}</dd>
    </div>
  );
}
