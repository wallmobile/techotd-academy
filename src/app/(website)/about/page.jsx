import Link from "next/link";
import { PageHero } from "@/components/shared/PageHero";
import { CtaBand } from "@/components/shared/CtaBand";
import { Container } from "@/components/layout/Container";
import { Button } from "@/components/ui/Button";
import { Reveal, RevealItem } from "@/components/shared/Reveal";
import { GlowBackdrop, Gradient } from "@/components/training/icons";
import { contact } from "@/constants/contact";
import { listCourses } from "@/lib/catalog";
import { trainers } from "@/data/trainers";
import { trainingModes } from "@/data/trainingModes";
import { FaqAccordion } from "@/components/shared/FaqAccordion";
import { techInfo } from "@/data/techInfo";
import { staggerContainer } from "@/lib/motion";

export const metadata = {
  title: "About TechOTD Academy",
  description:
    "TechOTD Academy is a career-focused training institute in Noida offering practical, industry-ready programs guided by expert mentors.",
  alternates: { canonical: "/about" },
};

const pillars = [
  { word: "Learn", text: "Structured, mentor-led programs that explain the why, not just the how." },
  { word: "Practice", text: "Guided exercises after every topic so concepts stick while they're fresh." },
  { word: "Build", text: "Real assignments and capstone projects you can show and explain." },
  { word: "Grow", text: "Career guidance that helps you present your skills with confidence." },
];

const values = [
  {
    title: "Practical over theoretical",
    text: "Every module ends with something you build. If it can't be practised, it isn't in the syllabus.",
  },
  {
    title: "Honest guidance",
    text: "We don't promise jobs or guaranteed outcomes. We tell you what a course covers, who it suits and who should start elsewhere.",
  },
  {
    title: "Feedback that improves you",
    text: "Mentors review your work and explain what to fix, so each assignment makes the next one better.",
  },
  {
    title: "Open to beginners",
    text: "You don't need a tech background to start. Paths begin from the fundamentals and build up step by step.",
  },
];

const inside = [
  { title: "Live sessions", text: "Instructor-led classes where you can ask questions as they come up — online or in the classroom.", icon: "▶" },
  { title: "Guided practice", text: "Hands-on exercises right after each topic, so you apply it while it's fresh.", icon: "✎" },
  { title: "Assignments", text: "Every module ends with a small piece of real work that you build yourself.", icon: "▣" },
  { title: "Mentor feedback", text: "A mentor reviews your work and tells you what to improve before you move on.", icon: "✦" },
  { title: "Capstone project", text: "A final project that brings the whole course together and goes in your portfolio.", icon: "★" },
  { title: "Career guidance", text: "Resume, portfolio and interview support alongside the course.", icon: "➜" },
];

const faqs = [
  {
    question: "Who can join TechOTD Academy?",
    answer:
      "Anyone who wants to learn practical tech skills. Several courses start from the fundamentals and need no prior coding experience; others list their prerequisites clearly on the course page.",
  },
  {
    question: "Which learning formats are available?",
    answer:
      "Live online, classroom and hybrid formats, plus corporate training for teams. Which formats a course offers is shown on its page, and a counsellor can help you choose a batch.",
  },
  {
    question: "Do I need my own laptop?",
    answer:
      "A laptop or desktop with a stable internet connection is recommended so you can practise between sessions.",
  },
  {
    question: "How do I get started?",
    answer:
      "Book a free counselling session. We'll talk through your goals, suggest a course and show you the upcoming batches — there's no obligation to enrol.",
  },
];

const marqueeTech = Object.keys(techInfo);

const leaders = [
  { name: "Arun Tiwari", role: "Director", initials: "AT" },
  { name: "Noor Alam", role: "Training Head", initials: "NA" },
];

function PillarCard() {
  return (
    <div className="relative">
      <span aria-hidden="true" className="absolute inset-0 translate-x-4 translate-y-4 rotate-3 rounded-3xl bg-linear-to-br from-primary/25 to-secondary/25" />
      <div className="animate-float relative overflow-hidden rounded-3xl bg-linear-to-br from-primary via-primary to-secondary p-7 text-white shadow-elevated sm:p-8">
        <span aria-hidden="true" className="animate-drift pointer-events-none absolute -right-12 -top-12 h-48 w-48 rounded-full bg-white/10" />
        <span aria-hidden="true" className="animate-shine pointer-events-none absolute inset-y-0 left-0 w-1/4 bg-linear-to-r from-transparent via-white/20 to-transparent" />
        <p className="relative text-[11px] font-semibold uppercase tracking-[0.2em] text-white/75">Our approach</p>
        <ul className="relative mt-4 space-y-3">
          {pillars.map((pillar, index) => (
            <li
              key={pillar.word}
              className="animate-fade-up-in flex items-center gap-4 rounded-2xl bg-white/15 px-4 py-3 backdrop-blur-sm"
              style={{ animationDelay: `${300 + index * 110}ms` }}
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white text-sm font-bold text-primary">
                {index + 1}
              </span>
              <span className="text-2xl font-bold tracking-tight">{pillar.word}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

export default function AboutPage() {
  const mapsHref = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(contact.address)}`;

  return (
    <>
      <PageHero
        crumbs={[{ label: "Home", href: "/" }, { label: "About" }]}
        eyebrow="About TechOTD Academy"
        title={["We help you", "learn tech", "by building it"]}
        description="TechOTD Academy is a career-focused training institute in Noida offering practical, industry-ready programs guided by expert mentors — in live online, classroom and hybrid formats."
        aside={<PillarCard />}
        stats={[
          { value: listCourses({ publishedOnly: true }).length, label: "Courses" },
          { value: trainers.length, label: "Mentors" },
          { value: trainingModes.length, label: "Training modes" },
        ]}
      >
        <Button href="/courses" size="lg" className="bg-linear-to-r from-primary to-secondary shadow-lg shadow-primary/25">
          Explore Courses
        </Button>
        <Button href="/book-demo?source=about" variant="outline" size="lg">
          Talk to a Counsellor
        </Button>
      </PageHero>

      {/* Technologies marquee */}
      <section aria-label="Technologies we teach" className="overflow-hidden border-y border-border bg-white py-5">
        <div className="mx-auto max-w-[1280px] px-6 sm:px-8 lg:px-10">
          <p className="mb-3 text-center text-[11px] font-semibold uppercase tracking-[0.2em] text-muted">
            Technologies we teach
          </p>
        </div>
        <div
          className="relative"
          style={{
            maskImage: "linear-gradient(to right, transparent, black 8%, black 92%, transparent)",
            WebkitMaskImage: "linear-gradient(to right, transparent, black 8%, black 92%, transparent)",
          }}
        >
          <ul className="animate-marquee flex w-max gap-3 hover:[animation-play-state:paused]">
            {[...marqueeTech, ...marqueeTech].map((tech, index) => (
              <li
                key={`${tech}-${index}`}
                aria-hidden={index >= marqueeTech.length ? "true" : undefined}
                className="rounded-full border border-border bg-surface px-4 py-2 text-sm font-semibold text-dark"
              >
                {tech}
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Mission */}
      <section className="bg-white py-12 sm:py-14 lg:py-20">
        <Container>
          <div className="grid gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:gap-16">
            <Reveal>
              <p className="text-sm font-semibold uppercase tracking-wide text-primary">Our mission</p>
              <h2 className="mt-3 text-3xl font-semibold tracking-tight text-dark sm:text-4xl">
                Make learning technology <Gradient>practical and honest</Gradient>
              </h2>
            </Reveal>
            <Reveal delay={120} className="space-y-4 text-base leading-relaxed text-muted">
              <p className="text-lg font-medium leading-relaxed text-dark">
                Too many people finish a course and still can&apos;t build anything. We designed TechOTD Academy
                around the opposite idea: you learn a topic, practise it straight away, and use it in a project.
              </p>
              <p>
                Our programs cover full stack and frontend development, Python, data analytics, AI and cloud &amp;
                DevOps. Each one is broken into modules with clear assignments, mentor feedback and a capstone, so
                you always know what you&apos;re working toward.
              </p>
              <p>
                We&apos;re also straightforward about what we offer: practical training and career guidance. We
                don&apos;t make promises about jobs or outcomes — we help you build skills and present them well.
              </p>
            </Reveal>
          </div>
        </Container>
      </section>

      {/* Pillars */}
      <section className="relative isolate overflow-hidden bg-surface py-12 sm:py-14 lg:py-20">
        <GlowBackdrop />
        <Container>
          <div className="max-w-2xl">
            <p className="text-sm font-semibold uppercase tracking-wide text-primary">How we teach</p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight text-dark sm:text-4xl">
              Learn. Practice. Build. <Gradient>Grow.</Gradient>
            </h2>
          </div>
          <Reveal variants={staggerContainer} className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {pillars.map((pillar, index) => (
              <RevealItem
                key={pillar.word}
                className="group relative overflow-hidden rounded-3xl border border-border bg-white p-6 shadow-card transition-all duration-300 hover:-translate-y-1.5 hover:border-primary/30 hover:shadow-elevated"
              >
                <span aria-hidden="true" className="pointer-events-none absolute -bottom-3 -right-1 select-none text-8xl font-black leading-none text-primary/5">
                  {index + 1}
                </span>
                <span className="relative flex h-12 w-12 items-center justify-center rounded-2xl bg-linear-to-br from-primary to-secondary text-base font-bold text-white shadow-lg shadow-primary/25 transition-transform duration-300 group-hover:-rotate-6 group-hover:scale-110">
                  {pillar.word[0]}
                </span>
                <h3 className="relative mt-5 text-xl font-semibold text-dark">{pillar.word}</h3>
                <p className="relative mt-2 text-sm leading-relaxed text-muted">{pillar.text}</p>
              </RevealItem>
            ))}
          </Reveal>
        </Container>
      </section>

      {/* Formats */}
      <section className="bg-white py-12 sm:py-14 lg:py-20">
        <Container>
          <div className="max-w-2xl">
            <p className="text-sm font-semibold uppercase tracking-wide text-primary">Ways to learn</p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight text-dark sm:text-4xl">
              A format that <Gradient>fits your life</Gradient>
            </h2>
          </div>
          <Reveal variants={staggerContainer} className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {trainingModes.map((mode) => (
              <RevealItem key={mode.slug}>
                <Link
                  href={`/training/${mode.slug}`}
                  className="group flex h-full flex-col rounded-3xl border border-border bg-white p-6 shadow-soft transition-all duration-300 hover:-translate-y-1.5 hover:border-primary/30 hover:shadow-elevated"
                >
                  <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-linear-to-br from-primary to-secondary text-sm font-black text-white shadow-md shadow-primary/25 transition-transform duration-300 group-hover:-rotate-6">
                    {mode.icon}
                  </span>
                  <h3 className="mt-4 text-lg font-semibold text-dark transition-colors group-hover:text-primary">{mode.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted">{mode.shortDescription}</p>
                  <span className="mt-auto inline-flex items-center gap-1.5 pt-4 text-sm font-semibold text-primary">
                    Learn more <span aria-hidden="true" className="transition-transform duration-300 group-hover:translate-x-1">→</span>
                  </span>
                </Link>
              </RevealItem>
            ))}
          </Reveal>
        </Container>
      </section>

      {/* Inside every program */}
      <section className="relative isolate overflow-hidden bg-surface py-12 sm:py-14 lg:py-20">
        <GlowBackdrop />
        <Container>
          <div className="max-w-2xl">
            <p className="text-sm font-semibold uppercase tracking-wide text-primary">Inside every program</p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight text-dark sm:text-4xl">
              What you actually <Gradient>get</Gradient>
            </h2>
            <p className="mt-3 text-base text-muted">
              Whichever course you choose, the learning experience is built from the same six parts.
            </p>
          </div>
          <Reveal variants={staggerContainer} className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {inside.map((item, index) => (
              <RevealItem
                key={item.title}
                className="group relative flex gap-4 overflow-hidden rounded-3xl border border-border bg-white p-6 shadow-soft transition-all duration-300 hover:-translate-y-1.5 hover:border-primary/30 hover:shadow-elevated"
              >
                <span aria-hidden="true" className="pointer-events-none absolute -bottom-4 -right-1 select-none text-7xl font-black leading-none text-primary/5">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <span className="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-linear-to-br from-primary to-secondary text-lg text-white shadow-lg shadow-primary/25 transition-transform duration-300 group-hover:-rotate-6 group-hover:scale-110">
                  {item.icon}
                </span>
                <div className="relative">
                  <h3 className="text-lg font-semibold text-dark">{item.title}</h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-muted">{item.text}</p>
                </div>
              </RevealItem>
            ))}
          </Reveal>
        </Container>
      </section>

      {/* Values */}
      <section className="bg-white py-12 sm:py-14 lg:py-20">
        <Container>
          <div className="max-w-2xl">
            <p className="text-sm font-semibold uppercase tracking-wide text-primary">What we stand for</p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight text-dark sm:text-4xl">
              Our <Gradient>values</Gradient>
            </h2>
          </div>
          <Reveal variants={staggerContainer} className="mt-10 grid gap-5 md:grid-cols-2">
            {values.map((value) => (
              <RevealItem
                key={value.title}
                className="group relative flex gap-4 overflow-hidden rounded-3xl border border-border bg-white p-6 shadow-soft transition-all duration-300 hover:-translate-y-1 hover:border-primary/30 hover:shadow-elevated"
              >
                <span aria-hidden="true" className="absolute inset-y-0 left-0 w-1 origin-top scale-y-0 bg-linear-to-b from-primary to-secondary transition-transform duration-300 group-hover:scale-y-100" />
                <span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary transition-all duration-300 group-hover:bg-linear-to-br group-hover:from-primary group-hover:to-secondary group-hover:text-white">
                  ✓
                </span>
                <div>
                  <h3 className="text-lg font-semibold text-dark">{value.title}</h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-muted">{value.text}</p>
                </div>
              </RevealItem>
            ))}
          </Reveal>
        </Container>
      </section>

      {/* Leadership */}
      <section className="bg-surface py-12 sm:py-14 lg:py-20">
        <Container>
          <div className="max-w-2xl">
            <p className="text-sm font-semibold uppercase tracking-wide text-primary">Leadership</p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight text-dark sm:text-4xl">
              The people <Gradient>behind the academy</Gradient>
            </h2>
          </div>
          <Reveal variants={staggerContainer} className="mt-10 grid gap-5 sm:grid-cols-2 lg:max-w-3xl">
            {leaders.map((leader) => (
              <RevealItem
                key={leader.name}
                className="group flex items-center gap-5 rounded-3xl border border-border bg-white p-6 shadow-card transition-all duration-300 hover:-translate-y-1 hover:border-primary/30 hover:shadow-elevated"
              >
                <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-linear-to-br from-primary to-secondary text-lg font-bold text-white shadow-lg shadow-primary/25 transition-transform duration-300 group-hover:-rotate-6 group-hover:scale-105">
                  {leader.initials}
                </span>
                <div>
                  <h3 className="text-lg font-semibold text-dark">{leader.name}</h3>
                  <p className="text-sm font-medium text-primary">{leader.role}</p>
                  <p className="text-xs text-muted">TechOTD Academy</p>
                </div>
              </RevealItem>
            ))}
          </Reveal>
          <p className="mt-6 text-sm text-muted">
            Want to meet the mentors who teach the courses?{" "}
            <Link href="/trainers" className="font-semibold text-primary hover:underline">
              See our trainers
            </Link>
            .
          </p>
        </Container>
      </section>

      {/* Visit */}
      <section className="bg-white py-12 sm:py-14 lg:py-20">
        <Container>
          <div className="relative overflow-hidden rounded-3xl border border-border bg-white p-6 shadow-card sm:p-10">
            <span aria-hidden="true" className="animate-drift pointer-events-none absolute -right-20 -top-20 h-72 w-72 rounded-full bg-linear-to-br from-primary/10 to-secondary/10" />
            <div className="relative grid gap-8 lg:grid-cols-[1fr_1fr] lg:items-center">
              <div>
                <p className="text-sm font-semibold uppercase tracking-wide text-primary">Visit or contact us</p>
                <h2 className="mt-3 text-3xl font-semibold tracking-tight text-dark sm:text-4xl">
                  Come see the <Gradient>academy</Gradient>
                </h2>
                <p className="mt-3 text-base text-muted">
                  Drop by for a conversation about courses, or reach out and we&apos;ll get back to you.
                </p>
                <div className="mt-6 flex flex-wrap gap-3">
                  <a
                    href={mapsHref}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex h-11 items-center gap-2 rounded-full bg-linear-to-r from-primary to-secondary px-5 text-sm font-semibold text-white shadow-md shadow-primary/25 transition-all hover:-translate-y-0.5 hover:shadow-lg"
                  >
                    Open in Maps <span aria-hidden="true">↗</span>
                  </a>
                  <Button href="/enquiry?source=about" variant="outline">
                    Send an enquiry
                  </Button>
                </div>
              </div>

              <ul className="flex flex-col gap-3">
                {[
                  { label: "Address", value: contact.address, href: null, icon: "◉" },
                  { label: "Phone", value: contact.phone, href: contact.phoneHref, icon: "✆" },
                  { label: "Email", value: contact.email, href: contact.emailHref, icon: "✉" },
                ].map((item) => (
                  <li key={item.label} className="flex items-start gap-4 rounded-2xl bg-surface p-4">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-linear-to-br from-primary to-secondary text-base text-white shadow-md shadow-primary/25">
                      {item.icon}
                    </span>
                    <div className="min-w-0">
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-muted">{item.label}</p>
                      {item.href ? (
                        <a href={item.href} className="break-words text-sm font-semibold text-dark hover:text-primary">
                          {item.value}
                        </a>
                      ) : (
                        <p className="text-sm font-semibold leading-snug text-dark">{item.value}</p>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </Container>
      </section>

      <div className="bg-surface">
        <FaqAccordion
          id="about-faq"
          title={
            <>
              Good to <Gradient>know</Gradient>
            </>
          }
          items={faqs}
        />
      </div>

      <CtaBand
        eyebrow="Start your journey"
        title="Learn. Practice. Build. Grow."
        description="Talk to our team about the right course and batch for you."
        primary={{ label: "Book Free Counselling", href: "/book-demo?source=about" }}
        secondary={{ label: "Explore Courses", href: "/courses" }}
        tertiary={{ label: "View Batches", href: "/batches" }}
      />
    </>
  );
}
