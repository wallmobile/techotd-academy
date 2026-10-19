import Link from "next/link";
import { PageHero } from "@/components/shared/PageHero";
import { CtaBand } from "@/components/shared/CtaBand";
import { Container } from "@/components/layout/Container";
import { Button } from "@/components/ui/Button";
import { Reveal, RevealItem } from "@/components/shared/Reveal";
import { TechGlossary } from "@/components/resources/TechGlossary";
import { InterviewChecklist } from "@/components/resources/InterviewChecklist";
import { CourseFinder } from "@/components/resources/CourseFinder";
import { GlowBackdrop, Gradient } from "@/components/training/icons";
import { listCourses, getCourse } from "@/lib/catalog";
import { displayDuration } from "@/data/courses";
import { techInfo, techCategories } from "@/data/techInfo";
import { staggerContainer } from "@/lib/motion";

export const metadata = {
  title: "Learning Resources",
  description:
    "Free learning resources from TechOTD Academy: a plain-language tech glossary, course learning paths and an interview-readiness checklist.",
  alternates: { canonical: "/blog" },
};

const paths = [
  {
    title: "Web development",
    blurb: "From your first web page to production-grade apps and deployment.",
    steps: ["full-stack-development", "mern-stack-development", "nextjs-development", "cloud-devops"],
  },
  {
    title: "Frontend specialist",
    blurb: "Go deep on modern interfaces, then on server-rendered React.",
    steps: ["react-development", "nextjs-development", "mern-stack-development"],
  },
  {
    title: "Data & AI",
    blurb: "Learn Python, work with data, then build with language models.",
    steps: ["python-development", "data-analytics", "ai-generative-ai"],
  },
];

const shelf = [
  { label: "Course finder", href: "#finder", state: "Available", note: "3 questions, 1 recommendation" },
  { label: "Tech glossary", href: "#glossary", state: "Available", note: `${Object.keys(techInfo).length} terms explained` },
  { label: "Learning paths", href: "#paths", state: "Available", note: "How courses connect" },
  { label: "Interview checklist", href: "#interview", state: "Available", note: "Tick-as-you-go prep" },
  { label: "Articles & guides", href: "#coming-soon", state: "Coming soon", note: "In-depth technical writing" },
  { label: "Events & workshops", href: "#coming-soon", state: "Coming soon", note: "Live community sessions" },
];

function ResourceShelf() {
  return (
    <div className="relative">
      <span aria-hidden="true" className="absolute inset-0 translate-x-4 translate-y-4 rotate-3 rounded-3xl bg-linear-to-br from-primary/25 to-secondary/25" />
      <div className="animate-float relative rounded-3xl border border-border bg-white p-6 shadow-elevated sm:p-7">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted">On the shelf</p>
        <ul className="mt-4 space-y-2.5">
          {shelf.map((item, index) => {
            const live = item.state === "Available";
            return (
              <li key={item.label} className="animate-fade-up-in" style={{ animationDelay: `${300 + index * 90}ms` }}>
                <a
                  href={item.href}
                  className="group flex items-center gap-3 rounded-2xl bg-surface px-3.5 py-3 transition-all duration-200 hover:bg-primary/5 hover:ring-1 hover:ring-primary/20"
                >
                  <span className={live ? "h-2 w-2 rounded-full bg-success" : "h-2 w-2 rounded-full bg-warning"} />
                  <span className="min-w-0 flex-1">
                    <span className="block text-[13px] font-semibold text-dark">{item.label}</span>
                    <span className="block text-xs text-muted">{item.note}</span>
                  </span>
                  <span
                    className={
                      live
                        ? "rounded-full bg-success/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-success"
                        : "rounded-full bg-warning/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-warning"
                    }
                  >
                    {item.state}
                  </span>
                </a>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}

export default function ResourcesPage() {
  const courses = listCourses({ publishedOnly: true });
  const terms = Object.keys(techInfo)
    .sort((a, b) => a.localeCompare(b))
    .map((name) => ({
      name,
      description: techInfo[name],
      category: techCategories[name] ?? "Other",
      courses: courses.filter((course) => course.technologies.includes(name)),
    }));

  return (
    <>
      <PageHero
        crumbs={[{ label: "Home", href: "/" }, { label: "Resources" }]}
        eyebrow="Learning resources"
        title={["Learn faster with", "free", "study aids"]}
        description="A plain-language tech glossary, learning paths that show how our courses connect, and an interview-readiness checklist — everything you can use before you even enrol."
        aside={<ResourceShelf />}
        stats={[
          { value: terms.length, label: "Terms explained" },
          { value: paths.length, label: "Learning paths" },
        ]}
      >
        <Button href="#glossary" size="lg" className="bg-linear-to-r from-primary to-secondary shadow-lg shadow-primary/25">
          Browse the glossary
        </Button>
        <Button href="#interview" variant="outline" size="lg">
          Interview checklist
        </Button>
      </PageHero>

      <CourseFinder
        courses={courses.map((course) => ({
          slug: course.slug,
          title: course.title,
          initials: course.initials,
          level: course.level,
          levelLabel: course.levelLabel,
          duration: displayDuration(course),
          modes: course.modes,
          shortDescription: course.shortDescription,
        }))}
      />

      <TechGlossary terms={terms} />

      {/* Learning paths */}
      <section id="paths" className="relative isolate scroll-mt-28 overflow-hidden bg-white py-12 sm:py-14 lg:py-20">
        <GlowBackdrop />
        <Container>
          <div className="max-w-2xl">
            <p className="text-sm font-semibold uppercase tracking-wide text-primary">Learning paths</p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight text-dark sm:text-4xl">
              How the courses <Gradient>connect</Gradient>
            </h2>
            <p className="mt-3 text-base text-muted">
              Not sure what to learn next? Follow a path — each step builds on the one before.
            </p>
          </div>

          <div className="mt-10 flex flex-col gap-6">
            {paths.map((path) => (
              <Reveal key={path.title} className="rounded-3xl border border-border bg-surface p-6 shadow-card sm:p-8">
                <h3 className="text-xl font-semibold text-dark">{path.title}</h3>
                <p className="mt-1 text-sm text-muted">{path.blurb}</p>
                <Reveal variants={staggerContainer} className="mt-6">
                  <ol className="grid items-stretch gap-3 sm:grid-cols-2 lg:flex lg:gap-0">
                    {path.steps.map((slug, index) => {
                      const course = getCourse(slug, { publishedOnly: true });
                      if (!course) return null;
                      return (
                        <RevealItem key={slug} as="li" className="flex flex-1 items-stretch lg:items-center">
                          <Link
                            href={`/courses/${course.slug}`}
                            className="group relative flex h-full flex-1 flex-col rounded-2xl border border-border bg-white p-4 transition-all duration-300 hover:-translate-y-1 hover:border-primary/30 hover:shadow-elevated"
                          >
                            <span className="flex items-center gap-3">
                              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-linear-to-br from-primary to-secondary text-[11px] font-black text-white shadow-md shadow-primary/25">
                                {course.initials}
                              </span>
                              <span className="text-[10px] font-semibold uppercase tracking-wider text-muted">Step {index + 1}</span>
                            </span>
                            <span className="mt-3 text-sm font-semibold leading-snug text-dark transition-colors group-hover:text-primary">
                              {course.title}
                            </span>
                            <span className="mt-1 text-xs text-muted">
                              {course.level} · {displayDuration(course)}
                            </span>
                          </Link>
                          {index < path.steps.length - 1 && (
                            <span aria-hidden="true" className="hidden px-2 text-lg text-primary lg:block">
                              →
                            </span>
                          )}
                        </RevealItem>
                      );
                    })}
                  </ol>
                </Reveal>
              </Reveal>
            ))}
          </div>
        </Container>
      </section>

      <InterviewChecklist />

      {/* Coming soon */}
      <section id="coming-soon" className="scroll-mt-28 bg-white py-12 sm:py-14 lg:py-20">
        <Container>
          <div className="max-w-2xl">
            <p className="text-sm font-semibold uppercase tracking-wide text-primary">Coming soon</p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight text-dark sm:text-4xl">
              More on <Gradient>the way</Gradient>
            </h2>
          </div>
          <div className="mt-10 grid gap-5 md:grid-cols-2">
            {[
              {
                title: "Articles & career guides",
                text: "In-depth technical articles, career guides and interview write-ups from our mentors.",
              },
              {
                title: "Events & workshops",
                text: "Live sessions, webinars and community learning events — dates will be announced here.",
              },
            ].map((item) => (
              <div key={item.title} className="relative overflow-hidden rounded-3xl border border-dashed border-primary/30 bg-surface p-7">
                <span aria-hidden="true" className="animate-drift pointer-events-none absolute -right-12 -top-12 h-40 w-40 rounded-full bg-linear-to-br from-primary/15 to-secondary/15" />
                <span className="relative inline-flex rounded-full bg-warning/10 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-warning">
                  Coming soon
                </span>
                <h3 className="relative mt-4 text-xl font-semibold text-dark">{item.title}</h3>
                <p className="relative mt-2 text-sm leading-relaxed text-muted">{item.text}</p>
                <Link href="/enquiry?source=resources" className="relative mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:underline">
                  Tell us what you&apos;d like to see <span aria-hidden="true">→</span>
                </Link>
              </div>
            ))}
          </div>
        </Container>
      </section>

      <CtaBand
        eyebrow="Keep learning"
        title="Ready to turn learning into a skill?"
        description="Pick a course, or talk to a counsellor about the right path."
        primary={{ label: "Book Free Counselling", href: "/book-demo?source=resources" }}
        secondary={{ label: "Explore Courses", href: "/courses" }}
        tertiary={{ label: "View Batches", href: "/batches" }}
      />
    </>
  );
}
