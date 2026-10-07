import Link from "next/link";
import { PageHero } from "@/components/shared/PageHero";
import { CtaBand } from "@/components/shared/CtaBand";
import { FaqAccordion } from "@/components/shared/FaqAccordion";
import { Container } from "@/components/layout/Container";
import { Button } from "@/components/ui/Button";
import { Reveal, RevealItem } from "@/components/shared/Reveal";
import { CheckIcon, GlowBackdrop, Gradient } from "@/components/training/icons";
import { careerSupportItems } from "@/data/careerSupport";
import { courses } from "@/data/courses";
import { CareerPlanner } from "@/components/careers/CareerPlanner";
import { displayDuration } from "@/data/courses";
import { staggerContainer } from "@/lib/motion";

export const metadata = {
  title: "Career Support",
  description:
    "Resume guidance, portfolio building, mock interviews and job-search support alongside every TechOTD Academy course.",
  alternates: { canonical: "/careers" },
};

const supportDetails = {
  RG: "Shape a clear, one-page resume that puts your projects, skills and impact up front.",
  PD: "Turn course projects into a portfolio and GitHub profile that others can actually browse.",
  MI: "Practise with realistic questions and get feedback on how you structure your answers.",
  TI: "Revise core concepts and sharpen problem-solving for the track you are applying in.",
  CP: "Learn to explain your work and your thinking clearly — to interviewers and to teammates.",
  JS: "Plan where to look, how to apply and how to follow up, without the guesswork.",
};

const journey = [
  { title: "Learn the skills", text: "Follow a structured, mentor-led course at your own pace of practice." },
  { title: "Build real projects", text: "Finish modules with assignments and a capstone you can show." },
  { title: "Polish your profile", text: "Shape your resume, portfolio and GitHub around what you built." },
  { title: "Practise interviewing", text: "Run mock interviews and technical rounds with feedback." },
  { title: "Apply with confidence", text: "Use job-search guidance to apply, follow up and keep improving." },
];

// Related roles are examples of where each course's skills apply — not job guarantees.
const roles = {
  "full-stack-development": ["Full Stack Developer", "Web Developer"],
  "mern-stack-development": ["MERN Stack Developer", "Backend-focused Developer"],
  "react-development": ["Frontend Developer", "UI Developer"],
  "nextjs-development": ["React / Next.js Developer", "Frontend Engineer"],
  "python-development": ["Python Developer", "Backend Developer", "Automation Engineer"],
  "ai-generative-ai": ["AI Application Developer", "Prompt & Integration Engineer"],
  "data-analytics": ["Data Analyst", "Reporting / BI Analyst"],
  "cloud-devops": ["DevOps Engineer", "Cloud Support Engineer"],
};

const faqs = [
  {
    question: "Do you guarantee a job or placement?",
    answer:
      "No. We do not promise jobs or specific outcomes. What we provide is practical guidance — resume and portfolio help, interview practice and job-search direction — so you are better prepared when you apply.",
  },
  {
    question: "When does career support start?",
    answer:
      "Career support runs alongside your course. Projects and assignments from each module feed directly into your resume and portfolio, so you are not starting from scratch at the end.",
  },
  {
    question: "Is career support included with every course?",
    answer:
      "Career support areas are available as part of the learning experience across courses. Ask a counsellor how it fits the course and batch you are considering.",
  },
  {
    question: "Which roles can these courses lead to?",
    answer:
      "Each course page lists the skills you build. The roles shown here are examples of where those skills apply, not promises of specific positions.",
  },
];

function CareerAside() {
  return (
    <div className="relative">
      <span aria-hidden="true" className="absolute inset-0 translate-x-4 translate-y-4 rotate-3 rounded-3xl bg-linear-to-br from-primary/25 to-secondary/25" />
      <div className="animate-float relative rounded-3xl border border-border bg-white p-6 shadow-elevated sm:p-7">
        <div className="flex items-center justify-between">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted">Your career toolkit</p>
          <span className="rounded-full bg-success/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-success">
            Included
          </span>
        </div>
        <ul className="mt-4 space-y-2.5">
          {careerSupportItems.map((item, index) => (
            <li
              key={item.title}
              className="animate-fade-up-in flex items-center gap-3 rounded-2xl bg-surface px-3.5 py-2.5 text-[13px] font-medium text-dark"
              style={{ animationDelay: `${300 + index * 90}ms` }}
            >
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-linear-to-br from-primary to-secondary text-[10px] font-bold text-white">
                {item.code}
              </span>
              {item.title}
              <span className="ml-auto text-success">
                <CheckIcon />
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

export default function CareersPage() {
  const plans = courses.map((course) => ({
    slug: course.slug,
    title: course.title,
    initials: course.initials,
    level: course.levelLabel,
    duration: displayDuration(course),
    roles: roles[course.slug] ?? [],
    projects: course.projects.map((project) => ({
      title: project.title,
      outcome: project.outcome.replace(" (example project)", ""),
    })),
    outcomes: course.outcomes.slice(0, 6),
    skills: course.technologies,
  }));

  return (
    <>
      <PageHero
        crumbs={[{ label: "Home", href: "/" }, { label: "Career" }]}
        eyebrow="Career support"
        title={["Get ready for", "your career,", "not just your course"]}
        description="Learning the skills is step one. We help you present them — with resume and portfolio guidance, interview practice and job-search direction alongside every program."
        aside={<CareerAside />}
        stats={[
          { value: careerSupportItems.length, label: "Support areas" },
          { value: courses.length, label: "Courses" },
        ]}
      >
        <Button href="/book-demo?source=career" size="lg" className="bg-linear-to-r from-primary to-secondary shadow-lg shadow-primary/25">
          Book Free Counselling
        </Button>
        <Button href="/courses" variant="outline" size="lg">
          Explore Courses
        </Button>
      </PageHero>

      {/* Support areas */}
      <section className="bg-white py-12 sm:py-14 lg:py-20">
        <Container>
          <div className="max-w-2xl">
            <p className="text-sm font-semibold uppercase tracking-wide text-primary">How we support you</p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight text-dark sm:text-4xl">
              Six ways we help you <Gradient>stand out</Gradient>
            </h2>
          </div>
          <Reveal variants={staggerContainer} className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {careerSupportItems.map((item) => (
              <RevealItem
                key={item.title}
                className="group relative overflow-hidden rounded-3xl border border-border bg-white p-6 shadow-card transition-all duration-300 hover:-translate-y-1.5 hover:border-primary/30 hover:shadow-elevated"
              >
                <span aria-hidden="true" className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-linear-to-br from-primary/15 to-secondary/15 transition-transform duration-500 group-hover:scale-150" />
                <span className="relative flex h-14 w-14 items-center justify-center rounded-2xl bg-linear-to-br from-primary to-secondary text-base font-bold text-white shadow-lg shadow-primary/25 transition-transform duration-300 group-hover:-rotate-6 group-hover:scale-110">
                  {item.code}
                </span>
                <h3 className="relative mt-5 text-lg font-semibold text-dark">{item.title}</h3>
                <p className="relative mt-2 text-sm leading-relaxed text-muted">{supportDetails[item.code]}</p>
              </RevealItem>
            ))}
          </Reveal>
        </Container>
      </section>

      {/* Journey */}
      <section className="relative isolate overflow-hidden bg-surface py-12 sm:py-14 lg:py-20">
        <GlowBackdrop />
        <Container>
          <div className="max-w-2xl">
            <p className="text-sm font-semibold uppercase tracking-wide text-primary">Your path</p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight text-dark sm:text-4xl">
              From first class to <Gradient>first interview</Gradient>
            </h2>
          </div>
          <Reveal variants={staggerContainer} className="relative mt-12">
            <div aria-hidden="true" className="absolute left-[10%] right-[10%] top-7 hidden h-0.5 rounded-full bg-linear-to-r from-primary/30 via-secondary/40 to-primary/30 lg:block">
              <span className="animate-journey-travel absolute top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-secondary shadow-[0_0_0_6px_rgb(124_58_237/0.15)]" />
            </div>
            <ol className="relative grid gap-5 sm:grid-cols-2 lg:grid-cols-5">
              {journey.map((step, index) => (
                <RevealItem key={step.title} as="li" className="group relative flex flex-col">
                  <div className="relative z-10 mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-linear-to-br from-primary to-secondary text-base font-bold text-white shadow-lg shadow-primary/25 ring-4 ring-surface transition-transform duration-300 group-hover:-rotate-6 group-hover:scale-110">
                    {index + 1}
                  </div>
                  <div className="mt-4 flex-1 rounded-3xl border border-border bg-white p-5 text-center shadow-soft transition-all duration-300 group-hover:-translate-y-1 group-hover:border-primary/30 group-hover:shadow-elevated">
                    <h3 className="text-base font-semibold text-dark">{step.title}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-muted">{step.text}</p>
                  </div>
                </RevealItem>
              ))}
            </ol>
          </Reveal>
        </Container>
      </section>

      <CareerPlanner plans={plans} />

      <div className="bg-surface">
        <FaqAccordion
          id="career-faq"
          title={
            <>
              Career support, <Gradient>honestly answered</Gradient>
            </>
          }
          items={faqs}
          aside={
            <div className="rounded-3xl border border-border bg-white p-6">
              <p className="text-base font-semibold text-dark">Want to talk it through?</p>
              <p className="mt-1.5 text-sm text-muted">A counsellor can explain how career support fits your course.</p>
              <Button href="/book-demo?source=career" size="sm" className="mt-4 bg-linear-to-r from-primary to-secondary">
                Talk to a Counsellor
              </Button>
            </div>
          }
        />
      </div>

      <CtaBand
        eyebrow="Career support"
        title="Build the skills. Then show them well."
        description="Start a course and get career guidance alongside it."
        primary={{ label: "Book Free Counselling", href: "/book-demo?source=career" }}
        secondary={{ label: "Explore Courses", href: "/courses" }}
        tertiary={{ label: "View Batches", href: "/batches" }}
      />
    </>
  );
}
