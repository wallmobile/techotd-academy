import { Container } from "@/components/layout/Container";
import { Reveal, RevealItem } from "@/components/shared/Reveal";
import { Gradient, GlowBackdrop } from "@/components/training/icons";
import { staggerContainer } from "@/lib/motion";

const svgProps = {
  viewBox: "0 0 20 20",
  width: 24,
  height: 24,
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.5,
  strokeLinecap: "round",
  strokeLinejoin: "round",
  "aria-hidden": true,
};

const modeInfo = {
  Classroom: {
    description: "Learn with instructors in a structured classroom environment.",
    icon: (
      <svg {...svgProps}>
        <path d="M3 17V7l7-4 7 4v10M3 17h14M8 17v-4h4v4" />
      </svg>
    ),
  },
  "Live Online": {
    description: "Attend interactive instructor-led sessions from anywhere.",
    icon: (
      <svg {...svgProps}>
        <rect x="2.5" y="3.5" width="15" height="10" rx="2" />
        <path d="M7 17h6M10 13.5V17" />
      </svg>
    ),
  },
  Hybrid: {
    description: "Combine classroom learning with online flexibility.",
    icon: (
      <svg {...svgProps}>
        <path d="M10 3l7 3.5-7 3.5-7-3.5L10 3zM3 10l7 3.5 7-3.5M3 13.5L10 17l7-3.5" />
      </svg>
    ),
  },
};

export function LearningModes({ course }) {
  return (
    <section className="relative isolate overflow-hidden bg-surface py-12 sm:py-14 lg:py-20">
      <GlowBackdrop />
      <Container>
        <div className="max-w-2xl">
          <p className="text-sm font-semibold uppercase tracking-wide text-primary">Learning Modes</p>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight text-dark sm:text-4xl">
            Available <Gradient>for this course</Gradient>
          </h2>
        </div>

        <Reveal variants={staggerContainer} className="mt-10 grid grid-cols-1 gap-5 sm:grid-cols-3">
          {course.modes.map((mode) => (
            <RevealItem
              key={mode}
              className="group relative overflow-hidden rounded-3xl border border-border bg-white p-6 shadow-card transition-all duration-300 hover:-translate-y-1.5 hover:border-primary/30 hover:shadow-elevated"
            >
              <span aria-hidden="true" className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-linear-to-br from-primary/15 to-secondary/15 transition-transform duration-500 group-hover:scale-150" />
              <span className="relative flex h-14 w-14 items-center justify-center rounded-2xl bg-linear-to-br from-primary to-secondary text-white shadow-lg shadow-primary/25 transition-transform duration-300 group-hover:-rotate-6 group-hover:scale-110">
                {modeInfo[mode]?.icon ?? mode.slice(0, 2).toUpperCase()}
              </span>
              <h3 className="relative mt-5 text-lg font-semibold text-dark">{mode}</h3>
              <p className="relative mt-2 text-sm leading-relaxed text-muted">{modeInfo[mode]?.description}</p>
            </RevealItem>
          ))}
        </Reveal>
      </Container>
    </section>
  );
}
