import Link from "next/link";
import { requireFinanceContext } from "@/lib/fees/context";
import { getFeeFormData } from "@/lib/fees/service";
import { AdminShell } from "@/components/admin/AdminShell";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { AssignFeeForm } from "@/components/admin/FeeForms";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";

export const metadata = {
  title: "Assign Fee",
  robots: { index: false, follow: false },
};

export default async function AdminAssignFeePage({ searchParams }) {
  const { user } = await requireFinanceContext();
  const sp = (await searchParams) || {};
  const str = (v) => (typeof v === "string" ? v.slice(0, 100) : "");
  const data = await getFeeFormData({ enrollmentId: str(sp.enrollment), query: str(sp.sq).trim() });

  return (
    <AdminShell user={user} title="Fees">
      <div className="flex flex-col gap-6">
        <AdminPageHeader
          title="Assign Fee"
          description="Set the fee for one enrollment. Nothing is pre-filled — fees are always entered explicitly."
          backHref="/admin/fees"
          backLabel="Back to Fees"
        />
        <Card className="w-full max-w-xl">
          {data.enrollment ? (
            data.enrollment.existingFeeId ? (
              <div className="flex flex-col gap-3 text-sm">
                <p className="text-text">A fee has already been assigned to this enrollment.</p>
                <Link href={`/admin/fees/${data.enrollment.existingFeeId}`} className="font-medium text-primary hover:text-primary-hover">
                  Open the fee →
                </Link>
              </div>
            ) : (
              <div className="flex flex-col gap-4">
                <div className="rounded-sm bg-surface px-3 py-2 text-sm">
                  <p className="font-medium text-dark">{data.enrollment.studentName}</p>
                  <p className="text-xs text-muted">
                    {data.enrollment.courseTitle} — {data.enrollment.batchLabel}
                  </p>
                </div>
                <AssignFeeForm enrollmentId={data.enrollment.id} currencies={data.currencies} defaultCurrency={data.defaultCurrency} />
              </div>
            )
          ) : (
            <div className="flex flex-col gap-4">
              <form method="get" action="/admin/fees/new" role="search" className="flex flex-col gap-3">
                <Input label="Find an enrollment (student name or email)" id="sq" name="sq" type="search" defaultValue={str(sp.sq)} maxLength={100} />
                <div>
                  <Button type="submit">Search</Button>
                </div>
              </form>
              {data.candidates.length === 0 ? (
                <EmptyState title="No enrollments without a fee." description="Every active enrollment already has a fee, or no enrollments match your search." />
              ) : (
                <ul className="divide-y divide-border rounded-sm border border-border">
                  {data.candidates.map((c) => (
                    <li key={c.id} className="flex items-center justify-between gap-3 px-3 py-2.5 text-sm">
                      <span className="min-w-0">
                        <span className="block truncate font-medium text-dark">{c.studentName}</span>
                        <span className="block truncate text-xs text-muted">
                          {c.courseTitle} · {c.studentEmail}
                        </span>
                      </span>
                      <Link href={`/admin/fees/new?enrollment=${c.id}`} className="flex-none font-medium text-primary hover:text-primary-hover">
                        Select
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </Card>
      </div>
    </AdminShell>
  );
}
