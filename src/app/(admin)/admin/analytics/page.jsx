import { requireRole } from "@/lib/auth/guards";
import { getAnalytics, toSeries } from "@/lib/analytics/service";
import { AdminShell } from "@/components/admin/AdminShell";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { AdminStatsGrid } from "@/components/admin/AdminStatsGrid";
import { BarChart } from "@/components/admin/BarChart";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { ANALYTICS_ROLES, EXPORT_ROLES, PRESETS, PRESET_LABELS } from "@/constants/analytics";
import { LEAD_STATUSES, LEAD_STATUS_LABELS, LEAD_SOURCE_LABELS } from "@/constants/crm";
import { APPLICATION_STATUSES, APPLICATION_STATUS_LABELS } from "@/constants/placement";
import { formatMinor } from "@/lib/money";

export const metadata = {
  title: "Analytics & Reports",
  robots: { index: false, follow: false },
};

const sum = (rows, key = "amount") => rows.reduce((s, r) => s + Number(r[key] || 0), 0);

export default async function AdminAnalyticsPage({ searchParams }) {
  const user = await requireRole(ANALYTICS_ROLES);
  const sp = (await searchParams) || {};
  const report = await getAnalytics(sp);
  const { range } = report;
  const canExport = EXPORT_ROLES.includes(user.role);
  const query = new URLSearchParams({ preset: range.preset, ...(range.preset === "custom" ? { from: range.from, to: range.to } : {}) });

  return (
    <AdminShell user={user} title="Analytics">
      <div className="flex flex-col gap-6">
        <AdminPageHeader
          title="Analytics & Reports"
          description={`${range.from} to ${range.to} (UTC days, inclusive) · generated ${report.generatedAt.slice(0, 16).replace("T", " ")} UTC`}
        />

        <form method="get" action="/admin/analytics" className="flex flex-col gap-3">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-4 sm:items-end">
            <Select label="Period" id="preset" name="preset" defaultValue={range.preset}>
              {PRESETS.map((p) => (
                <option key={p} value={p}>
                  {PRESET_LABELS[p]}
                </option>
              ))}
            </Select>
            <Input label="From (custom)" id="from" name="from" type="date" defaultValue={range.from} />
            <Input label="To (custom)" id="to" name="to" type="date" defaultValue={range.to} />
            <Button type="submit">Apply</Button>
          </div>
          {range.error && (
            <p role="alert" className="rounded-sm border border-danger/30 bg-danger/5 px-3 py-2 text-sm text-danger">
              {range.error} Showing the last 30 days instead.
            </p>
          )}
        </form>

        {canExport && !range.error && (
          <div className="flex flex-wrap gap-4 text-sm">
            <a href={`/admin/analytics/export?type=summary&${query}`} className="font-medium text-primary hover:text-primary-hover">
              Download summary (CSV)
            </a>
            <a href={`/admin/analytics/export?type=daily&${query}`} className="font-medium text-primary hover:text-primary-hover">
              Download daily breakdown (CSV)
            </a>
          </div>
        )}

        {report.overview && (
          <section className="flex flex-col gap-4" aria-labelledby="sec-reg">
            <h2 id="sec-reg" className="text-base font-semibold text-dark">Registrations</h2>
            <AdminStatsGrid
              stats={[
                { label: "Students registered", value: report.overview.registrations, hint: "In period" },
                { label: "Total students", value: report.overview.totalStudents, hint: "As of now" },
              ]}
            />
            <BarChart title="Students registered per day" series={toSeries(range, report.dailyRegistrations)} />
          </section>
        )}

        {report.crm && (
          <section className="flex flex-col gap-4" aria-labelledby="sec-crm">
            <h2 id="sec-crm" className="text-base font-semibold text-dark">
              Leads &amp; enquiries {report.crm.scoped && <span className="text-xs font-normal text-muted">(your assigned leads and the unassigned queue)</span>}
            </h2>
            <AdminStatsGrid
              stats={[
                { label: "Leads created", value: report.crm.total, hint: "In period" },
                { label: "Verified conversions", value: report.crm.verifiedConversions, hint: "Linked to a student account" },
                { label: "Marked converted, no student", value: report.crm.markedWithoutStudent, hint: "Not counted as conversions" },
              ]}
            />
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <Card>
                <h3 className="text-sm font-semibold text-dark">Created in period, by current status</h3>
                <ul className="mt-3 divide-y divide-border text-sm">
                  {LEAD_STATUSES.map((s) => (
                    <li key={s} className="flex justify-between py-2">
                      <span className="text-text">{LEAD_STATUS_LABELS[s]}</span>
                      <span className="font-medium text-dark">{report.crm.byStatus[s] ?? 0}</span>
                    </li>
                  ))}
                </ul>
              </Card>
              <Card>
                <h3 className="text-sm font-semibold text-dark">By source</h3>
                <ul className="mt-3 divide-y divide-border text-sm">
                  {Object.entries(LEAD_SOURCE_LABELS).map(([k, label]) => (
                    <li key={k} className="flex justify-between py-2">
                      <span className="text-text">{label}</span>
                      <span className="font-medium text-dark">{report.crm.bySource[k] ?? 0}</span>
                    </li>
                  ))}
                </ul>
              </Card>
            </div>
            <BarChart title="Leads created per day" series={toSeries(range, report.dailyLeads)} />
          </section>
        )}

        {report.enrollment && (
          <section className="flex flex-col gap-4" aria-labelledby="sec-enr">
            <h2 id="sec-enr" className="text-base font-semibold text-dark">Enrollments</h2>
            <AdminStatsGrid
              stats={[
                { label: "New enrollments", value: report.enrollment.created, hint: "In period (student + batch)" },
                { label: "Active", value: report.enrollment.snapshot.ACTIVE, hint: "As of now" },
                { label: "Completed", value: report.enrollment.snapshot.COMPLETED, hint: "As of now" },
                { label: "Cancelled", value: report.enrollment.snapshot.CANCELLED, hint: "As of now" },
                { label: "Enrolled students", value: report.enrollment.enrolledStudents, hint: "Active or completed, as of now" },
              ]}
            />
            <BarChart title="New enrollments per day" series={toSeries(range, report.dailyEnrollments)} />
          </section>
        )}

        {report.finance && (
          <section className="flex flex-col gap-4" aria-labelledby="sec-fin">
            <h2 id="sec-fin" className="text-base font-semibold text-dark">Fees &amp; payments</h2>
            <p className="text-xs text-muted">
              Amounts are recorded values per currency. Manual payments are entries made by staff for money received offline; they are not
              online revenue. Voided payments are excluded from collected totals.
            </p>
            {report.finance.feesAssigned.length === 0 && report.finance.collected.length === 0 && report.finance.outstanding.length === 0 && report.finance.voided.length === 0 ? (
              <EmptyState title="No financial activity" description="No fees or payments are recorded for this period." />
            ) : (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <Card>
                  <h3 className="text-sm font-semibold text-dark">In this period</h3>
                  <dl className="mt-3 flex flex-col gap-2 text-sm">
                    {report.finance.feesAssigned.map((r) => (
                      <Row key={`fa-${r.currency}`} label={`Fees assigned (net, ${r.plans} plan${r.plans === 1 ? "" : "s"})`}>
                        {formatMinor(r.net, r.currency)}
                      </Row>
                    ))}
                    {report.finance.collected.map((r) => (
                      <Row key={`c-${r.currency}-${r.source}`} label={`Collected — ${r.source === "GATEWAY" ? "gateway-verified" : "recorded manually"} (${r.payments})`}>
                        {formatMinor(r.amount, r.currency)}
                      </Row>
                    ))}
                    {report.finance.voided.map((r) => (
                      <Row key={`v-${r.currency}`} label={`Voided payments (${r.payments}, excluded)`}>
                        {formatMinor(r.amount, r.currency)}
                      </Row>
                    ))}
                    <Row label="Fee plans cancelled">{report.finance.feesCancelled}</Row>
                  </dl>
                </Card>
                <Card>
                  <h3 className="text-sm font-semibold text-dark">Outstanding — as of now</h3>
                  {report.finance.outstanding.length === 0 ? (
                    <p className="mt-3 text-sm text-muted">No outstanding balances.</p>
                  ) : (
                    <dl className="mt-3 flex flex-col gap-2 text-sm">
                      {report.finance.outstanding.map((r) => (
                        <div key={r.currency} className="flex flex-col gap-2">
                          <Row label={`Outstanding (${r.plans} plan${r.plans === 1 ? "" : "s"})`}>{formatMinor(r.balance, r.currency)}</Row>
                          <Row label={`Overdue (${r.overdue_plans})`}>{formatMinor(r.overdue_balance, r.currency)}</Row>
                        </div>
                      ))}
                    </dl>
                  )}
                  {sum(report.finance.collected) === 0 && <p className="mt-3 text-xs text-muted">No payments were received in this period.</p>}
                </Card>
              </div>
            )}
          </section>
        )}

        {report.certificates && (
          <section className="flex flex-col gap-4" aria-labelledby="sec-cert">
            <h2 id="sec-cert" className="text-base font-semibold text-dark">Certificates</h2>
            <AdminStatsGrid
              stats={[
                { label: "Issued", value: report.certificates.issued, hint: "In period" },
                { label: "Manual approvals", value: report.certificates.issuedManual, hint: "Of those issued" },
                { label: "Revoked", value: report.certificates.revoked, hint: "In period" },
                { label: "Active", value: report.certificates.snapshot.ACTIVE, hint: "As of now" },
                { label: "Revoked (all)", value: report.certificates.snapshot.REVOKED, hint: "As of now" },
              ]}
            />
          </section>
        )}

        {report.placement && (
          <section className="flex flex-col gap-4" aria-labelledby="sec-plc">
            <h2 id="sec-plc" className="text-base font-semibold text-dark">Jobs &amp; placements</h2>
            <AdminStatsGrid
              stats={[
                { label: "Jobs published", value: report.placement.jobsPublished, hint: "In period" },
                { label: "Open jobs", value: report.placement.jobsOpen, hint: "As of now" },
                { label: "Applications", value: report.placement.applications, hint: "Received in period" },
                { label: "Verified placements", value: report.placement.verifiedPlacements, hint: "Confirmed in period" },
              ]}
            />
            <Card>
              <h3 className="text-sm font-semibold text-dark">Applications received in period, by current status</h3>
              <ul className="mt-3 divide-y divide-border text-sm">
                {APPLICATION_STATUSES.map((s) => (
                  <li key={s} className="flex justify-between py-2">
                    <span className="text-text">{APPLICATION_STATUS_LABELS[s]}</span>
                    <span className="font-medium text-dark">{report.placement.byStatus[s] ?? 0}</span>
                  </li>
                ))}
              </ul>
              <p className="mt-3 text-xs text-muted">
                “Selected” is a hiring decision, not a placement: a placement is counted only after staff explicitly confirm it.
              </p>
            </Card>
          </section>
        )}

        <Card>
          <h2 className="text-sm font-semibold text-dark">Definitions</h2>
          <ul className="mt-3 list-disc space-y-1.5 pl-5 text-sm text-muted">
            <li>Periods are UTC calendar days, inclusive. “As of now” figures ignore the period.</li>
            <li>An enrollment is one student in one batch; course enrollments derived from them are not counted again.</li>
            <li>Collected = recorded payments by date received, excluding voided payments and cancelled fees. Manual and gateway amounts are shown separately.</li>
            <li>Outstanding = net fee minus recorded payments on active fees.</li>
            <li>A verified conversion is a lead linked to a student account through the conversion flow; leads only marked Converted are listed apart.</li>
          </ul>
        </Card>
      </div>
    </AdminShell>
  );
}

function Row({ label, children }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <dt className="text-muted">{label}</dt>
      <dd className="font-medium text-text">{children}</dd>
    </div>
  );
}
