import { redirect } from "next/navigation";
import { getStudentDashboardData } from "@/lib/student/dashboard";
import { getMyAssignments } from "@/lib/student/assignments";
import { getMyAttendance } from "@/lib/student/attendance";
import { getMyCertificates } from "@/lib/student/certificates";
import { StudentShell } from "@/components/student/StudentShell";
import { WelcomeSection } from "@/components/student/WelcomeSection";
import { StatsGrid } from "@/components/student/StatsGrid";
import { ContinueLearningCard } from "@/components/student/ContinueLearningCard";
import { MyCoursesPreview } from "@/components/student/MyCoursesPreview";
import { UpcomingBatchCard } from "@/components/student/UpcomingBatchCard";
import { UpcomingClassCard } from "@/components/student/UpcomingClassCard";
import { LmsSummaryCard } from "@/components/student/LmsSummaryCard";
import { QuickActions } from "@/components/student/QuickActions";

export const metadata = {
  title: "Dashboard",
  robots: { index: false, follow: false },
};

export default async function StudentDashboardPage() {
  // The (student) layout already calls requireArea("student"), so we only
  // reach here as an authenticated STUDENT. getStudentDashboardData() reads
  // the session itself rather than accepting an id, so there's nothing to
  // spoof even if this page were reached some other way.
  // Parallelized rather than sequential — each call is already
  // ownership-scoped and independently cheap (Phase 8.6/8.7's own list
  // functions), so this reuses them instead of duplicating their query
  // logic here.
  const [data, assignments, { stats: attendanceStats }, certificates] = await Promise.all([
    getStudentDashboardData(),
    getMyAssignments(),
    getMyAttendance(),
    getMyCertificates(),
  ]);
  if (!data) redirect("/login");

  const { user, activeCourseEnrollments, activeBatchEnrollment, continueLearningEnrollment, nextSession, stats } =
    data;

  const pendingAssignments = assignments.filter((a) => a.status === "PUBLISHED" && !a.submission).length;

  return (
    <StudentShell user={user} title="Dashboard">
      <div className="flex flex-col gap-6">
        <WelcomeSection name={user.name} />

        <StatsGrid stats={stats} />

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="flex flex-col gap-6 lg:col-span-2">
            <ContinueLearningCard enrollment={continueLearningEnrollment} />
            <MyCoursesPreview enrollments={activeCourseEnrollments} />
          </div>
          <div className="flex flex-col gap-6">
            <UpcomingBatchCard enrollment={activeBatchEnrollment} />
            <UpcomingClassCard session={nextSession} />
            <LmsSummaryCard
              pendingAssignments={pendingAssignments}
              attendancePercentage={attendanceStats?.percentage ?? null}
              certificatesCount={certificates.length}
            />
            <QuickActions />
          </div>
        </div>
      </div>
    </StudentShell>
  );
}
