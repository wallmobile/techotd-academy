import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { formatMinor } from "@/lib/money";
import { PAYMENT_METHOD_LABELS } from "@/constants/fees";

/**
 * Payment receipt. Shown only for a real recorded payment. A manual entry is
 * labelled as such (never as gateway-verified), and this is a payment
 * acknowledgement — not a tax invoice.
 */
export function ReceiptCard({ receipt }) {
  const { payment, plan, studentName } = receipt;
  const verified = payment.source === "GATEWAY";
  return (
    <Card className="mx-auto w-full max-w-xl">
      <div className="flex items-start justify-between gap-3 border-b border-border pb-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">TechOTD Academy</p>
          <h2 className="mt-1 text-lg font-semibold text-dark">Payment receipt</h2>
        </div>
        <Badge variant={verified ? "success" : "neutral"}>{verified ? "Verified by gateway" : "Recorded manually"}</Badge>
      </div>
      <dl className="mt-4 flex flex-col gap-2.5 text-sm">
        <Row label="Receipt number">{payment.receiptNumber}</Row>
        <Row label="Student">{studentName}</Row>
        <Row label="Course">{plan.courseTitle}</Row>
        <Row label="Batch">{plan.batchLabel}</Row>
        <Row label="Amount received">
          <span className="text-base font-semibold text-dark">{formatMinor(payment.amountMinor, payment.currency)}</span>
        </Row>
        <Row label="Payment date">{payment.paidOn}</Row>
        <Row label="Method">{PAYMENT_METHOD_LABELS[payment.method] || payment.method}</Row>
        {payment.providerReference && <Row label="Provider reference">{payment.providerReference}</Row>}
      </dl>
      <p className="mt-5 border-t border-border pt-3 text-xs text-muted">
        This receipt acknowledges a payment received by TechOTD Academy. It is not a tax invoice.
      </p>
    </Card>
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
