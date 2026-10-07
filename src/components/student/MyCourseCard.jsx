import { displayDuration } from "@/data/courses";
import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";

const MAX_TAGS = 4;

const STATUS_VARIANT = {
  ACTIVE: "primary",
  COMPLETED: "success",
};

export function MyCourseCard({ enrollment }) {
  const { course, status, progress } = enrollment;
  const extraTagCount = Math.max(course.technologies.length - MAX_TAGS, 0);

  return (
    <Card hoverable className="flex h-full flex-col">
      <div className="flex items-start justify-between gap-3">
        <Badge variant="neutral">{course.category}</Badge>
        <Badge variant={STATUS_VARIANT[status] || "neutral"}>{status}</Badge>
      </div>

      <h3 className="mt-3 text-base font-semibold text-dark">
        <Link href={`/student/courses/${course.slug}`} className="hover:text-primary">
          {course.title}
        </Link>
      </h3>

      <dl className="mt-3 flex flex-col gap-1.5 text-xs">
        <div className="flex justify-between gap-3">
          <dt className="text-muted">Level</dt>
          <dd className="font-medium text-text">{course.levelLabel}</dd>
        </div>
        <div className="flex justify-between gap-3">
          <dt className="text-muted">Duration</dt>
          <dd className="font-medium text-text">{displayDuration(course)}</dd>
        </div>
      </dl>

      <div className="mt-4 flex flex-wrap gap-1.5">
        {course.technologies.slice(0, MAX_TAGS).map((tech) => (
          <span key={tech} className="rounded-full bg-surface px-2.5 py-1 text-xs text-text">
            {tech}
          </span>
        ))}
        {extraTagCount > 0 && (
          <span className="rounded-full bg-surface px-2.5 py-1 text-xs text-muted">
            +{extraTagCount} more
          </span>
        )}
      </div>

      <div className="mt-4">
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

      <Link
        href={`/student/courses/${course.slug}`}
        className="mt-5 inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:text-primary-hover"
      >
        View Course
        <span aria-hidden="true">→</span>
      </Link>
    </Card>
  );
}
