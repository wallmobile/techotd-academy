import { requireArea } from "@/lib/auth/guards";
import { AdminShell } from "@/components/admin/AdminShell";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { StaffPasswordForm } from "@/components/admin/StaffPasswordForm";
import { DetailRow } from "@/components/admin/CatalogParts";
import { Card } from "@/components/ui/Card";
import { ROLE_LABELS } from "@/constants/roles";

export const metadata = {
  title: "My Account",
  robots: { index: false, follow: false },
};

export default async function AdminAccountPage() {
  // Any staff role; this page only ever shows and changes the signed-in user's own account.
  const user = await requireArea("admin");

  return (
    <AdminShell user={user} title="My Account">
      <div className="flex flex-col gap-6">
        <AdminPageHeader title="My Account" description="Your sign-in details and password." />
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <Card>
            <h2 className="text-sm font-semibold text-dark">Account</h2>
            <dl className="mt-4 flex flex-col gap-2.5 text-sm">
              <DetailRow label="Name">{user.name}</DetailRow>
              <DetailRow label="Email">{user.email}</DetailRow>
              <DetailRow label="Role">{ROLE_LABELS[user.role] || user.role}</DetailRow>
            </dl>
          </Card>
          <Card>
            <h2 className="text-sm font-semibold text-dark">Change password</h2>
            <div className="mt-4">
              <StaffPasswordForm />
            </div>
          </Card>
        </div>
      </div>
    </AdminShell>
  );
}
