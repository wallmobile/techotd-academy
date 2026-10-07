"use client";

import { useState } from "react";
import Link from "next/link";
import { Container } from "@/components/layout/Container";
import { Button } from "@/components/ui/Button";
import { CheckIcon, Gradient } from "@/components/training/icons";
import { cn } from "@/lib/utils";

// When each support area typically comes into play alongside a course.
const PHASES = [
  {
    when: "During the course",
    items: ["Portfolio Development", "Resume Guidance"],
    text: "Assignments and projects become portfolio pieces and resume lines as you go.",
  },
  {
    when: "In the final weeks",
    items: ["Mock Interviews", "Technical Interview Preparation", "Communication Practice"],
    text: "Practise explaining your work and answering questions out loud.",
  },
  {
    when: "As you apply",
    items: ["Job Search Guidance"],
    text: "Plan where to apply, how to follow up and how to keep improving.",
  },
];

/**
 * "Pick a course, see your career plan": roles, portfolio, resume skills and
 * when career support kicks in — all derived from the selected course's data.
 */
export function CareerPlanner({ plans }) {
  const [slug, setSlug] = useState(plans[0]?.slug);
  const plan = plans.find((item) => item.slug === slug) ?? plans[0];
  if (!plan) return null;

  return (
    <section id="planner" className="scroll-mt-28 bg-white py-12 sm:py-14 lg:py-20">
      <Container>
        <div className="max-w-2xl">
          <p className="text-sm font-semibold uppercase tracking-wide text-primary">Career planner</p>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight text-dark sm:text-4xl">
            Pick a course, see <Gradient>your career plan</Gradient>
          </h2>
          <p className="mt-3 text-base text-muted">
            Each course builds a different set of skills and portfolio pieces. Choose one to see where it can take you
            — and when career support helps along the way.
          </p>
        </div>

        <div className="mt-10 grid gap-6 lg:grid-cols-[280px_1fr]">
          {/* course picker */}
          <div
            role="tablist"
            aria-label="Choose a course"
            className="-mx-6 flex gap-2 overflow-x-auto px-6 pb-1 [scrollbar-width:none] sm:-mx-8 sm:px-8 lg:mx-0 lg:flex-col lg:overflow-visible lg:px-0 [&::-webkit-scrollbar]:hidden"
          >
            {plans.map((item) => {
              const active = item.slug === plan.slug;
              return (
                <button
                  key={item.slug}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  aria-controls="career-plan-panel"
                  onClick={() => setSlug(item.slug)}
                  className={cn(
                    "group flex shrink-0 items-center gap-3 rounded-2xl border px-3.5 py-3 text-left text-sm font-medium transition-all duration-300 lg:w-full",
                    active
                      ? "border-transparent bg-linear-to-r from-primary to-secondary text-white shadow-lg shadow-primary/25 lg:translate-x-1"
                      : "border-border bg-white text-text hover:border-primary/40 hover:text-primary"
                  )}
                >
                  <span
                    className={cn(
                      "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-[10px] font-black transition-colors",
                      active ? "bg-white/20 text-white" : "bg-surface text-primary"
                    )}
                  >
                    {item.initials}
                  </span>
                  <span className="whitespace-nowrap lg:whitespace-normal">{item.title}</span>
                </button>
              );
            })}
          </div>

          {/* plan panel */}
          <div
            key={plan.slug}
            id="career-plan-panel"
            role="tabpanel"
            className="animate-fade-up-in rounded-3xl border border-border bg-surface p-5 sm:p-7"
          >
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted">Your plan</p>
                <h3 className="mt-1 text-2xl font-semibold tracking-tight text-dark">{plan.title}</h3>
                <p className="mt-0.5 text-sm text-muted">
                  {plan.level} · {plan.duration}
                </p>
              </div>
              <Link href={`/courses/${plan.slug}`} className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:underline">
                View course <span aria-hidden="true">→</span>
              </Link>
            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-2">
              <div className="rounded-2xl bg-white p-5 shadow-soft">
                <p className="text-sm font-semibold text-dark">Roles you can aim for</p>
                <ul className="mt-3 flex flex-col gap-2">
                  {plan.roles.map((role, index) => (
                    <li
                      key={role}
                      className="animate-fade-up-in flex items-center gap-2.5 rounded-xl bg-surface px-3 py-2 text-sm font-medium text-dark"
                      style={{ animationDelay: `${index * 70}ms` }}
                    >
                      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-linear-to-br from-primary to-secondary text-white">
                        <CheckIcon />
                      </span>
                      {role}
                    </li>
                  ))}
                </ul>
                <p className="mt-3 text-xs text-muted">Examples of where these skills apply, not job guarantees.</p>
              </div>

              <div className="rounded-2xl bg-white p-5 shadow-soft">
                <p className="text-sm font-semibold text-dark">Portfolio you&apos;ll build</p>
                <ul className="mt-3 flex flex-col gap-2">
                  {plan.projects.map((project, index) => (
                    <li
                      key={project.title}
                      className="animate-fade-up-in rounded-xl bg-surface px-3 py-2.5"
                      style={{ animationDelay: `${index * 70}ms` }}
                    >
                      <p className="text-sm font-semibold text-dark">{project.title}</p>
                      <p className="mt-0.5 text-xs leading-relaxed text-muted">{project.outcome}</p>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="rounded-2xl bg-white p-5 shadow-soft md:col-span-2">
                <p className="text-sm font-semibold text-dark">Skills to put on your resume</p>
                <ul className="mt-3 grid gap-2 sm:grid-cols-2">
                  {plan.outcomes.map((outcome) => (
                    <li key={outcome} className="flex items-start gap-2.5 text-sm leading-snug text-text">
                      <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                        <CheckIcon className="h-2.5 w-2.5" />
                      </span>
                      {outcome}
                    </li>
                  ))}
                </ul>
                <div className="mt-4 flex flex-wrap gap-1.5">
                  {plan.skills.map((skill) => (
                    <span key={skill} className="rounded-full border border-border bg-surface px-2.5 py-1 text-xs font-medium text-text">
                      {skill}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            <div className="mt-6">
              <p className="text-sm font-semibold text-dark">When career support helps</p>
              <ol className="mt-3 grid gap-3 md:grid-cols-3">
                {PHASES.map((phase, index) => (
                  <li key={phase.when} className="relative rounded-2xl border border-border bg-white p-4">
                    <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-linear-to-br from-primary to-secondary text-xs font-bold text-white">
                      {index + 1}
                    </span>
                    <p className="mt-2 text-sm font-semibold text-dark">{phase.when}</p>
                    <p className="mt-1 text-xs leading-relaxed text-muted">{phase.text}</p>
                    <div className="mt-3 flex flex-wrap gap-1">
                      {phase.items.map((item) => (
                        <span key={item} className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">
                          {item}
                        </span>
                      ))}
                    </div>
                  </li>
                ))}
              </ol>
            </div>

            <div className="mt-6 flex flex-wrap items-center gap-3">
              <Button href={`/book-demo?course=${plan.slug}&source=career`} size="sm" className="bg-linear-to-r from-primary to-secondary">
                Plan this with a counsellor
              </Button>
              <Button href={`/courses/${plan.slug}`} variant="outline" size="sm">
                See the full syllabus
              </Button>
            </div>
          </div>
        </div>
      </Container>
    </section>
  );
}
