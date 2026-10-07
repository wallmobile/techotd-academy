"use client";

import { useEffect, useState } from "react";
import { Container } from "@/components/layout/Container";
import { Button } from "@/components/ui/Button";
import { CheckIcon, Gradient } from "@/components/training/icons";
import { cn } from "@/lib/utils";

const STORAGE_KEY = "techotd-interview-checklist";

const groups = [
  {
    title: "Your resume & profile",
    items: [
      "Resume fits on one page and leads with projects and skills",
      "Every project has a one-line outcome, not just a tech list",
      "GitHub profile is tidy, with readable README files",
      "LinkedIn headline says what you do and what you're learning",
    ],
  },
  {
    title: "Your projects",
    items: [
      "You can explain what each project does and why you built it",
      "You can describe one problem you hit and how you solved it",
      "At least one project is deployed and open in a browser tab",
    ],
  },
  {
    title: "Technical preparation",
    items: [
      "Revised the core concepts of your main technology",
      "Practised explaining concepts out loud, in simple words",
      "Solved a few practice problems under a time limit",
      "Reviewed how your project handles data, errors and security",
    ],
  },
  {
    title: "The day before",
    items: [
      "Researched the company and the role",
      "Prepared two or three questions to ask the interviewer",
      "Tested your camera, microphone and internet (for online rounds)",
    ],
  },
];

const allItems = groups.flatMap((group) => group.items);

/**
 * A tickable interview-readiness checklist. Progress is remembered in the
 * browser (localStorage, best-effort) so it survives a refresh.
 */
export function InterviewChecklist() {
  const [checked, setChecked] = useState(() => new Set());

  useEffect(() => {
    try {
      const saved = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? "[]");
      // Hydrate from browser storage after mount (reading it during render would mismatch SSR).
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (Array.isArray(saved)) setChecked(new Set(saved.filter((item) => allItems.includes(item))));
    } catch {
      // storage unavailable — the checklist still works for this visit
    }
  }, []);

  const toggle = (item) => {
    setChecked((current) => {
      const next = new Set(current);
      if (next.has(item)) next.delete(item);
      else next.add(item);
      try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify([...next]));
      } catch {
        // ignore
      }
      return next;
    });
  };

  const reset = () => {
    setChecked(new Set());
    try {
      window.localStorage.removeItem(STORAGE_KEY);
    } catch {
      // ignore
    }
  };

  const done = checked.size;
  const percent = Math.round((done / allItems.length) * 100);
  const radius = 44;
  const circumference = 2 * Math.PI * radius;

  return (
    <section id="interview" className="scroll-mt-28 bg-surface py-12 sm:py-14 lg:py-20">
      <Container>
        <div className="grid gap-10 lg:grid-cols-[0.8fr_1.2fr] lg:gap-14">
          <div className="lg:sticky lg:top-28 lg:self-start">
            <p className="text-sm font-semibold uppercase tracking-wide text-primary">Interview preparation</p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight text-dark sm:text-4xl">
              Are you <Gradient>interview-ready?</Gradient>
            </h2>
            <p className="mt-3 text-base text-muted">
              A practical checklist to work through before you apply. Tick items as you go — your progress is saved in
              this browser.
            </p>

            <div className="mt-8 flex items-center gap-6 rounded-3xl border border-border bg-white p-6 shadow-card">
              <svg viewBox="0 0 100 100" width="104" height="104" className="shrink-0 -rotate-90" aria-hidden="true">
                <circle cx="50" cy="50" r={radius} fill="none" strokeWidth="9" className="stroke-surface" />
                <circle
                  cx="50"
                  cy="50"
                  r={radius}
                  fill="none"
                  strokeWidth="9"
                  strokeLinecap="round"
                  stroke="url(#ring)"
                  strokeDasharray={circumference}
                  strokeDashoffset={circumference * (1 - percent / 100)}
                  className="transition-all duration-700 ease-out"
                />
                <defs>
                  <linearGradient id="ring" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0" stopColor="#2563eb" />
                    <stop offset="1" stopColor="#7c3aed" />
                  </linearGradient>
                </defs>
              </svg>
              <div aria-live="polite">
                <p className="text-3xl font-bold text-dark">{percent}%</p>
                <p className="text-sm text-muted">
                  {done} of {allItems.length} done
                </p>
                {done > 0 && (
                  <button type="button" onClick={reset} className="mt-2 text-xs font-medium text-primary hover:underline">
                    Reset checklist
                  </button>
                )}
              </div>
            </div>
            <p className={cn("mt-4 rounded-2xl p-4 text-sm leading-relaxed transition-colors duration-500", percent === 100 ? "bg-success/10 text-dark" : "bg-white text-muted")}>
              {percent === 100
                ? "You've covered the essentials. Go apply — and keep practising out loud."
                : "Not sure where you stand? A counsellor can point you to the right next step."}
            </p>
            <Button href="/book-demo?source=resources" size="sm" variant="outline" className="mt-3">
              Talk to a Counsellor
            </Button>
          </div>

          <div className="flex flex-col gap-5">
            {groups.map((group) => (
              <div key={group.title} className="rounded-3xl border border-border bg-white p-5 shadow-soft sm:p-6">
                <h3 className="text-base font-semibold text-dark">{group.title}</h3>
                <ul className="mt-3 flex flex-col gap-2">
                  {group.items.map((item) => {
                    const on = checked.has(item);
                    return (
                      <li key={item}>
                        <label
                          className={cn(
                            "group/item flex cursor-pointer items-start gap-3 rounded-xl border p-3 text-sm transition-all duration-200",
                            on ? "border-primary/40 bg-primary/5 text-dark" : "border-border bg-surface/60 text-text hover:border-primary/30"
                          )}
                        >
                          <input type="checkbox" checked={on} onChange={() => toggle(item)} className="sr-only" />
                          <span
                            aria-hidden="true"
                            className={cn(
                              "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition-all duration-200",
                              on ? "border-transparent bg-linear-to-br from-primary to-secondary text-white" : "border-muted/40 bg-white text-transparent group-hover/item:border-primary"
                            )}
                          >
                            <CheckIcon />
                          </span>
                          <span className={cn(on && "line-through decoration-primary/40")}>{item}</span>
                        </label>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </Container>
    </section>
  );
}
