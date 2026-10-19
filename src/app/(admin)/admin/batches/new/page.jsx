import { requireAdminContext } from "@/lib/admin/context";
import { getBatchFormOptions } from "@/lib/admin/batches";
import { getCourse } from "@/lib/catalog";
import { AdminShell } from "@/components/admin/AdminShell";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { BatchForm } from "@/components/admin/CatalogForms";
import { Card } from "@/components/ui/Card";

export const metadata = {
  title: "New Batch",
  robots: { index: false, follow: false },
};

export default async function AdminNewBatchPage({ searchParams }) {
  const { user } = await requireAdminContext();
  const sp = (await searchParams) || {};
  const requested = Array.isArray(sp.course) ? sp.course[0] : sp.course;
  // Prefill only: an unknown course is silently dropped (the server re-validates on submit).
  const presetCourse = typeof requested === "string" && getCourse(requested) ? requested : "";

  return (
    <AdminShell user={user} title="Batches">
      <div className="flex flex-col gap-6">
        <AdminPageHeader
          title="New Batch"
          description="Schedule a batch for a course. You can assign trainers once it is created."
          backHref="/admin/batches"
          backLabel="Back to Batches"
        />
        <Card className="max-w-3xl">
          <BatchForm mode="create" options={getBatchFormOptions()} presetCourse={presetCourse} />
        </Card>
      </div>
    </AdminShell>
  );
}
