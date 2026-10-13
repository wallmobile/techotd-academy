import { notFound } from "next/navigation";
import { getMyReceipt } from "@/lib/student/fees";
import { getCurrentUser } from "@/lib/auth/currentUser";
import { StudentShell } from "@/components/student/StudentShell";
import { ReceiptCard } from "@/components/shared/ReceiptCard";
import { Button } from "@/components/ui/Button";

export const metadata = {
  title: "Receipt",
  robots: { index: false, follow: false },
};

export default async function StudentReceiptPage({ params }) {
  const { token } = await params;
  // Null for unknown tokens, other students' receipts and voided payments alike.
  const [receipt, user] = await Promise.all([getMyReceipt(token), getCurrentUser()]);
  if (!receipt) notFound();

  return (
    <StudentShell user={user} title="Receipt">
      <div className="flex flex-col gap-6">
        <div>
          <Button href="/student/fees" variant="outline" size="sm">
            ← Back to Fees
          </Button>
        </div>
        <ReceiptCard receipt={{ payment: receipt.payment, plan: receipt.plan, studentName: receipt.student.name }} />
      </div>
    </StudentShell>
  );
}
