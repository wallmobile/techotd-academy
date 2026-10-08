import { getCurrentUser } from "@/lib/auth/currentUser";
import { AdminShell } from "@/components/admin/AdminShell";
import { Button } from "@/components/ui/Button";

export default async function AdminLeadNotFound() {
  const user = await getCurrentUser();

  return (
    <AdminShell user={user} title="Lead Not Found">
      <div className="flex flex-col items-center gap-4 rounded-md border border-border bg-white p-10 text-center">
        <h1 className="text-lg font-semibold text-dark">Lead Not Found</h1>
        <p className="max-w-md text-sm text-muted">This lead doesn&apos;t exist or isn&apos;t available to you.</p>
        <Button href="/admin/leads">Back to Leads</Button>
      </div>
    </AdminShell>
  );
}
