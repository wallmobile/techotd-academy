"use client";

import { useState } from "react";
import Link from "next/link";
import { Container } from "@/components/layout/Container";
import { Button } from "@/components/ui/Button";
import { CheckIcon, Gradient } from "@/components/training/icons";
import { cn } from "@/lib/utils";

const QUESTIONS = [
  {
    key: "goal",
    title: "What do you want to do?",
    hint: "Pick the closest match — you can always retake the quiz.",
    options: [
      { value: "web", label: "Build websites & apps", note: "Frontend, backend or both" },
      { value: "data", label: "Work with data", note: "Clean, analyse and explain numbers" },
      { value: "ai", label: "Build with AI", note: "Add language-model features to apps" },
      { value: "cloud", label: "Deploy & run software", note: "Cloud, containers and automation" },
    ],
  },
  {
    key: "level",
    title: "Where are you starting from?",
    hint: "Be honest — it helps us avoid sending you to the wrong place.",
    options: [
      { value: "beginner", label: "Just starting out", note: "Little or no coding experience" },
      { value: "some", label: "I can already code", note: "Comfortable with programming basics" },
    ],
  },
  {
    key: "format",
    title: "How would you like to learn?",
    hint: "We'll only suggest courses that offer your format.",
    options: [
      { value: "Live Online", label: "Live online", note: "Attend from anywhere" },
      { value: "Classroom", label: "In the classroom", note: "Learn in person" },
      { value: "any", label: "No preference", note: "Show me everything" },
    ],
  },
];

// Ordered picks per goal + experience level (slugs, best first).
const PICKS = {
  web: { beginner: ["full-stack-development", "react-development"], some: ["mern-stack-development", "nextjs-development", "react-development"] },
  data: { beginner: ["data-analytics", "python-development"], some: ["data-analytics", "ai-generative-ai", "python-development"] },
  ai: { beginner: ["python-development", "data-analytics"], some: ["ai-generative-ai", "python-development", "data-analytics"] },
  cloud: { beginner: ["full-stack-development", "python-development"], some: ["cloud-devops", "mern-stack-development", "python-development"] },
};

const GOAL_LABEL = { web: "building websites and apps", data: "working with data", ai: "building with AI", cloud: "deploying and running software" };

function recommend(answers, courses) {
  const order = PICKS[answers.goal][answers.level];
  const bySlug = Object.fromEntries(courses.map((course) => [course.slug, course]));
  const ranked = order.map((slug) => bySlug[slug]).filter(Boolean);

  const wantsFormat = answers.format !== "any";
  const matching = wantsFormat ? ranked.filter((course) => course.modes.includes(answers.format)) : ranked;
  const formatFallback = wantsFormat && matching.length === 0;
  const list = formatFallback ? ranked : matching;

  const [best, ...others] = list;
  if (!best) return null;

  const reasons = [
    `Matches your goal of ${GOAL_LABEL[answers.goal]}.`,
    answers.level === "beginner"
      ? best.level === "Beginner"
        ? "Starts from the fundamentals, so no prior experience is needed."
        : "Builds on programming basics — start with a beginner course first if you're brand new."
      : "Assumes you can code, so you spend time on real-world patterns rather than the basics.",
    formatFallback
      ? `Currently offered as ${best.modes.join(" / ").toLowerCase()} — ask a counsellor about classroom options.`
      : wantsFormat
        ? `Available in your preferred format: ${answers.format.toLowerCase()}.`
        : `Available as ${best.modes.join(" / ").toLowerCase()}.`,
  ];

  return { best, others: others.slice(0, 2), reasons, formatFallback };
}

/**
 * Three-question quiz that recommends a course. The logic is transparent:
 * goal + experience pick an ordered shortlist, then the learning format filters it.
 */
export function CourseFinder({ courses }) {
  const [answers, setAnswers] = useState({});
  const [step, setStep] = useState(0);

  const finished = step >= QUESTIONS.length;
  const result = finished ? recommend(answers, courses) : null;
  const question = QUESTIONS[step];

  const choose = (value) => {
    setAnswers((current) => ({ ...current, [question.key]: value }));
    setStep((current) => current + 1);
  };
  const restart = () => {
    setAnswers({});
    setStep(0);
  };

  return (
    <section id="finder" className="scroll-mt-28 bg-white py-12 sm:py-14 lg:py-20">
      <Container>
        <div className="grid gap-10 lg:grid-cols-[0.8fr_1.2fr] lg:gap-14">
          <div className="lg:sticky lg:top-28 lg:self-start">
            <p className="text-sm font-semibold uppercase tracking-wide text-primary">Course finder</p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight text-dark sm:text-4xl">
              Not sure <Gradient>where to start?</Gradient>
            </h2>
            <p className="mt-3 text-base text-muted">
              Answer three quick questions and we&apos;ll suggest a course — and tell you why. It takes under a minute.
            </p>
            <ul className="mt-6 flex flex-col gap-3 text-sm text-text">
              {["No sign-up or email needed", "Your answers stay in your browser", "Suggestions come from our real course list"].map((item) => (
                <li key={item} className="flex items-center gap-2.5">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-linear-to-br from-primary to-secondary text-white">
                    <CheckIcon />
                  </span>
                  {item}
                </li>
              ))}
            </ul>
          </div>

          <div className="relative overflow-hidden rounded-3xl border border-border bg-surface p-5 shadow-card sm:p-8">
            <span aria-hidden="true" className="animate-drift pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-linear-to-br from-primary/15 to-secondary/15" />

            {/* progress */}
            <div className="relative flex items-center gap-2" aria-hidden="true">
              {QUESTIONS.map((item, index) => (
                <span
                  key={item.key}
                  className={cn(
                    "h-1.5 flex-1 rounded-full transition-all duration-500",
                    index < step ? "bg-linear-to-r from-primary to-secondary" : index === step ? "bg-primary/40" : "bg-white"
                  )}
                />
              ))}
            </div>

            {!finished && (
              <div key={step} className="animate-fade-up-in relative mt-6">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted">
                  Question {step + 1} of {QUESTIONS.length}
                </p>
                <h3 className="mt-2 text-2xl font-semibold tracking-tight text-dark">{question.title}</h3>
                <p className="mt-1 text-sm text-muted">{question.hint}</p>

                <div className="mt-5 grid gap-3 sm:grid-cols-2">
                  {question.options.map((option, index) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => choose(option.value)}
                      className="animate-fade-up-in group flex items-start gap-3 rounded-2xl border border-border bg-white p-4 text-left transition-all duration-200 hover:-translate-y-1 hover:border-primary/40 hover:shadow-elevated focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                      style={{ animationDelay: `${index * 70}ms` }}
                    >
                      <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 border-border text-transparent transition-all duration-200 group-hover:border-primary group-hover:bg-primary group-hover:text-white">
                        <CheckIcon />
                      </span>
                      <span>
                        <span className="block text-sm font-semibold text-dark">{option.label}</span>
                        <span className="mt-0.5 block text-xs text-muted">{option.note}</span>
                      </span>
                    </button>
                  ))}
                </div>

                {step > 0 && (
                  <button type="button" onClick={() => setStep((current) => current - 1)} className="mt-5 text-sm font-medium text-primary hover:underline">
                    ← Back
                  </button>
                )}
              </div>
            )}

            {finished && result && (
              <div className="animate-fade-up-in relative mt-6" aria-live="polite">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-success">Your best match</p>

                <div className="relative mt-3 overflow-hidden rounded-3xl bg-linear-to-br from-primary via-primary to-secondary p-6 text-white shadow-elevated">
                  <span aria-hidden="true" className="animate-drift pointer-events-none absolute -right-12 -top-12 h-44 w-44 rounded-full bg-white/10" />
                  <span aria-hidden="true" className="animate-shine pointer-events-none absolute inset-y-0 left-0 w-1/4 bg-linear-to-r from-transparent via-white/20 to-transparent" />
                  <div className="relative flex items-center gap-4">
                    <span className="animate-pop-in flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white/20 text-base font-black ring-1 ring-white/30 backdrop-blur">
                      {result.best.initials}
                    </span>
                    <div>
                      <h3 className="text-2xl font-semibold tracking-tight">{result.best.title}</h3>
                      <p className="text-sm text-white/80">
                        {result.best.levelLabel} · {result.best.duration}
                      </p>
                    </div>
                  </div>
                  <p className="relative mt-4 text-sm leading-relaxed text-white/90">{result.best.shortDescription}</p>
                </div>

                <p className="mt-5 text-sm font-semibold text-dark">Why this course</p>
                <ul className="mt-2 flex flex-col gap-2">
                  {result.reasons.map((reason, index) => (
                    <li
                      key={reason}
                      className="animate-fade-up-in flex items-start gap-2.5 rounded-xl bg-white px-3.5 py-2.5 text-sm text-text"
                      style={{ animationDelay: `${200 + index * 110}ms` }}
                    >
                      <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-linear-to-br from-primary to-secondary text-white">
                        <CheckIcon />
                      </span>
                      {reason}
                    </li>
                  ))}
                </ul>

                <div className="mt-5 flex flex-wrap items-center gap-3">
                  <Button href={`/courses/${result.best.slug}`} size="sm" className="bg-linear-to-r from-primary to-secondary">
                    View this course
                  </Button>
                  <Button href={`/book-demo?course=${result.best.slug}&source=resources`} variant="outline" size="sm">
                    Talk to a counsellor
                  </Button>
                  <button type="button" onClick={restart} className="text-sm font-medium text-primary hover:underline">
                    Retake quiz
                  </button>
                </div>

                {result.others.length > 0 && (
                  <div className="mt-6 border-t border-border pt-5">
                    <p className="text-sm font-semibold text-dark">Also worth a look</p>
                    <div className="mt-3 grid gap-3 sm:grid-cols-2">
                      {result.others.map((course) => (
                        <Link
                          key={course.slug}
                          href={`/courses/${course.slug}`}
                          className="group flex items-center gap-3 rounded-2xl border border-border bg-white p-3 transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-card"
                        >
                          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-linear-to-br from-primary to-secondary text-[10px] font-black text-white">
                            {course.initials}
                          </span>
                          <span className="min-w-0">
                            <span className="block truncate text-sm font-semibold text-dark transition-colors group-hover:text-primary">{course.title}</span>
                            <span className="block text-xs text-muted">{course.level}</span>
                          </span>
                        </Link>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </Container>
    </section>
  );
}
