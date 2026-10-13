import { requirePlacementContext } from "@/lib/placement/context";
import { AdminShell } from "@/components/admin/AdminShell";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { JobForm } from "@/components/admin/JobForms";
import { Card } from "@/components/ui/Card";

export const metadata = {
  title: "New Job",
  robots: { index: false, follow: false },
};

export default async function AdminNewJobPage() {
  const { user } = await requirePlacementContext();
  return (
    <AdminShell user={user} title="Jobs">
      <div className="flex flex-col gap-6">
        <AdminPageHeader
          title="New Job"
          description="Only enter real openings. A new job is saved as a draft and is not visible to students until you publish it."
          backHref="/admin/jobs"
          backLabel="Back to Jobs"
        />
        <Card className="w-full max-w-2xl">
          <JobForm />
        </Card>
      </div>
    </AdminShell>
  );
}
