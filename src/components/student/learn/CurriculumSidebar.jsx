"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

const ITEM_TYPE_LABEL = { lesson: "Lesson", assignment: "Assignment", project: "Project" };

const STATUS_LABEL = { completed: "Completed", current: "Current", "not-started": "Not started" };
const STATUS_DOT_CLASS = {
  completed: "bg-success text-white",
  current: "bg-primary text-white",
  "not-started": "bg-surface text-muted border border-border",
};

function LessonStatusIndicator({ status }) {
  const label = STATUS_LABEL[status] || STATUS_LABEL["not-started"];
  return (
    <span className="ml-auto flex shrink-0 items-center gap-1.5">
      <span
        aria-hidden="true"
        className={cn(
          "flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[10px] font-bold",
          STATUS_DOT_CLASS[status] || STATUS_DOT_CLASS["not-started"]
        )}
      >
        {status === "completed" ? "✓" : ""}
      </span>
      <span className="text-[10px] font-medium text-muted">{label}</span>
    </span>
  );
}

/**
 * Accessible curriculum navigator. Each module is an accordion section
 * (h3 > button, aria-expanded/aria-controls, role="region" panel — same
 * pattern as the public CurriculumAccordion); each lesson inside is a
 * button that selects it as the active lesson, marked with
 * aria-current when it is.
 *
 * `lessonStatus` (Phase 8.4) maps each lesson id to "completed" | "current"
 * | "not-started", shown as both a visual dot and a text label per item 6
 * of the spec ("accessible visual + text indication") — never icon-only.
 */
export function CurriculumSidebar({ curriculum, activeLessonId, lessonStatus = {}, onSelectLesson, idPrefix = "curriculum" }) {
  const activeModuleIndex = curriculum.flatLessons.find((l) => l.id === activeLessonId)?.moduleIndex ?? 0;
  const [openIndex, setOpenIndex] = useState(activeModuleIndex);

  return (
    <nav aria-label="Course curriculum" className="flex flex-col gap-3">
      {curriculum.modules.map((module) => {
        const open = openIndex === module.index;
        const panelId = `${idPrefix}-panel-${module.index}`;
        const buttonId = `${idPrefix}-trigger-${module.index}`;

        return (
          <div key={module.title} className="rounded-md border border-border bg-white">
            <h3>
              <button
                id={buttonId}
                type="button"
                aria-expanded={open}
                aria-controls={panelId}
                onClick={() => setOpenIndex(open ? -1 : module.index)}
                className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-primary"
              >
                <span>
                  <span className="text-sm font-semibold text-dark">{module.title}</span>
                  <span className="mt-0.5 block text-xs text-muted">
                    {module.lessons.length} items{module.duration ? ` • ${module.duration}` : ""}
                  </span>
                </span>
                <span
                  aria-hidden="true"
                  className={cn("shrink-0 text-base text-muted transition-transform", open && "rotate-45 text-primary")}
                >
                  +
                </span>
              </button>
            </h3>
            <div id={panelId} role="region" aria-labelledby={buttonId} hidden={!open} className="px-2 pb-3">
              <ul className="flex flex-col gap-1">
                {module.lessons.map((lesson) => {
                  const isActive = lesson.id === activeLessonId;
                  const status = lessonStatus[lesson.id] || "not-started";
                  return (
                    <li key={lesson.id}>
                      <button
                        type="button"
                        aria-current={isActive ? "true" : undefined}
                        aria-label={`${lesson.title} — ${STATUS_LABEL[status] || STATUS_LABEL["not-started"]}`}
                        onClick={() => onSelectLesson(lesson.id)}
                        className={cn(
                          "flex w-full items-start gap-2.5 rounded-sm px-3 py-2 text-left text-sm transition-colors",
                          "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary",
                          isActive ? "bg-primary/10 text-primary font-medium" : "text-text hover:bg-surface"
                        )}
                      >
                        <span className="mt-0.5 shrink-0 rounded-full bg-surface px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-muted">
                          {ITEM_TYPE_LABEL[lesson.type] ?? "Lesson"}
                        </span>
                        <span className="flex-1">{lesson.title}</span>
                        <LessonStatusIndicator status={status} />
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          </div>
        );
      })}
    </nav>
  );
}
