import { notFound } from "next/navigation";
import { requireFinanceContext } from "@/lib/fees/context";
import { getPaymentForReceipt } from "@/lib/fees/service";
import { AdminShell } from "@/components/admin/AdminShell";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { ReceiptCard } from "@/components/shared/ReceiptCard";

export const metadata = {
  title: "Receipt",
  robots: { index: false, follow: false },
};

export default async function AdminReceiptPage({ params }) {
  const { user } = await requireFinanceContext();
  const { "fee-id": feeId, "payment-id": paymentId } = await params;
  const found = await getPaymentForReceipt(paymentId);
  // The payment must belong to the fee in the URL; otherwise treat as missing.
  if (!found || found.plan.id !== feeId) notFound();

  return (
    <AdminShell user={user} title="Fees">
      <div className="flex flex-col gap-6">
        <AdminPageHeader title="Receipt" backHref={`/admin/fees/${feeId}`} backLabel="Back to fee" />
        <ReceiptCard receipt={{ payment: found.payment, plan: found.plan, studentName: found.plan.studentName }} />
      </div>
    </AdminShell>
  );
}
