"use client";

import { useState } from "react";
import { Container } from "@/components/layout/Container";
import { Button } from "@/components/ui/Button";
import { Gradient } from "@/components/training/icons";
import { cn } from "@/lib/utils";

const itemTypes = {
  lesson: { label: "Lesson", style: "bg-primary/10 text-primary" },
  assignment: { label: "Assignment", style: "bg-warning/10 text-warning" },
  project: { label: "Project", style: "bg-secondary/10 text-secondary" },
};

// "Module 01 — Foundations" -> { tag: "Module 01", name: "Foundations" }
function splitTitle(title) {
  const [tag, ...rest] = title.split("—");
  return rest.length > 0 ? { tag: tag.trim(), name: rest.join("—").trim() } : { tag: "", name: title };
}

// The module's closing hands-on item doubles as its "you'll finish with" deliverable.
function deliverableOf(module) {
  const handsOn = module.items.filter((item) => item.type !== "lesson");
  return handsOn.length > 0 ? handsOn[handsOn.length - 1] : null;
}

const clean = (text) => (text ? text.replace(" (sample)", "") : text);

// "3 Weeks" -> 3 (number of weeks), anything unparseable -> 0
const weeksOf = (duration) => {
  const match = /(\d+)\s*week/i.exec(duration || "");
  return match ? Number(match[1]) : 0;
};

// Cumulative week ranges, e.g. ["Weeks 1–3", "Weeks 4–6"]; empty when durations aren't in weeks.
function weekRanges(modules) {
  let cursor = 0;
  return modules.map((module) => {
    const length = weeksOf(module.duration);
    if (!length) return "";
    const from = cursor + 1;
    cursor += length;
    return length === 1 ? `Week ${from}` : `Weeks ${from}–${cursor}`;
  });
}

export function CurriculumAccordion({ course }) {
  const [openIndex, setOpenIndex] = useState(0);

  const countType = (predicate) =>
    course.modules.reduce((total, module) => total + module.items.filter((item) => predicate(item.type)).length, 0);
  const totalLessons = countType((type) => type === "lesson");
  const totalHandsOn = countType((type) => type !== "lesson");
  const ranges = weekRanges(course.modules);
  const totalWeeks = course.modules.reduce((total, module) => total + weeksOf(module.duration), 0);
  const summary = [
    { value: course.modules.length, label: "Modules" },
    { value: totalLessons, label: "Lessons" },
    { value: totalHandsOn, label: "Hands-on" },
    ...(totalWeeks ? [{ value: totalWeeks, label: "Weeks" }] : []),
  ];

  return (
    <section id="curriculum" className="scroll-mt-36 bg-white py-12 sm:py-14 lg:py-20">
      <Container>
        {/* Roadmap: segment width is proportional to weeks. Click to jump to a module. */}
        {totalWeeks > 0 && (
          <div className="mb-12">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted">
              Your roadmap · {totalWeeks} weeks
            </p>
            <ol className="-mx-1 mt-3 flex items-stretch gap-2 overflow-x-auto px-1 pb-4 pt-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {course.modules.map((module, index) => {
                const weeks = weeksOf(module.duration) || 1;
                const { name } = splitTitle(module.title);
                const isOpen = openIndex === index;
                return (
                  <li key={module.title} style={{ flexGrow: weeks, flexBasis: `${weeks * 3.2}rem` }} className="flex min-w-36">
                    <button
                      type="button"
                      onClick={() => setOpenIndex(index)}
                      aria-label={`Open ${name}`}
                      className={cn(
                        "group flex h-full w-full flex-col justify-between gap-1 rounded-2xl border p-3.5 text-left transition-all duration-300",
                        isOpen
                          ? "border-transparent bg-linear-to-br from-primary to-secondary text-white shadow-lg shadow-primary/25"
                          : "border-border bg-surface hover:-translate-y-0.5 hover:border-primary/30"
                      )}
                    >
                      <span className={cn("block text-[10px] font-semibold uppercase tracking-wider", isOpen ? "text-white/75" : "text-muted")}>
                        {ranges[index] || `Module ${index + 1}`}
                      </span>
                      <span className="block text-[13px] font-semibold leading-snug">{name}</span>
                    </button>
                  </li>
                );
              })}
            </ol>
          </div>
        )}

        <div className="grid gap-10 lg:grid-cols-[0.8fr_1.2fr] lg:gap-14">
          {/* Summary */}
          <div className="lg:sticky lg:top-44 lg:self-start">
            <p className="text-sm font-semibold uppercase tracking-wide text-primary">Curriculum</p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight text-dark sm:text-4xl">
              What you&apos;ll cover, <Gradient>module by module</Gradient>
            </h2>

            <dl className={cn("mt-8 grid gap-3", summary.length === 4 ? "grid-cols-2 sm:grid-cols-4 lg:grid-cols-2 xl:grid-cols-4" : "grid-cols-3")}>
              {summary.map((item) => (
                <div key={item.label} className="rounded-2xl border border-border bg-white p-4 text-center shadow-soft">
                  <dd className="bg-linear-to-r from-primary to-secondary bg-clip-text text-3xl font-bold text-transparent">
                    {item.value}
                  </dd>
                  <dt className="mt-1 text-[11px] font-semibold uppercase tracking-wider text-muted">{item.label}</dt>
                </div>
              ))}
            </dl>

            <div className="mt-5 rounded-3xl border border-border bg-white p-5 shadow-card">
              <p className="text-sm font-semibold text-dark">Want the full syllabus walkthrough?</p>
              <p className="mt-1 text-sm text-muted">Talk to a counsellor about how each module fits your goals.</p>
              <Button href={`/book-demo?course=${course.slug}&source=course-detail`} size="sm" className="mt-4 bg-linear-to-r from-primary to-secondary">
                Book Free Counselling
              </Button>
            </div>
            <p className="mt-4 text-xs leading-relaxed text-muted">
              Module order and durations are illustrative and may be adjusted by batch.
            </p>
          </div>

          {/* Accordion */}
          <div className="flex flex-col gap-3">
            {course.modules.map((module, index) => {
              const open = openIndex === index;
              const panelId = `curriculum-panel-${index}`;
              const buttonId = `curriculum-trigger-${index}`;
              const { tag, name } = splitTitle(module.title);

              return (
                <div
                  key={module.title}
                  className={cn(
                    "relative overflow-hidden rounded-2xl border bg-white transition-all duration-300",
                    open ? "border-primary/30 shadow-card" : "border-border hover:border-primary/20"
                  )}
                >
                  <span
                    aria-hidden="true"
                    className={cn(
                      "absolute inset-y-0 left-0 w-1 origin-top bg-linear-to-b from-primary to-secondary transition-transform duration-300",
                      open ? "scale-y-100" : "scale-y-0"
                    )}
                  />
                  <h3>
                    <button
                      id={buttonId}
                      type="button"
                      aria-expanded={open}
                      aria-controls={panelId}
                      onClick={() => setOpenIndex(open ? -1 : index)}
                      className="flex w-full items-center gap-4 px-5 py-4 text-left focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-primary"
                    >
                      <span
                        className={cn(
                          "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-sm font-bold transition-all duration-300",
                          open ? "bg-linear-to-br from-primary to-secondary text-white shadow-md shadow-primary/25" : "bg-surface text-primary"
                        )}
                      >
                        {String(index + 1).padStart(2, "0")}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center gap-2">
                          {tag && <span className="text-[10px] font-semibold uppercase tracking-wider text-muted">{tag}</span>}
                          {ranges[index] && (
                            <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">
                              {ranges[index]}
                            </span>
                          )}
                        </span>
                        <span className="block text-base font-semibold text-dark">{name}</span>
                        <span className="mt-0.5 block text-xs text-muted">
                          {module.items.length} items{module.duration ? ` · ${clean(module.duration)}` : ""}
                        </span>
                      </span>
                      <span
                        aria-hidden="true"
                        className={cn(
                          "flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-lg transition-all duration-300",
                          open ? "rotate-45 bg-linear-to-br from-primary to-secondary text-white" : "bg-surface text-muted"
                        )}
                      >
                        +
                      </span>
                    </button>
                  </h3>
                  <div
                    id={panelId}
                    role="region"
                    aria-labelledby={buttonId}
                    aria-hidden={!open}
                    className={cn("grid transition-[grid-template-rows] duration-300 ease-out", open ? "grid-rows-[1fr]" : "grid-rows-[0fr]")}
                  >
                    <div className="overflow-hidden">
                      {module.summary && (
                        <p className="mx-5 border-t border-border pt-4 text-sm leading-relaxed text-muted">{module.summary}</p>
                      )}
                      <ul className={cn("mx-5 mb-5 flex flex-col gap-2 pt-4", !module.summary && "border-t border-border")}>
                        {module.items.map((item) => {
                          const type = itemTypes[item.type] ?? itemTypes.lesson;
                          return (
                            <li key={item.title} className="flex items-center gap-3 rounded-xl bg-surface px-3.5 py-2.5 text-sm text-text">
                              <span className={cn("w-24 shrink-0 rounded-full px-2.5 py-0.5 text-center text-[10px] font-bold uppercase tracking-wide", type.style)}>
                                {type.label}
                              </span>
                              {clean(item.title)}
                            </li>
                          );
                        })}
                      </ul>
                      {deliverableOf(module) && (
                        <div className="mx-5 mb-5 flex items-start gap-3 rounded-2xl border border-primary/20 bg-primary/5 p-4">
                          <span aria-hidden="true" className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-linear-to-br from-primary to-secondary text-white">
                            ✓
                          </span>
                          <div>
                            <p className="text-[10px] font-semibold uppercase tracking-wider text-primary">You&apos;ll finish this module with</p>
                            <p className="mt-0.5 text-sm font-medium leading-snug text-dark">{clean(deliverableOf(module).title)}</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </Container>
    </section>
  );
}
