import { PageHero } from "@/components/shared/PageHero";
import { CtaBand } from "@/components/shared/CtaBand";
import { Container } from "@/components/layout/Container";
import { Button } from "@/components/ui/Button";
import { Reveal, RevealItem } from "@/components/shared/Reveal";
import { TrainerExplorer } from "@/components/trainers/TrainerExplorer";
import { FaqAccordion } from "@/components/shared/FaqAccordion";
import { Gradient } from "@/components/training/icons";
import { trainers } from "@/data/trainers";
import { getCourse } from "@/lib/catalog";
import { staggerContainer } from "@/lib/motion";

export const metadata = {
  title: "Our Trainers & Mentors",
  description:
    "Meet the mentors behind TechOTD Academy's courses — practical, project-focused guidance across full stack, data, AI, cloud and more.",
  alternates: { canonical: "/trainers" },
};

const principles = [
  {
    title: "Practitioner-led",
    text: "Mentors teach the tools the way they are used on real projects, not just the way the docs describe them.",
  },
  {
    title: "Review, not just lectures",
    text: "Your assignments get feedback on structure, naming and decisions, so you improve with every module.",
  },
  {
    title: "Doubts get answered",
    text: "Ask during live sessions and get clear explanations until the concept actually clicks.",
  },
  {
    title: "Career-aware guidance",
    text: "Mentors point out what matters for interviews and real work, and what you can safely skip.",
  },
];

// Mentor role keywords -> the course that area maps to (checked in order).
const COURSE_BY_ROLE = [
  ["Full Stack", "full-stack-development"],
  ["Data", "data-analytics"],
  ["Cloud", "cloud-devops"],
  ["AI", "ai-generative-ai"],
  ["Python", "python-development"],
];

async function courseFor(trainer) {
  const match = COURSE_BY_ROLE.find(([keyword]) => trainer.role.includes(keyword));
  const course = match ? await getCourse(match[1], { publishedOnly: true }) : null;
  return course ? { slug: course.slug, title: course.title, initials: course.initials } : null;
}

const matchSteps = [
  { title: "Tell us your goal", text: "Share what you want to learn and where you're starting from — a short call is enough." },
  { title: "We suggest a path", text: "A counsellor recommends a course, a learning mode and a batch that fit your schedule." },
  { title: "Meet your mentor", text: "Your batch's mentor introduces the plan in the first session and you start building." },
];

const faqs = [
  {
    question: "Can I choose my mentor?",
    answer:
      "Mentors are tied to courses and batches. A counsellor can tell you who teaches the batch you're considering and what their focus is.",
  },
  {
    question: "How do I get my doubts cleared?",
    answer:
      "Ask during live sessions, and bring anything unresolved to your mentor — doubt resolution is part of every course's learning experience.",
  },
  {
    question: "Do mentors review my projects?",
    answer:
      "Yes. Each module ends with an assignment, and mentors give feedback on structure, naming and approach, not just whether it runs.",
  },
  {
    question: "Why do profiles say \"Sample profile\"?",
    answer:
      "The mentor profiles and illustrations on this page are placeholders for the design preview. They will be replaced with verified profiles and photos before launch.",
  },
];

function MentorCollage() {
  const picks = trainers.slice(0, 3);
  // Three photo cards staggered so none covers another's caption.
  const spots = [
    { left: "0%", top: "0%", rotate: -4 },
    { left: "56%", top: "10%", rotate: 5 },
    { left: "14%", top: "54%", rotate: -2 },
  ];
  return (
    <div className="relative mx-auto h-[32rem] w-full max-w-sm" aria-hidden="true">
      <span className="absolute inset-0 rotate-3 rounded-3xl bg-linear-to-br from-primary/25 to-secondary/25" />
      {picks.map((trainer, index) => (
        <div
          key={trainer.name}
          className="animate-float absolute w-40 overflow-hidden rounded-3xl border-4 border-white bg-white shadow-elevated sm:w-44"
          style={{
            left: spots[index].left,
            top: spots[index].top,
            animationDelay: `${index * -2}s`,
            transform: `rotate(${spots[index].rotate}deg)`,
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={trainer.photo} alt="" className="aspect-[3/4] w-full object-cover object-top" />
          <div className="bg-white px-3 py-2">
            <p className="truncate text-xs font-semibold text-dark">{trainer.name}</p>
            <p className="truncate text-[10px] text-muted">{trainer.role}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

export default async function TrainersPage() {
  const areas = new Set(trainers.map((trainer) => trainer.role.split(" ")[0])).size;
  const enrichedTrainers = await Promise.all(trainers.map(async (trainer) => ({ ...trainer, course: await courseFor(trainer) })));

  return (
    <>
      <PageHero
        crumbs={[{ label: "Home", href: "/" }, { label: "Trainers" }]}
        eyebrow="Mentors & trainers"
        title={["Learn from", "mentors", "who build"]}
        description="Every TechOTD course is taught by mentors who focus on practical, project-based learning — explaining concepts clearly, reviewing your work and helping you move forward."
        aside={<MentorCollage />}
        stats={[
          { value: trainers.length, label: "Mentors" },
          { value: `${areas}+`, label: "Expertise areas" },
        ]}
      >
        <Button href="#mentors" size="lg" className="bg-linear-to-r from-primary to-secondary shadow-lg shadow-primary/25">
          Meet the mentors
        </Button>
        <Button href="/book-demo?source=trainers" variant="outline" size="lg">
          Talk to a Counsellor
        </Button>
      </PageHero>

      <section className="bg-white py-12 sm:py-14 lg:py-20">
        <Container>
          <div className="max-w-2xl">
            <p className="text-sm font-semibold uppercase tracking-wide text-primary">How mentoring works</p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight text-dark sm:text-4xl">
              What you can <Gradient>expect</Gradient> from a mentor
            </h2>
          </div>
          <Reveal variants={staggerContainer} className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {principles.map((item, index) => (
              <RevealItem
                key={item.title}
                className="group rounded-3xl border border-border bg-white p-6 shadow-soft transition-all duration-300 hover:-translate-y-1 hover:border-primary/30 hover:shadow-elevated"
              >
                <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-linear-to-br from-primary to-secondary text-sm font-bold text-white shadow-md shadow-primary/25 transition-transform duration-300 group-hover:-rotate-6 group-hover:scale-110">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <h3 className="mt-4 text-lg font-semibold text-dark">{item.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted">{item.text}</p>
              </RevealItem>
            ))}
          </Reveal>
        </Container>
      </section>

      <TrainerExplorer trainers={enrichedTrainers} />

      {/* How matching works */}
      <section className="bg-white py-12 sm:py-14 lg:py-20">
        <Container>
          <div className="max-w-2xl">
            <p className="text-sm font-semibold uppercase tracking-wide text-primary">Getting started</p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight text-dark sm:text-4xl">
              How you&apos;re <Gradient>matched</Gradient> with a mentor
            </h2>
          </div>
          <Reveal variants={staggerContainer} className="relative mt-12">
            <div aria-hidden="true" className="absolute left-[16.6%] right-[16.6%] top-7 hidden h-0.5 rounded-full bg-linear-to-r from-primary/30 via-secondary/40 to-primary/30 md:block">
              <span className="animate-journey-travel absolute top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-secondary shadow-[0_0_0_6px_rgb(124_58_237/0.15)]" />
            </div>
            <ol className="relative grid gap-5 md:grid-cols-3">
              {matchSteps.map((step, index) => (
                <RevealItem key={step.title} as="li" className="group relative flex flex-col">
                  <div className="relative z-10 mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-linear-to-br from-primary to-secondary text-base font-bold text-white shadow-lg shadow-primary/25 ring-4 ring-white transition-transform duration-300 group-hover:-rotate-6 group-hover:scale-110">
                    {index + 1}
                  </div>
                  <div className="mt-4 flex-1 rounded-3xl border border-border bg-white p-6 text-center shadow-soft transition-all duration-300 group-hover:-translate-y-1 group-hover:border-primary/30 group-hover:shadow-elevated">
                    <h3 className="text-lg font-semibold text-dark">{step.title}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-muted">{step.text}</p>
                  </div>
                </RevealItem>
              ))}
            </ol>
          </Reveal>
        </Container>
      </section>


      <div className="bg-surface">
      <FaqAccordion
        id="mentor-faq"
        title={
          <>
            Mentoring, <Gradient>explained</Gradient>
          </>
        }
        items={faqs}
      />
      </div>

      <CtaBand
        eyebrow="Learn with guidance"
        title="Not sure which mentor or course fits you?"
        description="Talk to our team — we'll match you with the right learning path and batch."
        primary={{ label: "Book Free Counselling", href: "/book-demo?source=trainers" }}
        secondary={{ label: "Explore Courses", href: "/courses" }}
        tertiary={{ label: "View Batches", href: "/batches" }}
      />
    </>
  );
}
