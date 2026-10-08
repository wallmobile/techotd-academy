import Link from "next/link";
import { requireCrmContext } from "@/lib/crm/context";
import { getLeadsPage, getLeadSummary, getLeadFilterOptions } from "@/lib/crm/leads";
import { parseLeadParams } from "@/lib/crm/listParams";
import { AdminShell } from "@/components/admin/AdminShell";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { AdminStatsGrid } from "@/components/admin/AdminStatsGrid";
import { AdminPagination } from "@/components/admin/AdminListControls";
import { AdminDataList, LeadStatusBadge } from "@/components/admin/AdminDataList";
import { LeadFilters } from "@/components/admin/LeadFilters";
import { EmptyState } from "@/components/ui/EmptyState";
import { LEAD_SOURCE_LABELS, LEAD_STATUSES, LEAD_STATUS_LABELS } from "@/constants/crm";
import { formatDbDate } from "@/lib/utils";

export const metadata = {
  title: "Leads / CRM",
  robots: { index: false, follow: false },
};

export default async function AdminLeadsPage({ searchParams }) {
  const { user, isManager } = await requireCrmContext();
  const params = parseLeadParams(await searchParams);
  const [result, summary, options] = await Promise.all([getLeadsPage(params), getLeadSummary(), getLeadFilterOptions()]);

  const columns = [
    {
      key: "name",
      label: "Name",
      primary: true,
      render: (l) => (
        <Link href={`/admin/leads/${l.id}`} className="font-semibold text-dark hover:text-primary">
          {l.name}
        </Link>
      ),
    },
    { key: "phone", label: "Phone", render: (l) => l.phone },
    { key: "email", label: "Email", render: (l) => l.email },
    { key: "source", label: "Source", render: (l) => LEAD_SOURCE_LABELS[l.source] || l.source },
    { key: "course", label: "Course", render: (l) => l.courseTitle || "General" },
    { key: "mode", label: "Mode", render: (l) => l.modeLabel || "—" },
    { key: "status", label: "Status", render: (l) => <LeadStatusBadge status={l.status} /> },
    { key: "assigned", label: "Assigned to", render: (l) => l.assignedToName || "Unassigned" },
    { key: "created", label: "Received", render: (l) => formatDbDate(l.createdAt) },
  ];

  const hasFilters = params.q || params.status || params.source || params.course || params.mode || params.assigned;

  return (
    <AdminShell user={user} title="Leads / CRM">
      <div className="flex flex-col gap-6">
        <AdminPageHeader
          title="Leads"
          description={
            isManager
              ? "Every enquiry and demo request captured from the website."
              : "Leads assigned to you, plus the unassigned queue you can claim."
          }
        />

        <AdminStatsGrid
          stats={LEAD_STATUSES.map((s) => ({ label: LEAD_STATUS_LABELS[s], value: summary.byStatus[s] }))}
        />

        <LeadFilters params={params} options={options} />

        {result.rows.length === 0 ? (
          <EmptyState
            title={hasFilters ? "No leads match these filters" : "No leads yet"}
            description={
              hasFilters
                ? "Try clearing the search or filters."
                : "Leads appear here when someone submits the Book Demo or Enquiry form on the website."
            }
          />
        ) : (
          <>
            <AdminDataList columns={columns} rows={result.rows} caption="Leads" />
            <AdminPagination basePath="/admin/leads" params={params} {...result} />
          </>
        )}
      </div>
    </AdminShell>
  );
}
