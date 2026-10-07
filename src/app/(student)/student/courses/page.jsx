import { getMyCourseEnrollments } from "@/lib/student/courses";
import { getCurrentUser } from "@/lib/auth/currentUser";
import { StudentShell } from "@/components/student/StudentShell";
import { MyCourseCard } from "@/components/student/MyCourseCard";
import { Button } from "@/components/ui/Button";

export const metadata = {
  title: "My Courses",
  robots: { index: false, follow: false },
};

export default async function MyCoursesPage() {
  // (student) layout already enforces requireArea("student"); both
  // getCurrentUser() and getMyCourseEnrollments() independently derive the
  // student from the session cookie, never from anything this page passes in.
  const user = await getCurrentUser();
  const enrollments = await getMyCourseEnrollments();

  return (
    <StudentShell user={user} title="My Courses">
      <div className="flex flex-col gap-6">
        <div>
          <h2 className="text-xl font-semibold tracking-tight text-dark">My Courses</h2>
          <p className="mt-1 text-sm text-muted">Courses you&apos;re enrolled in through TechOTD Academy.</p>
        </div>

        {enrollments.length === 0 ? (
          <div className="flex flex-col items-start gap-4 rounded-md border border-border bg-white p-8 text-center sm:items-center">
            <p className="text-sm text-muted">You&apos;re not enrolled in any course yet.</p>
            <div className="flex flex-wrap justify-center gap-3">
              <Button href="/courses">Explore Courses</Button>
              <Button href="/book-demo" variant="outline">
                Request Counselling
              </Button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {enrollments.map((enrollment) => (
              <MyCourseCard key={enrollment.id} enrollment={enrollment} />
            ))}
          </div>
        )}
      </div>
    </StudentShell>
  );
}
