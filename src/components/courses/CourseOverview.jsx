import { displayDuration } from "@/data/courses";
import { Container } from "@/components/layout/Container";
import { Reveal, RevealItem } from "@/components/shared/Reveal";
import { CheckIcon, Gradient } from "@/components/training/icons";
import { staggerContainer } from "@/lib/motion";

const highlightIcons = [
  <path key="a" d="M4 16V11M10 16V7M16 16V3" />,
  <g key="b">
    <rect x="3" y="3" width="6" height="6" rx="1.5" />
    <rect x="11" y="3" width="6" height="6" rx="1.5" />
    <rect x="3" y="11" width="6" height="6" rx="1.5" />
    <rect x="11" y="11" width="6" height="6" rx="1.5" />
  </g>,
  <path key="c" d="M4 5h12v8H9l-3 3v-3H4z" />,
  <path key="d" d="M10 2.5l2.2 4.6 5 .7-3.6 3.5.9 5-4.5-2.4-4.5 2.4.9-5L2.8 7.8l5-.7L10 2.5z" />,
];

export function CourseOverview({ course }) {
  const paragraphs = course.overview?.length ? course.overview : [course.description];
  const audience = course.audience ?? [];
  const highlights = course.highlights ?? [];

  return (
    <section id="overview" className="scroll-mt-36 bg-white py-12 sm:py-14 lg:py-20">
      <Container>
        <div className="max-w-2xl">
          <p className="text-sm font-semibold uppercase tracking-wide text-primary">Overview</p>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight text-dark sm:text-4xl">
            What you&apos;ll <Gradient>learn</Gradient>
          </h2>
        </div>

        <div className="mt-10 grid gap-5 lg:grid-cols-5">
          <Reveal className="rounded-3xl border border-border bg-white p-6 shadow-card sm:p-8 lg:col-span-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted">About this course</p>
            <div className="mt-3 space-y-4">
              {paragraphs.map((text, index) => (
                <p key={index} className={index === 0 ? "text-lg font-medium leading-relaxed text-dark" : "text-base leading-relaxed text-muted"}>
                  {text}
                </p>
              ))}
            </div>

            {audience.length > 0 ? (
              <div className="mt-7 rounded-2xl bg-surface p-5">
                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-linear-to-br from-primary to-secondary text-white shadow-md shadow-primary/25">
                    <svg aria-hidden="true" viewBox="0 0 20 20" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="10" cy="7" r="3.2" />
                      <path d="M3.5 17c.8-3 3.4-4.6 6.5-4.6s5.7 1.6 6.5 4.6" />
                    </svg>
                  </span>
                  <p className="text-sm font-semibold text-dark">Who this course is for</p>
                </div>
                <ul className="mt-4 grid gap-3 sm:grid-cols-2">
                  {audience.map((item) => (
                    <li key={item} className="flex items-start gap-2.5 text-sm leading-snug text-text">
                      <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                        <CheckIcon className="h-2.5 w-2.5" />
                      </span>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            ) : (
              <div className="mt-7 rounded-2xl bg-surface p-5">
                <p className="text-sm font-semibold text-dark">Who this course is for</p>
                <p className="mt-1 text-sm leading-relaxed text-muted">
                  Learners looking to build practical, job-ready skills in {course.category.toLowerCase()}, whether
                  starting fresh or building on existing experience.
                </p>
              </div>
            )}
          </Reveal>

          <Reveal
            delay={120}
            className="relative overflow-hidden rounded-3xl bg-linear-to-br from-primary via-primary to-secondary p-6 text-white shadow-elevated sm:p-8 lg:col-span-2"
          >
            <span aria-hidden="true" className="animate-drift pointer-events-none absolute -right-14 -top-14 h-56 w-56 rounded-full bg-white/10" />
            <span aria-hidden="true" className="animate-drift-slow pointer-events-none absolute -bottom-20 -left-10 h-48 w-48 rounded-full bg-white/10" />
            <div className="relative flex h-full flex-col">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/75">Before you start</p>
              <h3 className="mt-2 text-2xl font-semibold tracking-tight">Prerequisites</h3>
              <Reveal variants={staggerContainer} className="mt-5">
                <ul className="flex flex-col gap-3">
                  {course.prerequisites.map((item) => (
                    <RevealItem key={item} as="li" className="flex items-start gap-3 text-sm leading-relaxed text-white/90">
                      <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-white text-primary">
                        <CheckIcon />
                      </span>
                      {item.replace(" (sample)", "")}
                    </RevealItem>
                  ))}
                </ul>
              </Reveal>

              <dl className="mt-auto grid grid-cols-2 gap-3 pt-8">
                <div className="rounded-2xl bg-white/15 p-3.5 backdrop-blur-sm">
                  <dt className="text-[10px] font-semibold uppercase tracking-wider text-white/70">Level</dt>
                  <dd className="mt-1 text-sm font-semibold leading-snug">{course.levelLabel}</dd>
                </div>
                <div className="rounded-2xl bg-white/15 p-3.5 backdrop-blur-sm">
                  <dt className="text-[10px] font-semibold uppercase tracking-wider text-white/70">Duration</dt>
                  <dd className="mt-1 text-sm font-semibold leading-snug">{displayDuration(course)}</dd>
                </div>
              </dl>
            </div>
          </Reveal>
        </div>

        {highlights.length > 0 && (
          <Reveal variants={staggerContainer} className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {highlights.map((item, index) => (
              <RevealItem
                key={item.title}
                className="group rounded-2xl border border-border bg-white p-5 shadow-soft transition-all duration-300 hover:-translate-y-1 hover:border-primary/30 hover:shadow-elevated"
              >
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary transition-all duration-300 group-hover:bg-linear-to-br group-hover:from-primary group-hover:to-secondary group-hover:text-white group-hover:shadow-lg group-hover:shadow-primary/25">
                  <svg aria-hidden="true" viewBox="0 0 20 20" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                    {highlightIcons[index % highlightIcons.length]}
                  </svg>
                </span>
                <h3 className="mt-4 text-base font-semibold text-dark">{item.title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-muted">{item.text}</p>
              </RevealItem>
            ))}
          </Reveal>
        )}
      </Container>
    </section>
  );
}
