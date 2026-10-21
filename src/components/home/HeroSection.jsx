import { HeroScene } from "@/components/home/HeroScene";
import { Section } from "@/components/shared/Section";
import { Reveal } from "@/components/shared/Reveal";
import { Button } from "@/components/ui/Button";
import { fadeIn } from "@/lib/motion";
import { listCourses } from "@/lib/catalog";
import { categories } from "@/data/categories";

// Trust strip — every figure is derived from the real (published) catalog, never invented.
async function getStats() {
  const courses = await listCourses({ publishedOnly: true });
  const projectCount = courses.reduce((sum, course) => sum + (course.projects?.length ?? 0), 0);
  return [
    { value: courses.length, label: "Courses" },
    { value: categories.length, label: "Learning Paths" },
    { value: projectCount, label: "Hands-on Projects" },
    { value: 3, label: "Learning Modes" },
  ];
}

const features = [
  {
    label: "Live Interactive Classes",
    icon: (
      <>
        <rect x="2.5" y="4" width="15" height="10" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
        <path d="M7 17h6M10 14v3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </>
    ),
  },
  {
    label: "Hands-on Projects",
    icon: (
      <path
        d="M10 2.5l6.5 3.5v8L10 17.5 3.5 14V6L10 2.5zM3.5 6L10 9.5 16.5 6M10 9.5v8"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
    ),
  },
  {
    label: "Completion Certificate",
    icon: (
      <>
        <circle cx="10" cy="8" r="4.5" stroke="currentColor" strokeWidth="1.5" />
        <path d="M7.5 12l-1 5 3.5-2 3.5 2-1-5" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
      </>
    ),
  },
  {
    label: "Career Support",
    icon: (
      <>
        <rect x="3" y="7" width="14" height="9" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
        <path d="M7 7V5.5A1.5 1.5 0 018.5 4h3A1.5 1.5 0 0113 5.5V7M3 11h14" stroke="currentColor" strokeWidth="1.5" />
      </>
    ),
  },
];

// Decorative grid lines, strongest at the top and fading out downward.
const gridStyle = {
  backgroundImage:
    "linear-gradient(to right, rgb(37 99 235 / 0.10) 1px, transparent 1px), linear-gradient(to bottom, rgb(37 99 235 / 0.10) 1px, transparent 1px)",
  backgroundSize: "40px 40px",
  maskImage: "linear-gradient(to bottom, black 0%, black 55%, transparent 100%)",
  WebkitMaskImage: "linear-gradient(to bottom, black 0%, black 55%, transparent 100%)",
};

export async function HeroSection() {
  const stats = await getStats();
  return (
    <div className="relative isolate overflow-hidden bg-gradient-to-b from-surface via-white to-white">
      {/* Decorative background: fading grid lines + soft colour glows. */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10" style={gridStyle} />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-32 -left-24 -z-10 h-[420px] w-[420px] rounded-full bg-primary/10 blur-3xl"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-20 right-0 -z-10 h-[380px] w-[380px] rounded-full bg-secondary/10 blur-3xl"
      />

      <Section
        tone="transparent"
        className="pt-8 sm:pt-10 lg:pt-6 lg:pb-10"
        containerClassName="grid grid-cols-1 items-center gap-8 lg:grid-cols-[1.1fr_1fr] lg:items-end lg:gap-16"
      >
        <Reveal variants={fadeIn} className="relative z-10">
          <span className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-white/80 px-4 py-1.5 text-xs font-semibold text-primary">
            <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-primary" />
            Learn In-Demand Tech Skills
          </span>

          <h1 className="mt-5 text-4xl font-extrabold tracking-tight text-dark sm:text-5xl lg:text-[2.5rem] lg:leading-[1.1] xl:text-[3rem]">
            Build Your Career in Tech with{" "}
            <span className="bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
              TechOTD Academy
            </span>
          </h1>

          <p className="mt-5 max-w-xl text-base text-muted sm:text-lg">
            Industry-focused training, hands-on projects and expert guidance to help you become
            job-ready and grow in your tech career.
          </p>

          <div className="mt-7 flex flex-wrap items-center gap-3">
            <Button
              href="/courses"
              size="lg"
              className="bg-gradient-to-r from-primary to-secondary shadow-card hover:opacity-90"
            >
              Explore Courses
              <span aria-hidden="true">→</span>
            </Button>
            <Button
              href="/book-demo?source=hero"
              variant="outline"
              size="lg"
              className="border-primary/40 text-primary hover:bg-primary/5"
            >
              Book Free Counselling
            </Button>
          </div>

          <ul className="mt-8 grid grid-cols-2 gap-x-4 gap-y-5 sm:grid-cols-4">
            {features.map((feature) => (
              <li key={feature.label} className="flex flex-col items-start gap-2 sm:items-center sm:text-center">
                <span
                  aria-hidden="true"
                  className="flex h-11 w-11 items-center justify-center rounded-full border border-border bg-white text-primary shadow-soft"
                >
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                    {feature.icon}
                  </svg>
                </span>
                <span className="text-xs font-medium leading-snug text-text sm:text-sm">{feature.label}</span>
              </li>
            ))}
          </ul>

          <dl className="mt-8 grid grid-cols-2 gap-y-4 rounded-md border border-border bg-white/90 p-4 shadow-card sm:grid-cols-4 sm:divide-x sm:divide-border">
            {stats.map((stat, index) => (
              <div key={stat.label} className="px-3 sm:first:pl-0">
                <dd className={index % 2 === 0 ? "text-2xl font-bold text-primary" : "text-2xl font-bold text-secondary"}>
                  {stat.value}
                </dd>
                <dt className="text-xs text-muted">{stat.label}</dt>
              </div>
            ))}
          </dl>
        </Reveal>

        {/* Right column on desktop, a normal block on mobile. */}
        <div className="relative mx-auto w-full max-w-lg lg:max-w-none">
          <HeroScene />
        </div>
      </Section>
    </div>
  );
}
