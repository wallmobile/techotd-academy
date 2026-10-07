import { Container } from "@/components/layout/Container";
import { ImpactCounter } from "@/components/home/ImpactCounter";

// Figures supplied by the TechOTD Academy team. Keep them in sync with what
// the academy can substantiate (especially placement and hiring claims).
const metrics = [
  {
    value: 10, suffix: "K+", label: "Students Trained", note: "Empowering learners with in-demand tech skills",
    icon: <path d="M10 3L2 7l8 4 8-4-8-4zM5 9v4c0 1 2.2 2.5 5 2.5s5-1.5 5-2.5V9" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />,
  },
  {
    value: 50, suffix: "+", label: "Expert Trainers", note: "Learn from industry professionals",
    icon: (
      <>
        <circle cx="7" cy="7.5" r="2.3" stroke="currentColor" strokeWidth="1.6" />
        <circle cx="14" cy="7.5" r="2.3" stroke="currentColor" strokeWidth="1.6" />
        <path d="M2.5 16.5c0-2.8 2-4.7 4.5-4.7s4.5 1.9 4.5 4.7M11.5 12.1c2.3.2 4 2 4 4.4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      </>
    ),
  },
  {
    value: 100, suffix: "+", label: "Real-World Projects", note: "Hands-on experience with live projects",
    icon: <path d="M5 3h7l3 3v11H5V3zM12 3v3h3M7.5 10h5M7.5 13h5" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" strokeLinecap="round" />,
  },
  {
    value: 90, suffix: "%+", label: "Placement Support", note: "Dedicated career guidance and placement assistance",
    icon: (
      <>
        <rect x="3" y="7" width="14" height="9" rx="1.5" stroke="currentColor" strokeWidth="1.6" />
        <path d="M7 7V5.5A1.5 1.5 0 018.5 4h3A1.5 1.5 0 0113 5.5V7M3 11h14" stroke="currentColor" strokeWidth="1.6" />
      </>
    ),
  },
  {
    value: 500, suffix: "+", label: "Hiring Partners", note: "Trusted by companies across industries",
    icon: <path d="M10 2.5l2.2 4.6 5 .7-3.6 3.5.9 5-4.5-2.4-4.5 2.4.9-5L2.800 7.800l5-.7L10 2.500z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />,
  },
  {
    value: 20, suffix: "+", label: "Industry-Focused Courses", note: "Updated curriculum for real-world careers",
    icon: <path d="M3 5.5A1.5 1.5 0 014.5 4H10v12H4.5A1.5 1.5 0 013 14.5v-9zM10 4h5.5A1.5 1.5 0 0117 5.5v9a1.5 1.5 0 01-1.5 1.5H10" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />,
  },
];

const panelGrid = {
  backgroundImage:
    "linear-gradient(to right, rgb(255 255 255 / 0.06) 1px, transparent 1px), linear-gradient(to bottom, rgb(255 255 255 / 0.06) 1px, transparent 1px)",
  backgroundSize: "40px 40px",
};

// Six tints, all inside the brand's blue → violet family.
const tints = [
  { card: "from-blue-50 to-white border-blue-100", corner: "bg-blue-200/60", icon: "bg-blue-100 text-primary", number: "text-primary", bar: "bg-primary" },
  { card: "from-violet-50 to-white border-violet-100", corner: "bg-violet-200/60", icon: "bg-violet-100 text-secondary", number: "text-secondary", bar: "bg-secondary" },
  { card: "from-sky-50 to-white border-sky-100", corner: "bg-sky-200/60", icon: "bg-sky-100 text-sky-600", number: "text-sky-600", bar: "bg-sky-500" },
  { card: "from-indigo-50 to-white border-indigo-100", corner: "bg-indigo-200/60", icon: "bg-indigo-100 text-indigo-600", number: "text-indigo-600", bar: "bg-indigo-500" },
  { card: "from-fuchsia-50 to-white border-fuchsia-100", corner: "bg-fuchsia-200/60", icon: "bg-fuchsia-100 text-fuchsia-600", number: "text-fuchsia-600", bar: "bg-fuchsia-500" },
  { card: "from-purple-50 to-white border-purple-100", corner: "bg-purple-200/60", icon: "bg-purple-100 text-purple-700", number: "text-purple-700", bar: "bg-purple-600" },
];

export function ImpactCreated() {
  return (
    <section className="relative isolate overflow-hidden bg-gradient-to-br from-[#0b1f3a] via-[#122f73] to-[#3b2a9e] py-12 sm:py-14">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10" style={panelGrid} />
      <div aria-hidden="true" className="pointer-events-none absolute -right-28 -top-28 -z-10 h-[26rem] w-[26rem] rounded-full border border-white/10" />
      <div aria-hidden="true" className="pointer-events-none absolute -left-20 -top-16 -z-10 h-64 w-64 rounded-full bg-primary/40 blur-3xl" />
      <div aria-hidden="true" className="pointer-events-none absolute -bottom-20 right-10 -z-10 h-64 w-64 rounded-full bg-secondary/40 blur-3xl" />

      <Container className="xl:max-w-[1440px]">
        <div className="mb-8 text-center">
          <h2 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">
            IMPACT{" "}
            <span className="bg-gradient-to-r from-cyan-300 to-violet-300 bg-clip-text text-transparent">CREATED</span>
          </h2>
          <div aria-hidden="true" className="mx-auto mt-3 h-1 w-14 rounded-full bg-gradient-to-r from-cyan-300 to-violet-400" />
        </div>

        <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          {metrics.map((metric, index) => {
            const tint = tints[index];
            return (
              <li
                key={metric.label}
                className={`group relative flex flex-col overflow-hidden rounded-2xl border bg-gradient-to-br px-4 py-4 shadow-elevated transition-all duration-200 hover:-translate-y-1 ${tint.card}`}
              >
                <span
                  aria-hidden="true"
                  className={`absolute -right-8 -top-10 h-24 w-24 rounded-full transition-transform duration-300 group-hover:scale-125 ${tint.corner}`}
                />
                <div className="relative flex items-center gap-3">
                  <span aria-hidden="true" className={`flex h-11 w-11 flex-none items-center justify-center rounded-full ${tint.icon}`}>
                    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                      {metric.icon}
                    </svg>
                  </span>
                  <p className={`text-3xl font-extrabold leading-none tracking-tight ${tint.number}`}>
                    <ImpactCounter value={metric.value} suffix={metric.suffix} />
                  </p>
                </div>
                <h3 className="relative mt-3 text-sm font-semibold leading-tight text-dark">{metric.label}</h3>
                <p className="relative mt-1 text-xs leading-snug text-muted">{metric.note}</p>
              </li>
            );
          })}
        </ul>
      </Container>
    </section>
  );
}
