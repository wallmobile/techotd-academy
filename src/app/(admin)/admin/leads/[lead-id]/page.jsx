import { notFound } from "next/navigation";
import { requireCrmContext } from "@/lib/crm/context";
import { getLeadDetail } from "@/lib/crm/leads";
import { AdminShell } from "@/components/admin/AdminShell";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { LeadStatusBadge } from "@/components/admin/AdminDataList";
import Link from "next/link";
import { LeadStatusForm, MarkContactedForm, AssignLeadForm, ClaimLeadForm, LeadNoteForm, ConvertLeadForm } from "@/components/admin/LeadForms";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { LEAD_SOURCE_LABELS } from "@/constants/crm";
import { formatDbDate } from "@/lib/utils";

export const metadata = {
  title: "Lead Detail",
  robots: { index: false, follow: false },
};

export default async function AdminLeadDetailPage({ params }) {
  const { user } = await requireCrmContext();
  const { "lead-id": leadId } = await params;
  // null for "doesn't exist" and "not yours to see" alike.
  const detail = await getLeadDetail(leadId);
  if (!detail) notFound();

  const { lead, batchLabel, notes, permissions, assignees, canConvert, convertedStudent } = detail;

  return (
    <AdminShell user={user} title="Leads / CRM">
      <div className="flex flex-col gap-6">
        <AdminPageHeader title={lead.name} backHref="/admin/leads" backLabel="Back to Leads" />

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <Card>
            <h2 className="text-sm font-semibold text-dark">Contact</h2>
            <dl className="mt-4 flex flex-col gap-2.5 text-sm">
              <Row label="Name">{lead.name}</Row>
              <Row label="Phone">{lead.phone}</Row>
              <Row label="Email">{lead.email}</Row>
              <Row label="City">{lead.city || "—"}</Row>
              {lead.organization && <Row label="Organization">{lead.organization}</Row>}
            </dl>
          </Card>

          <Card>
            <h2 className="text-sm font-semibold text-dark">Interest</h2>
            <dl className="mt-4 flex flex-col gap-2.5 text-sm">
              <Row label="Course">{lead.courseTitle || "General enquiry"}</Row>
              <Row label="Mode">{lead.modeLabel || "No preference"}</Row>
              <Row label="Batch">{batchLabel || "No preference"}</Row>
              <Row label="Experience">{lead.experienceLevel || "—"}</Row>
              <Row label="Source">{LEAD_SOURCE_LABELS[lead.source] || lead.source}</Row>
              <Row label="Page">{lead.origin || "—"}</Row>
              <Row label="Consent to contact">{lead.consent ? "Given" : "Not recorded"}</Row>
            </dl>
            {lead.message && (
              <div className="mt-4 border-t border-border pt-4">
                <p className="text-xs font-medium uppercase tracking-wide text-muted">Message</p>
                <p className="mt-1 whitespace-pre-wrap break-words text-sm text-text">{lead.message}</p>
              </div>
            )}
          </Card>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <Card>
            <h2 className="text-sm font-semibold text-dark">CRM</h2>
            <dl className="mt-4 flex flex-col gap-2.5 text-sm">
              <Row label="Status">
                <LeadStatusBadge status={lead.status} />
              </Row>
              <Row label="Assigned to">{lead.assignedToName || "Unassigned"}</Row>
              <Row label="Received">{formatDbDate(lead.createdAt)}</Row>
              <Row label="Last updated">{formatDbDate(lead.updatedAt)}</Row>
              <Row label="Last contacted">{lead.lastContactedAt ? formatDbDate(lead.lastContactedAt) : "Not yet"}</Row>
            </dl>
          </Card>

          <Card>
            <h2 className="text-sm font-semibold text-dark">Actions</h2>
            <div className="mt-4 flex flex-col gap-6">
              {permissions.canModify ? (
                <>
                  <LeadStatusForm leadId={lead.id} status={lead.status} />
                  <MarkContactedForm leadId={lead.id} />
                </>
              ) : (
                <p className="text-sm text-muted">
                  {permissions.canClaim
                    ? "This lead is unassigned. Assign it to yourself to work on it."
                    : "You can view this lead but not change it."}
                </p>
              )}
              {permissions.canAssign && <AssignLeadForm leadId={lead.id} assignedTo={lead.assignedTo} assignees={assignees} />}
              {permissions.canClaim && <ClaimLeadForm leadId={lead.id} userId={user.id} />}
            </div>
          </Card>
        </div>

        {canConvert && (
          <Card>
            <h2 className="text-sm font-semibold text-dark">Convert to student</h2>
            <p className="mt-1 text-sm text-muted">Creates (or links) the student account for this lead and marks the lead Converted. You can enroll them in a batch right after.</p>
            <div className="mt-4 max-w-md">
              <ConvertLeadForm leadId={lead.id} />
            </div>
          </Card>
        )}

        {convertedStudent && (
          <Card>
            <h2 className="text-sm font-semibold text-dark">Converted student</h2>
            <dl className="mt-4 flex flex-col gap-2.5 text-sm">
              <Row label="Student">
                <Link href={`/admin/students/${convertedStudent.id}`} className="text-primary hover:text-primary-hover">
                  {convertedStudent.name}
                </Link>
              </Row>
              <Row label="Email">{convertedStudent.email}</Row>
              <Row label="Converted">{formatDbDate(lead.convertedAt)}</Row>
            </dl>
            <h3 className="mt-5 text-xs font-medium uppercase tracking-wide text-muted">Enrollments</h3>
            {convertedStudent.enrollments.length === 0 ? (
              <p className="mt-2 text-sm text-muted">Not enrolled in any batch yet.</p>
            ) : (
              <ul className="mt-2 divide-y divide-border">
                {convertedStudent.enrollments.map((e) => (
                  <li key={e.id} className="flex items-center justify-between gap-3 py-2 text-sm">
                    <Link href={`/admin/enrollments/${e.id}`} className="min-w-0 break-words text-text hover:text-primary">
                      {e.courseTitle} — {e.batchLabel}
                    </Link>
                    <span className="flex-none text-xs text-muted">{e.status}</span>
                  </li>
                ))}
              </ul>
            )}
            <div className="mt-4">
              <Button
                href={`/admin/enrollments/new?student=${convertedStudent.id}${lead.courseSlug ? `&course=${lead.courseSlug}` : ""}${lead.batchId ? `&batch=${lead.batchId}` : ""}`}
                size="sm"
              >
                + Enroll student
              </Button>
            </div>
          </Card>
        )}

        <Card>
          <h2 className="text-sm font-semibold text-dark">Internal notes</h2>
          <p className="mt-1 text-xs text-muted">Only visible to CRM staff.</p>
          {permissions.canModify && (
            <div className="mt-4">
              <LeadNoteForm leadId={lead.id} />
            </div>
          )}
          {notes.length === 0 ? (
            <p className="mt-4 text-sm text-muted">No notes yet.</p>
          ) : (
            <ul className="mt-4 divide-y divide-border">
              {notes.map((n) => (
                <li key={n.id} className="py-3">
                  <p className="whitespace-pre-wrap break-words text-sm text-text">{n.note}</p>
                  <p className="mt-1 text-xs text-muted">
                    {n.authorName} · {formatDbDate(n.createdAt)}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </Card>
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
