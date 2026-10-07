"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/Badge";
import { CurriculumSidebar } from "@/components/student/learn/CurriculumSidebar";
import { LessonContentPanel } from "@/components/student/learn/LessonContentPanel";
import { CourseInfoPanel } from "@/components/student/learn/CourseInfoPanel";
import { getLessonById, getAdjacentLessons } from "@/lib/student/curriculum";
import { recordLessonAccessAction, markLessonCompleteAction } from "@/lib/student/progressActions";

function updateLessonQueryParam(lessonId) {
  if (typeof window === "undefined") return;
  const url = new URL(window.location.href);
  url.searchParams.set("lesson", lessonId);
  // Cosmetic URL update only (so the lesson is deep-linkable/shareable
  // and survives a reload) — deliberately not next/navigation's router,
  // which would re-fetch this Server Component on every lesson click for
  // content that's already fully loaded client-side.
  window.history.replaceState({}, "", url);
}

export function LearnWorkspace({ courseSlug, course, curriculum, initialLessonId, batchEnrollment, initialProgress }) {
  const [activeLessonId, setActiveLessonId] = useState(initialLessonId);
  const [mobileCurriculumOpen, setMobileCurriculumOpen] = useState(false);

  // Completion state (Phase 8.4): initialized from the real, persisted
  // progress the server already computed for the page load, then kept in
  // sync locally from what markLessonCompleteAction returns — never
  // guessed or optimistically marked complete before the server confirms
  // it actually saved.
  const [completedLessonIds, setCompletedLessonIds] = useState(
    () => new Set(initialProgress?.completedLessonIds || [])
  );

  const totalCount = initialProgress?.totalCount ?? curriculum.flatLessons.length;
  const completedCount = completedLessonIds.size;
  const percent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;
  const isComplete = totalCount > 0 && completedCount === totalCount;

  const activeLesson = getLessonById(curriculum, activeLessonId);
  const { previous, next } = getAdjacentLessons(curriculum, activeLessonId);

  // Per-lesson status for the curriculum sidebar: completed (persisted),
  // current (whichever lesson is open right now), or not started.
  // "Current" is derived from the live activeLessonId rather than the
  // server's last-accessed timestamp, so it always matches what's on
  // screen instead of going stale the moment the student clicks around.
  const lessonStatus = useMemo(() => {
    const status = {};
    for (const lesson of curriculum.flatLessons) {
      if (completedLessonIds.has(lesson.id)) status[lesson.id] = "completed";
      else if (lesson.id === activeLessonId) status[lesson.id] = "current";
      else status[lesson.id] = "not-started";
    }
    return status;
  }, [curriculum, completedLessonIds, activeLessonId]);

  // Records "last accessed" once per actual lesson change — not on every
  // render/keystroke — so the dashboard's Continue Learning can resume at
  // the right lesson later. Fire-and-forget: a failed/blocked write here
  // shouldn't block the student from reading the lesson they clicked.
  useEffect(() => {
    if (!activeLessonId) return;
    recordLessonAccessAction(courseSlug, activeLessonId).catch(() => {});
  }, [courseSlug, activeLessonId]);

  function selectLesson(lessonId) {
    setActiveLessonId(lessonId);
    updateLessonQueryParam(lessonId);
    setMobileCurriculumOpen(false);
  }

  async function handleMarkComplete(lessonId) {
    const result = await markLessonCompleteAction(courseSlug, lessonId);
    if (result?.ok) {
      setCompletedLessonIds(new Set(result.completedLessonIds));
      return true;
    }
    return false;
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3 border-b border-border pb-5 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <Link href="/student/courses" className="text-xs font-medium text-primary hover:text-primary-hover">
            ← Back to My Courses
          </Link>
          <h1 className="mt-1 text-xl font-semibold tracking-tight text-dark">{course.title}</h1>
          {activeLesson && (
            <p className="mt-1 text-sm text-muted">Current module: {activeLesson.moduleTitle}</p>
          )}
        </div>
        <div className="flex flex-col items-start gap-1 sm:items-end">
          <Badge variant={isComplete ? "success" : "neutral"}>{percent}% complete</Badge>
          <p className="text-xs text-muted">
            {completedCount} of {totalCount} lessons completed
          </p>
        </div>
      </div>

      {isComplete && (
        <p
          role="status"
          className="rounded-md border border-success/30 bg-success/10 px-4 py-3 text-sm font-medium text-success"
        >
          Course learning content completed
        </p>
      )}

      {/* Mobile/tablet: curriculum is a collapsible section, not a persistent column. */}
      <div className="lg:hidden">
        <button
          type="button"
          aria-expanded={mobileCurriculumOpen}
          aria-controls="mobile-curriculum-panel"
          onClick={() => setMobileCurriculumOpen((v) => !v)}
          className="flex w-full items-center justify-between rounded-md border border-border bg-white px-4 py-3 text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        >
          <span className="text-sm font-semibold text-dark">Course Curriculum</span>
          <span aria-hidden="true" className="text-muted">{mobileCurriculumOpen ? "−" : "+"}</span>
        </button>
        <div id="mobile-curriculum-panel" hidden={!mobileCurriculumOpen} className="mt-3">
          <CurriculumSidebar
            curriculum={curriculum}
            activeLessonId={activeLessonId}
            lessonStatus={lessonStatus}
            onSelectLesson={selectLesson}
            idPrefix="mobile-curriculum"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[280px_1fr]">
        <aside className="hidden lg:block">
          <div className="sticky top-20">
            <CurriculumSidebar
              curriculum={curriculum}
              activeLessonId={activeLessonId}
              lessonStatus={lessonStatus}
              onSelectLesson={selectLesson}
              idPrefix="desktop-curriculum"
            />
          </div>
        </aside>

        <div className="flex flex-col gap-6">
          <LessonContentPanel
            courseSlug={course.slug}
            lesson={activeLesson}
            status={activeLesson ? lessonStatus[activeLesson.id] : null}
            previous={previous}
            next={next}
            onNavigate={selectLesson}
            onMarkComplete={handleMarkComplete}
          />
          <CourseInfoPanel course={course} batchEnrollment={batchEnrollment} />
        </div>
      </div>
    </div>
  );
}
