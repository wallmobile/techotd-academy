import { Container } from "@/components/layout/Container";
import { Button } from "@/components/ui/Button";

// Each feature carries its own line icon (24px grid). Copy stays factual: no
// outcome numbers or guarantees, only what the programs actually include.
const features = [
  {
    title: "Industry-Oriented Curriculum",
    description: "Built around the tools and workflows teams actually use.",
    icon: (
      <>
        <path d="M4 5.5A1.5 1.5 0 015.5 4H12v15H5.5A1.5 1.5 0 014 17.5v-12zM12 4h6.5A1.5 1.5 0 0120 5.5v12a1.5 1.5 0 01-1.5 1.5H12" />
        <path d="M7 8h2.5M7 11h2.5M15 8h2M15 11h2" />
      </>
    ),
  },
  {
    title: "Practical Learning",
    description: "Most of your time goes into building, not watching slides.",
    icon: (
      <>
        <path d="M8 8l-4 4 4 4M16 8l4 4-4 4M13.5 5l-3 14" />
      </>
    ),
  },
  {
    title: "Mentor Guidance",
    description: "Expert-led sessions with feedback on your own work.",
    icon: (
      <>
        <circle cx="9" cy="8.5" r="3" />
        <path d="M3.5 19c0-3.3 2.4-5.5 5.5-5.5s5.5 2.200 5.500 5.500" />
        <path d="M16 6.500a2.800 2.800 0 010 5.200M17.500 14c1.900.7 3 2.500 3 5" />
      </>
    ),
  },
  {
    title: "Real-World Projects",
    description: "Portfolio-ready work you can show and explain.",
    icon: (
      <>
        <rect x="3.5" y="7" width="17" height="12" rx="2" />
        <path d="M9 7V5.500A1.500 1.500 0 0110.500 4h3A1.500 1.500 0 0115 5.500V7M3.500 12.500h17" />
      </>
    ),
  },
  {
    title: "Interview Preparation",
    description: "Mock interviews and technical question practice.",
    icon: (
      <>
        <path d="M5 5.500A1.500 1.500 0 016.500 4h11A1.500 1.500 0 0119 5.500v8a1.500 1.500 0 01-1.500 1.500H11l-4 3.500V15h-.5A1.500 1.500 0 015 13.500v-8z" />
        <path d="M9 8.500h6M9 11.500h3.500" />
      </>
    ),
  },
  {
    title: "Career Guidance",
    description: "Resume, portfolio and job-search support.",
    icon: (
      <>
        <path d="M12 3l2.500 5.200 5.700.8-4.100 4 1 5.700L12 16l-5.100 2.700 1-5.700-4.100-4 5.700-.8L12 3z" />
      </>
    ),
  },
];

const highlights = ["Mentor-led sessions", "Project-based learning", "Career support"];

const panelGrid = {
  backgroundImage:
    "linear-gradient(to right, rgb(255 255 255 / 0.05) 1px, transparent 1px), linear-gradient(to bottom, rgb(255 255 255 / 0.05) 1px, transparent 1px)",
  backgroundSize: "44px 44px",
};

export function WhyTechOTD() {
  return (
    <section className="relative isolate overflow-clip bg-gradient-to-br from-[#0b1f3a] via-[#0f2a5c] to-[#25207a] py-14 sm:py-16 lg:py-24">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10" style={panelGrid} />
      <div aria-hidden="true" className="pointer-events-none absolute -left-24 top-10 -z-10 h-72 w-72 rounded-full bg-primary/35 blur-3xl" />
      <div aria-hidden="true" className="pointer-events-none absolute -bottom-24 right-0 -z-10 h-72 w-72 rounded-full bg-secondary/35 blur-3xl" />

      <Container>
        <div className="grid items-center gap-10 lg:grid-cols-12 lg:gap-14">
          <div className="lg:col-span-5">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3.5 py-1.5 text-xs font-semibold uppercase tracking-widest text-cyan-200 backdrop-blur">
              <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-cyan-300" />
              Why TechOTD Academy
            </span>
            <h2 className="mt-5 text-4xl font-bold leading-tight tracking-tight text-white sm:text-5xl">
              Learning designed for the{" "}
              <span className="bg-gradient-to-r from-cyan-300 to-violet-300 bg-clip-text text-transparent">
                real world.
              </span>
            </h2>
            <p className="mt-5 max-w-lg text-base leading-relaxed text-white/70 sm:text-lg">
              Every program is built around one idea: you learn by building, with mentors who review your work and
              support that continues past the classroom.
            </p>

            <ul className="mt-6 flex flex-wrap gap-2">
              {highlights.map((item) => (
                <li
                  key={item}
                  className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-sm text-white/80"
                >
                  <svg aria-hidden="true" width="14" height="14" viewBox="0 0 20 20" fill="none" className="text-cyan-300">
                    <path d="M4.500 10.500l3.500 3.500 7.500-8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  {item}
                </li>
              ))}
            </ul>

            <div className="mt-8 flex flex-wrap gap-3">
              <Button href="/book-demo?source=why-techotd" size="lg" className="bg-white text-primary hover:bg-white/90 active:bg-white/80">
                Book a Free Demo
                <span aria-hidden="true">→</span>
              </Button>
              <Button
                href="/courses"
                variant="ghost"
                size="lg"
                className="border border-white/25 text-white hover:bg-white/10"
              >
                Explore Courses
              </Button>
            </div>
          </div>

          <ul className="grid auto-rows-fr grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5 lg:col-span-7">
            {features.map((feature, index) => (
              <li
                key={feature.title}
                className="group relative flex min-h-[12.5rem] flex-col overflow-hidden rounded-2xl border border-white/10 bg-white/[0.06] p-6 shadow-[0_1px_0_0_rgb(255_255_255/0.06)_inset] backdrop-blur transition-all duration-300 hover:-translate-y-1 hover:border-white/25 hover:bg-white/10 hover:shadow-elevated"
              >
                <span
                  aria-hidden="true"
                  className="pointer-events-none absolute -right-8 -top-8 h-28 w-28 rounded-full bg-gradient-to-br from-primary/0 to-secondary/0 blur-2xl transition-all duration-300 group-hover:from-primary/40 group-hover:to-secondary/40"
                />

                <div className="relative flex items-start justify-between">
                  <span
                    aria-hidden="true"
                    className="flex h-12 w-12 flex-none items-center justify-center rounded-xl bg-gradient-to-br from-primary to-secondary text-white shadow-soft transition-transform duration-300 group-hover:scale-105"
                  >
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                      {feature.icon}
                    </svg>
                  </span>
                  <span aria-hidden="true" className="text-sm font-semibold tabular-nums tracking-widest text-white/30 transition-colors duration-300 group-hover:text-cyan-300">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                </div>

                <h3 className="relative mt-5 text-lg font-semibold leading-snug text-white">{feature.title}</h3>
                <p className="relative mt-2 text-sm leading-relaxed text-white/65">{feature.description}</p>

                <span
                  aria-hidden="true"
                  className="absolute inset-x-0 bottom-0 h-0.5 origin-left scale-x-0 bg-gradient-to-r from-cyan-300 to-violet-400 transition-transform duration-300 group-hover:scale-x-100"
                />
              </li>
            ))}
          </ul>
        </div>
      </Container>
    </section>
  );
}
