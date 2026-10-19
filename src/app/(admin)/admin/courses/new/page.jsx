import { requireAdminContext } from "@/lib/admin/context";
import { getCourseFormOptions } from "@/lib/admin/courses";
import { AdminShell } from "@/components/admin/AdminShell";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { CourseForm } from "@/components/admin/CatalogForms";
import { Card } from "@/components/ui/Card";

export const metadata = {
  title: "New Course",
  robots: { index: false, follow: false },
};

export default async function AdminNewCoursePage() {
  const { user } = await requireAdminContext();
  return (
    <AdminShell user={user} title="Courses">
      <div className="flex flex-col gap-6">
        <AdminPageHeader
          title="New Course"
          description="Add a course to the catalog. It starts as an unpublished draft unless you choose otherwise."
          backHref="/admin/courses"
          backLabel="Back to Courses"
        />
        <Card className="max-w-3xl">
          <CourseForm mode="create" options={getCourseFormOptions()} />
        </Card>
      </div>
    </AdminShell>
  );
}
