import { getCurrentUser } from "@/lib/auth/currentUser";
import { AdminShell } from "@/components/admin/AdminShell";
import { Button } from "@/components/ui/Button";

export default async function AdminStudentNotFound() {
  const user = await getCurrentUser();

  return (
    <AdminShell user={user} title="Student Not Found">
      <div className="flex flex-col items-center gap-4 rounded-md border border-border bg-white p-10 text-center">
        <h1 className="text-lg font-semibold text-dark">Student Not Found</h1>
        <p className="max-w-md text-sm text-muted">This student doesn&apos;t exist.</p>
        <Button href="/admin/students">Back to Students</Button>
      </div>
    </AdminShell>
  );
}
