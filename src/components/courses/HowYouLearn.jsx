import { Container } from "@/components/layout/Container";
import { Reveal, RevealItem } from "@/components/shared/Reveal";
import { Gradient, GlowBackdrop } from "@/components/training/icons";
import { staggerContainer } from "@/lib/motion";

const svg = {
  viewBox: "0 0 20 20",
  width: 22,
  height: 22,
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.6,
  strokeLinecap: "round",
  strokeLinejoin: "round",
  "aria-hidden": true,
};

function sessionText(modes) {
  const classroom = modes.includes("Classroom");
  const online = modes.includes("Live Online");
  if (classroom && online) return "Join a live instructor-led session — in the classroom or online, whichever batch you choose.";
  if (classroom) return "Join an instructor-led session in the classroom and ask questions as they come up.";
  return "Join a live, instructor-led online session and ask questions in real time.";
}

export function HowYouLearn({ course }) {
  const steps = [
    {
      title: "Learn it live",
      text: sessionText(course.modes),
      icon: (
        <svg {...svg}>
          <rect x="2.5" y="3.5" width="15" height="10" rx="2" />
          <path d="M7 17h6M10 13.5V17" />
        </svg>
      ),
    },
    {
      title: "Practice right away",
      text: "Apply the topic in guided exercises while it's fresh, so it sticks.",
      icon: (
        <svg {...svg}>
          <path d="M7 6l-4 4 4 4M13 6l4 4-4 4" />
        </svg>
      ),
    },
    {
      title: "Build the assignment",
      text: "Finish each module with a small, real piece of work — your own, not a copy-along.",
      icon: (
        <svg {...svg}>
          <rect x="4" y="3" width="12" height="14" rx="2" />
          <path d="M7 8h6M7 11h6M7 14h3" />
        </svg>
      ),
    },
    {
      title: "Get mentor feedback",
      text: "A mentor reviews your work and tells you what to improve before you move on.",
      icon: (
        <svg {...svg}>
          <path d="M4 5h12v8H9l-3 3v-3H4z" />
        </svg>
      ),
    },
  ];

  return (
    <section id="how" className="relative isolate scroll-mt-36 overflow-hidden bg-surface py-12 sm:py-14 lg:py-20">
      <GlowBackdrop />
      <Container>
        <div className="max-w-2xl">
          <p className="text-sm font-semibold uppercase tracking-wide text-primary">How you&apos;ll learn</p>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight text-dark sm:text-4xl">
            What a typical <Gradient>module</Gradient> looks like
          </h2>
          <p className="mt-3 text-base text-muted">
            Every module follows the same four-step rhythm, so you always know what comes next.
          </p>
        </div>

        <Reveal variants={staggerContainer} className="relative mt-12">
          <div aria-hidden="true" className="absolute left-[12.5%] right-[12.5%] top-7 hidden h-0.5 rounded-full bg-linear-to-r from-primary/30 via-secondary/40 to-primary/30 lg:block" />
          <ol className="relative grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {steps.map((step, index) => (
              <RevealItem key={step.title} as="li" className="group relative flex flex-col">
                <div className="relative z-10 mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-linear-to-br from-primary to-secondary text-white shadow-lg shadow-primary/25 ring-4 ring-surface transition-transform duration-300 group-hover:-rotate-6 group-hover:scale-110">
                  {step.icon}
                </div>
                <div className="mt-4 flex-1 rounded-3xl border border-border bg-white p-5 text-center shadow-soft transition-all duration-300 group-hover:-translate-y-1 group-hover:border-primary/30 group-hover:shadow-elevated">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-primary">Step {index + 1}</p>
                  <h3 className="mt-1 text-lg font-semibold text-dark">{step.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted">{step.text}</p>
                </div>
              </RevealItem>
            ))}
          </ol>
        </Reveal>
      </Container>
    </section>
  );
}
