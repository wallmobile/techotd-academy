import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdminContext } from "@/lib/admin/context";
import { getUserDetail } from "@/lib/admin/users";
import { AdminShell } from "@/components/admin/AdminShell";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { RoleBadge, StatusBadge } from "@/components/admin/AdminDataList";
import { UserStatusForm } from "@/components/admin/UserStatusForm";
import { Card } from "@/components/ui/Card";
import { formatDbDate } from "@/lib/utils";

export const metadata = {
  title: "User Detail",
  robots: { index: false, follow: false },
};

export default async function AdminUserDetailPage({ params }) {
  const { user } = await requireAdminContext();
  const { "user-id": userId } = await params;
  const detail = await getUserDetail(userId);
  if (!detail) notFound();

  const { user: target, canChangeStatus, assignedBatchCount } = detail;

  return (
    <AdminShell user={user} title="Users">
      <div className="flex flex-col gap-6">
        <AdminPageHeader title={target.name} backHref="/admin/users" backLabel="Back to Users" />

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <Card>
            <h2 className="text-sm font-semibold text-dark">Account</h2>
            <dl className="mt-4 flex flex-col gap-2.5 text-sm">
              <Row label="Email">{target.email}</Row>
              <Row label="Phone">{target.phone || "—"}</Row>
              <Row label="Role">
                <RoleBadge role={target.role} />
              </Row>
              <Row label="Status">
                <StatusBadge status={target.status} />
              </Row>
              <Row label="Email verified">{target.emailVerifiedAt ? formatDbDate(target.emailVerifiedAt) : "Not verified"}</Row>
              <Row label="Joined">{formatDbDate(target.createdAt)}</Row>
              <Row label="Last updated">{formatDbDate(target.updatedAt)}</Row>
              <Row label="Active sessions">{target.activeSessionCount}</Row>
            </dl>
          </Card>

          <div className="flex flex-col gap-6">
            {target.role === "STUDENT" && (
              <Card>
                <h2 className="text-sm font-semibold text-dark">Student record</h2>
                <p className="mt-2 text-sm text-muted">Learning data for this account is on the student page.</p>
                <Link href={`/admin/students/${target.id}`} className="mt-3 inline-block text-sm font-medium text-primary hover:text-primary-hover">
                  View student →
                </Link>
              </Card>
            )}
            {target.role === "TRAINER" && (
              <Card>
                <h2 className="text-sm font-semibold text-dark">Trainer record</h2>
                <p className="mt-2 text-sm text-muted">{assignedBatchCount} assigned batch{assignedBatchCount === 1 ? "" : "es"}.</p>
                <Link href={`/admin/trainers/${target.id}`} className="mt-3 inline-block text-sm font-medium text-primary hover:text-primary-hover">
                  View trainer →
                </Link>
              </Card>
            )}

            <Card>
              <h2 className="text-sm font-semibold text-dark">Account access</h2>
              {canChangeStatus ? (
                <div className="mt-3">
                  <UserStatusForm userId={target.id} status={target.status} />
                </div>
              ) : (
                <p className="mt-2 text-sm text-muted">
                  You can&apos;t change this account&apos;s status (your own account, or an admin account that only a Super Admin can change).
                </p>
              )}
            </Card>
          </div>
        </div>
      </div>
    </AdminShell>
  );
}

function Row({ label, children }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <dt className="text-muted">{label}</dt>
      <dd className="min-w-0 break-words text-right font-medium text-text">{children}</dd>
    </div>
  );
}
