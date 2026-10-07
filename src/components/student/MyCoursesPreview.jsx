import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";

export function MyCoursesPreview({ enrollments }) {
  return (
    <Card>
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-sm font-semibold text-dark">My Courses</h3>
        {enrollments.length > 0 && (
          <Link href="/student/courses" className="text-xs font-medium text-primary hover:text-primary-hover">
            View all
          </Link>
        )}
      </div>

      {enrollments.length === 0 ? (
        <div className="mt-4 flex flex-col items-start gap-3">
          <p className="text-sm text-muted">You haven&apos;t enrolled in any courses yet.</p>
          <Button href="/courses" variant="outline" size="sm">
            Browse Courses
          </Button>
        </div>
      ) : (
        <ul className="mt-4 flex flex-col divide-y divide-border">
          {enrollments.slice(0, 3).map(({ course, status }) => (
            <li key={course.slug} className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
              <div className="min-w-0">
                <Link
                  href={`/student/courses/${course.slug}`}
                  className="block truncate text-sm font-medium text-dark hover:text-primary"
                >
                  {course.title}
                </Link>
                <p className="text-xs text-muted">{course.category}</p>
              </div>
              <Badge variant={status === "COMPLETED" ? "success" : "primary"}>{status}</Badge>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
