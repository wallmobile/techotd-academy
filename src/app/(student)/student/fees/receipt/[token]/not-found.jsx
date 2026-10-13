import { getCurrentUser } from "@/lib/auth/currentUser";
import { StudentShell } from "@/components/student/StudentShell";
import { Button } from "@/components/ui/Button";

export default async function StudentReceiptNotFound() {
  const user = await getCurrentUser();

  return (
    <StudentShell user={user} title="Receipt Not Found">
      <div className="flex flex-col items-center gap-4 rounded-md border border-border bg-white p-10 text-center">
        <h2 className="text-lg font-semibold text-dark">Receipt Not Found</h2>
        <p className="max-w-md text-sm text-muted">This receipt doesn&apos;t exist or isn&apos;t available to you.</p>
        <Button href="/student/fees">Back to Fees</Button>
      </div>
    </StudentShell>
  );
}
