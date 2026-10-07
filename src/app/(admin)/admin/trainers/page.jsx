import Link from "next/link";
import { requireAdminContext } from "@/lib/admin/context";
import { getTrainersPage } from "@/lib/admin/trainers";
import { parseListParams } from "@/lib/admin/listParams";
import { AdminShell } from "@/components/admin/AdminShell";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { AdminSearchForm, AdminPagination } from "@/components/admin/AdminListControls";
import { AdminDataList, StatusBadge } from "@/components/admin/AdminDataList";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { formatDbDate } from "@/lib/utils";

export const metadata = {
  title: "Trainers",
  robots: { index: false, follow: false },
};

export default async function AdminTrainersPage({ searchParams }) {
  const { user } = await requireAdminContext();
  const params = parseListParams(await searchParams);
  const result = await getTrainersPage(params);

  const columns = [
    {
      key: "name",
      label: "Name",
      primary: true,
      render: (t) => (
        <Link href={`/admin/trainers/${t.id}`} className="font-semibold text-dark hover:text-primary">
          {t.name}
        </Link>
      ),
    },
    { key: "email", label: "Email", render: (t) => t.email },
    { key: "phone", label: "Phone", render: (t) => t.phone || "—" },
    { key: "batches", label: "Batches", render: (t) => t.batchCount },
    { key: "status", label: "Status", render: (t) => <StatusBadge status={t.status} /> },
    { key: "created", label: "Joined", render: (t) => formatDbDate(t.createdAt) },
  ];

  return (
    <AdminShell user={user} title="Trainers">
      <div className="flex flex-col gap-6">
        <AdminPageHeader title="Trainers" description="Trainer accounts and their batch assignments.">
          <Button href="/admin/trainers/new">Create Trainer</Button>
        </AdminPageHeader>
        <AdminSearchForm basePath="/admin/trainers" params={params} searchLabel="Name, email or phone" />
        {result.rows.length === 0 ? (
          <EmptyState
            title="No trainers found"
            description={params.q ? "No trainers match this search." : "No trainer accounts exist yet. Create the first one."}
            actionLabel={params.q ? undefined : "Create Trainer"}
            actionHref={params.q ? undefined : "/admin/trainers/new"}
          />
        ) : (
          <>
            <AdminDataList columns={columns} rows={result.rows} caption="Trainers" />
            <AdminPagination basePath="/admin/trainers" params={params} {...result} />
          </>
        )}
      </div>
    </AdminShell>
  );
}
