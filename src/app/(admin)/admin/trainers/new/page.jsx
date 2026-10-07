import { requireAdminContext } from "@/lib/admin/context";
import { AdminShell } from "@/components/admin/AdminShell";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { CreateTrainerForm } from "@/components/admin/CreateTrainerForm";
import { Card } from "@/components/ui/Card";

export const metadata = {
  title: "Create Trainer",
  robots: { index: false, follow: false },
};

export default async function AdminCreateTrainerPage() {
  const { user } = await requireAdminContext();

  return (
    <AdminShell user={user} title="Trainers">
      <div className="flex flex-col gap-6">
        <AdminPageHeader
          title="Create Trainer"
          description="Create a trainer account, then assign batches from the trainer's page."
          backHref="/admin/trainers"
          backLabel="Back to Trainers"
        />
        <Card className="w-full max-w-xl">
          <CreateTrainerForm />
        </Card>
      </div>
    </AdminShell>
  );
}
