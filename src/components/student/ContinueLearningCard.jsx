import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";

export function ContinueLearningCard({ enrollment }) {
  if (!enrollment) {
    return (
      <Card className="flex flex-col items-start gap-3">
        <h3 className="text-sm font-semibold text-dark">Continue Learning</h3>
        <p className="text-sm text-muted">No courses enrolled yet.</p>
        <Button href="/courses" size="sm">
          Explore Courses
        </Button>
      </Card>
    );
  }

  const { course, progress, resumeLessonId } = enrollment;
  // Only offer a real "resume where you left off" link when actual
  // progress exists (a lesson_progress row for this student/course) — see
  // src/lib/student/dashboard.js. Otherwise this still points at the
  // course's learning workspace, just starting from its first lesson.
  const hasProgress = Boolean(resumeLessonId);
  const learnHref = hasProgress
    ? `/student/courses/${course.slug}/learn?lesson=${resumeLessonId}`
    : `/student/courses/${course.slug}/learn`;

  return (
    <Card className="flex flex-col gap-3">
      <h3 className="text-sm font-semibold text-dark">Continue Learning</h3>
      <div className="flex items-start justify-between gap-3">
        <div>
          <Link href={`/courses/${course.slug}`} className="text-base font-semibold text-dark hover:text-primary">
            {course.title}
          </Link>
          <p className="mt-1 text-xs text-muted">{course.category}</p>
        </div>
        <Badge variant="neutral">{course.levelLabel}</Badge>
      </div>

      <div>
        <div
          role="progressbar"
          aria-valuenow={progress}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`${course.title} progress: ${progress}%`}
          className="h-2 w-full overflow-hidden rounded-full bg-surface"
        >
          <div className="h-full rounded-full bg-primary" style={{ width: `${progress}%` }} />
        </div>
        <p className="mt-1.5 text-xs text-muted">{progress}% complete</p>
      </div>

      <Button href={learnHref} variant="outline" size="sm" className="self-start">
        {hasProgress ? "Continue Learning" : "Start Learning"}
      </Button>
    </Card>
  );
}
