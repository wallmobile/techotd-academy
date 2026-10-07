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

export function StatsGrid({ stats }) {
  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      <StatCard label="Active Courses" value={stats.activeCourses} />
      <StatCard label="Completed Courses" value={stats.completedCourses} />
      <StatCard label="Current Batch" value={stats.currentBatchLabel} />
      <StatCard
        label="Overall Progress"
        value={`${stats.overallProgress}%`}
        hint="Average across active courses"
      />
    </div>
  );
}
