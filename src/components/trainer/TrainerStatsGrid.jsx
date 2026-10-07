import { Card } from "@/components/ui/Card";

function StatCard({ label, value, hint }) {
  return (
    <Card className="p-5">
      <p className="text-xs font-medium uppercase tracking-wide text-muted">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-dark">{value}</p>
      {hint && <p className="mt-1 text-xs text-muted">{hint}</p>}
    </Card>
  );
}

/**
 * Trainer equivalent of src/components/student/StatsGrid.jsx. Only three
 * cards — every figure is computed from real trainer_batch_assignments /
 * batch_enrollments / assignment_submissions rows (see
 * src/lib/trainer/dashboard.js). No "trainer performance analytics"
 * (ratings, completion rates, etc.) is shown — out of scope for this
 * phase.
 */
export function TrainerStatsGrid({ stats }) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
      <StatCard label="Assigned Batches" value={stats.assignedBatchesCount} />
      <StatCard label="Active Students" value={stats.activeStudentCount} />
      <StatCard label="Pending Assignment Reviews" value={stats.pendingAssignmentReviews} />
    </div>
  );
}
