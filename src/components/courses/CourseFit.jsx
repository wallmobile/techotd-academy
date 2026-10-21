import Link from "next/link";
import { Container } from "@/components/layout/Container";
import { Reveal } from "@/components/shared/Reveal";
import { ReadinessCheck } from "@/components/courses/ReadinessCheck";
import { CheckIcon, Gradient } from "@/components/training/icons";
import { listCourses, getRelatedCourses } from "@/lib/catalog";

/** Honest "maybe not yet" pointers, derived from the course's level. */
async function buildCaveats(course) {
  if (course.level === "Beginner") {
    return {
      points: [
        "You already build and ship production applications — a more advanced course may suit you better.",
        "You only want a short theory overview with no hands-on practice.",
      ],
      suggestion: null,
    };
  }

  // Prefer a related beginner course (curated next steps first), then any beginner course.
  const starter =
    (await getRelatedCourses(course, 8)).find((c) => c.level === "Beginner") ??
    (await listCourses({ publishedOnly: true })).find((c) => c.level === "Beginner" && c.slug !== course.slug);

  return {
    points: [
      "You are completely new to programming — build the basics first, then come back.",
      `You haven't practiced the prerequisites yet${course.prerequisites[0] ? ` (${course.prerequisites[0].replace(" (sample)", "").toLowerCase()})` : ""}.`,
    ],
    suggestion: starter,
  };
}

export async function CourseFit({ course }) {
  const audience = course.audience ?? [];
  const caveats = await buildCaveats(course);

  return (
    <section id="fit" className="scroll-mt-36 bg-surface py-12 sm:py-14 lg:py-20">
      <Container>
        <div className="max-w-2xl">
          <p className="text-sm font-semibold uppercase tracking-wide text-primary">Is it right for you?</p>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight text-dark sm:text-4xl">
            Check if this course <Gradient>fits you</Gradient>
          </h2>
          <p className="mt-3 text-base text-muted">
            A quick, honest look at who gets the most from this course — and a self-check you can do in seconds.
          </p>
        </div>

        <div className="mt-10 grid gap-5 lg:grid-cols-2">
          <Reveal className="flex flex-col gap-5">
            <div className="rounded-3xl border border-border bg-white p-6 shadow-card sm:p-7">
              <p className="flex items-center gap-2 text-sm font-semibold text-success">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-success text-white">
                  <CheckIcon />
                </span>
                A great fit if…
              </p>
              <ul className="mt-4 flex flex-col gap-3">
                {(audience.length > 0 ? audience : [`You want practical, job-ready skills in ${course.category.toLowerCase()}`]).map((item) => (
                  <li key={item} className="flex items-start gap-3 text-sm leading-relaxed text-text">
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-success" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            <div className="rounded-3xl border border-warning/30 bg-warning/5 p-6 sm:p-7">
              <p className="flex items-center gap-2 text-sm font-semibold text-warning">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-warning text-sm text-white">!</span>
                You may want to start elsewhere if…
              </p>
              <ul className="mt-4 flex flex-col gap-3">
                {caveats.points.map((item) => (
                  <li key={item} className="flex items-start gap-3 text-sm leading-relaxed text-text">
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-warning" />
                    {item}
                  </li>
                ))}
              </ul>
              {caveats.suggestion && (
                <p className="mt-4 text-sm text-muted">
                  Try{" "}
                  <Link href={`/courses/${caveats.suggestion.slug}`} className="font-semibold text-primary hover:underline">
                    {caveats.suggestion.title}
                  </Link>{" "}
                  first.
                </p>
              )}
            </div>
          </Reveal>

          <Reveal delay={120} className="rounded-3xl border border-border bg-white p-6 shadow-card sm:p-7">
            <ReadinessCheck prerequisites={course.prerequisites} courseSlug={course.slug} />
          </Reveal>
        </div>
      </Container>
    </section>
  );
}
