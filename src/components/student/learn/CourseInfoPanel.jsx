import { displayDuration } from "@/data/courses";
import Link from "next/link";
import { Card } from "@/components/ui/Card";

export function CourseInfoPanel({ course, batchEnrollment }) {
  return (
    <div className="flex flex-col gap-4">
      <Card>
        <h3 className="text-sm font-semibold text-dark">Course Information</h3>
        <dl className="mt-3 flex flex-col gap-1.5 text-xs">
          <div className="flex justify-between gap-3">
            <dt className="text-muted">Level</dt>
            <dd className="font-medium text-text">{course.levelLabel}</dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt className="text-muted">Duration</dt>
            <dd className="font-medium text-text">{displayDuration(course)}</dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt className="text-muted">Learning Mode</dt>
            <dd className="font-medium text-text">{course.modes.join(" + ")}</dd>
          </div>
        </dl>
        <div className="mt-4">
          <p className="text-xs font-medium uppercase tracking-wide text-muted">Technologies</p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {course.technologies.map((tech) => (
              <span key={tech} className="rounded-full bg-surface px-2.5 py-1 text-xs text-text">
                {tech}
              </span>
            ))}
          </div>
        </div>
      </Card>

      <Card>
        <h3 className="text-sm font-semibold text-dark">Your Batch</h3>
        {batchEnrollment ? (
          <dl className="mt-3 flex flex-col gap-1.5 text-xs">
            <div className="flex justify-between gap-3">
              <dt className="text-muted">Schedule</dt>
              <dd className="font-medium text-text">{batchEnrollment.batch.schedule}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-muted">Location</dt>
              <dd className="font-medium text-text">{batchEnrollment.batch.location}</dd>
            </div>
          </dl>
        ) : (
          <p className="mt-3 text-sm text-muted">No batch assigned yet.</p>
        )}
      </Card>

      <div className="flex flex-col gap-1 text-sm">
        <Link href={`/student/courses/${course.slug}`} className="font-medium text-primary hover:text-primary-hover">
          View Course Details
        </Link>
        <Link href="/student/courses" className="font-medium text-primary hover:text-primary-hover">
          Back to My Courses
        </Link>
      </div>
    </div>
  );
}
