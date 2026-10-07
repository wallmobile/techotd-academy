import { getMyAttendance } from "@/lib/student/attendance";
import { getCurrentUser } from "@/lib/auth/currentUser";
import { StudentShell } from "@/components/student/StudentShell";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";

export const metadata = {
  title: "Attendance",
  robots: { index: false, follow: false },
};

const STATUS_VARIANT = { PRESENT: "success", LATE: "warning", ABSENT: "danger", EXCUSED: "neutral" };

function formatMarkedAt(markedAt) {
  const date = new Date(markedAt.replace(" ", "T") + "Z");
  if (Number.isNaN(date.getTime())) return markedAt;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function StatCard({ label, value, emphasized = false }) {
  return (
    <Card className={emphasized ? "border-primary/30 bg-primary/5 p-5" : "p-5"}>
      <p className="text-xs font-medium uppercase tracking-wide text-muted">{label}</p>
      <p className={`mt-2 text-2xl font-semibold sm:text-3xl ${emphasized ? "text-primary" : "text-dark"}`}>
        {value}
      </p>
    </Card>
  );
}

export default async function StudentAttendancePage() {
  // getMyAttendance() derives the student from the session itself — there
  // is no id anywhere in this route to spoof another student's records.
  const [{ records, stats }, user] = await Promise.all([getMyAttendance(), getCurrentUser()]);

  return (
    <StudentShell user={user} title="Attendance">
      <div className="flex flex-col gap-6">
        <p className="text-sm text-muted">Your attendance across the classes you&apos;ve been marked for.</p>

        {!stats ? (
          <EmptyState
            title="No attendance records yet"
            description="Attendance marked by your trainer for scheduled classes will show up here."
          />
        ) : (
          <>
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
              <StatCard label="Total Classes" value={stats.total} />
              <StatCard label="Attended" value={stats.present} />
              <StatCard label="Absent" value={stats.absent} />
              <StatCard label="Late" value={stats.late} />
              <StatCard label="Attendance %" value={`${stats.percentage}%`} emphasized />
            </div>

            <section aria-labelledby="attendance-history-heading" className="flex flex-col gap-3">
              <h2 id="attendance-history-heading" className="text-sm font-semibold text-dark">
                Attendance History
              </h2>
              <ul className="flex flex-col gap-3">
                {records.map((record) => (
                  <li key={record.id}>
                    <Card className="flex flex-wrap items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-dark">
                          {record.session?.title || record.course?.title || "Class session"}
                        </p>
                        <p className="mt-0.5 text-xs text-muted">
                          {record.course?.title}
                          {record.session ? ` • ${formatMarkedAt(record.session.sessionDate + " 00:00:00")}` : ""}
                          {!record.session ? ` • Marked ${formatMarkedAt(record.markedAt)}` : ""}
                        </p>
                      </div>
                      <Badge variant={STATUS_VARIANT[record.status] || "neutral"}>{record.status}</Badge>
                    </Card>
                  </li>
                ))}
              </ul>
            </section>
          </>
        )}
      </div>
    </StudentShell>
  );
}
