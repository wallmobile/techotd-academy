"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";

const ITEM_TYPE_LABEL = { lesson: "Lesson", assignment: "Assignment", project: "Project" };

const STATUS_BADGE = {
  completed: { label: "Completed", variant: "success" },
  current: { label: "Current", variant: "primary" },
  "not-started": { label: "Not Started", variant: "neutral" },
};

/**
 * Center content panel. No fabricated video/content URLs — the course
 * catalog only has a title/type for each item, so that's honestly all
 * that's shown, plus a clear "not built yet" notice instead of a fake
 * player.
 *
 * Progress (Phase 8.4): shows the lesson's real Completed/Current/Not
 * Started status and a "Mark as Complete" action that calls the
 * server-validated markLessonCompleteAction passed down as onMarkComplete
 * — this component never decides completion itself, only reports the
 * server's confirmed result.
 */
export function LessonContentPanel({ courseSlug, lesson, status, previous, next, onNavigate, onMarkComplete }) {
  const headingRef = useRef(null);
  const [isPending, startTransition] = useTransition();
  // Tracks which lesson a save failed for, rather than a plain boolean, so
  // the message naturally clears itself when the student moves to a
  // different lesson (no separate effect/reset needed).
  const [errorLessonId, setErrorLessonId] = useState(null);

  // Focus management: when the active lesson changes (via the curriculum
  // sidebar or Prev/Next), move focus to the new lesson's heading so
  // keyboard and screen-reader users land on the content that actually
  // changed, instead of focus silently staying on a now-stale control.
  useEffect(() => {
    headingRef.current?.focus();
  }, [lesson?.id]);

  if (!lesson) {
    return (
      <Card className="flex flex-col items-center gap-2 py-12 text-center">
        <h2 className="text-base font-semibold text-dark">No curriculum available</h2>
        <p className="max-w-sm text-sm text-muted">
          This course doesn&apos;t have published curriculum items yet.
        </p>
      </Card>
    );
  }

  const isCompleted = status === "completed";
  const badge = STATUS_BADGE[status] ?? STATUS_BADGE["not-started"];

  function handleMarkComplete() {
    startTransition(async () => {
      const ok = await onMarkComplete(lesson.id);
      setErrorLessonId(ok ? null : lesson.id);
    });
  }

  const error = errorLessonId === lesson.id;

  return (
    <Card className="flex flex-col gap-5">
      <div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="neutral">{ITEM_TYPE_LABEL[lesson.type] ?? "Lesson"}</Badge>
          <span className="text-xs text-muted">{lesson.moduleTitle}</span>
          <Badge variant={badge.variant} aria-label={`Lesson status: ${badge.label}`}>
            {badge.label}
          </Badge>
        </div>
        <h2 ref={headingRef} tabIndex={-1} className="mt-2 text-lg font-semibold text-dark outline-none">
          {lesson.title}
        </h2>
      </div>

      <div className="flex flex-col items-center gap-2 rounded-md border border-dashed border-border bg-surface px-6 py-12 text-center">
        <p className="text-sm font-medium text-text">Lesson content will be available here.</p>
        <p className="max-w-sm text-xs text-muted">
          Video, written content and downloadable resources for this {(ITEM_TYPE_LABEL[lesson.type] ?? "lesson").toLowerCase()}{" "}
          haven&apos;t been added yet.
        </p>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
        {isCompleted ? (
          <p role="status" className="text-sm font-medium text-success">
            ✓ Marked complete
          </p>
        ) : (
          <Button
            size="sm"
            onClick={handleMarkComplete}
            disabled={isPending}
            loading={isPending}
            aria-label={`Mark "${lesson.title}" as complete`}
          >
            Mark as Complete
          </Button>
        )}
        {error && (
          <p role="alert" className="text-xs font-medium text-warning">
            Couldn&apos;t save that just now — please try again.
          </p>
        )}
      </div>

      <div className="flex items-center justify-between gap-3 border-t border-border pt-4">
        {previous ? (
          <Button variant="outline" size="sm" onClick={() => onNavigate(previous.id)}>
            ← Previous Lesson
          </Button>
        ) : (
          <Button variant="outline" size="sm" disabled title="This is the first item in the course">
            ← Previous Lesson
          </Button>
        )}
        <Link
          href={`/student/courses/${courseSlug}`}
          className="text-sm font-medium text-primary hover:text-primary-hover"
        >
          Back to Course
        </Link>
        {next ? (
          <Button size="sm" onClick={() => onNavigate(next.id)}>
            Next Lesson →
          </Button>
        ) : (
          <Button size="sm" disabled title="This is the last item in the course">
            Next Lesson →
          </Button>
        )}
      </div>
    </Card>
  );
}
