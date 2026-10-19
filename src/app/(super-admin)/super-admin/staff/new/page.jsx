import { requireSuperAdminContext } from "@/lib/superAdmin/context";
import { superAdminNavItems } from "@/constants/adminNav";
import { AdminShell } from "@/components/admin/AdminShell";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { CreateStaffForm } from "@/components/admin/CreateStaffForm";
import { Card } from "@/components/ui/Card";

export const metadata = {
  title: "Create Staff Account",
  robots: { index: false, follow: false },
};

export default async function SuperAdminCreateStaffPage() {
  const { user } = await requireSuperAdminContext();

  return (
    <AdminShell user={user} title="Staff Accounts" navItems={superAdminNavItems} brand="TechOTD Super Admin">
      <div className="flex flex-col gap-6">
        <AdminPageHeader
          title="Create Staff Account"
          description="Create an Admin or a role-specific staff account. Students and trainers are managed from the Admin panel."
          backHref="/super-admin/staff"
          backLabel="Back to Staff Accounts"
        />
        <Card className="w-full max-w-xl">
          <CreateStaffForm />
        </Card>
      </div>
    </AdminShell>
  );
}
