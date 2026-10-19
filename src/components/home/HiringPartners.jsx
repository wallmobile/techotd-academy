import { Section } from "@/components/shared/Section";
import { Reveal } from "@/components/shared/Reveal";
import { listCourses } from "@/lib/catalog";
import { cn } from "@/lib/utils";

// No verified hiring partnerships exist yet, so this section shows the
// industry technologies our courses teach instead of company logos.
// Swap back to a "Hiring Partners" logo grid only once real partners exist.
//
// Every technology listed on any course is shown. New ones appear
// automatically (as "Other") until they are added to CATEGORY_OF below.

const CATEGORIES = {
  frontend: { label: "Frontend", tile: "from-sky-500 to-primary", dot: "bg-sky-500" },
  backend: { label: "Backend", tile: "from-indigo-500 to-violet-600", dot: "bg-indigo-500" },
  data: { label: "Data", tile: "from-amber-400 to-orange-500", dot: "bg-amber-500" },
  ai: { label: "AI", tile: "from-fuchsia-500 to-pink-500", dot: "bg-fuchsia-500" },
  cloud: { label: "Cloud & Tools", tile: "from-emerald-500 to-teal-500", dot: "bg-emerald-500" },
  other: { label: "Other", tile: "from-slate-500 to-slate-700", dot: "bg-slate-500" },
};

const CATEGORY_OF = {
  HTML: "frontend",
  CSS: "frontend",
  JavaScript: "frontend",
  React: "frontend",
  JSX: "frontend",
  "React Router": "frontend",
  "Next.js": "frontend",
  "Server Components": "frontend",
  "Tailwind CSS": "frontend",
  "Node.js": "backend",
  Express: "backend",
  "REST APIs": "backend",
  Python: "backend",
  Flask: "backend",
  Django: "backend",
  MongoDB: "data",
  SQL: "data",
  Pandas: "data",
  "Data Visualization": "data",
  "Vector Databases": "data",
  "LLM APIs": "ai",
  "Prompt Engineering": "ai",
  AWS: "cloud",
  Docker: "cloud",
  "CI/CD": "cloud",
  Linux: "cloud",
  Git: "cloud",
};

// Spread the list across rows round-robin so every row mixes the whole stack.
const ROWS = 3;

const monogram = (name) => {
  const clean = name.replace(/[^A-Za-z0-9+#]/g, " ").trim();
  const words = clean.split(/\s+/);
  return (words.length > 1 ? words[0][0] + words[1][0] : clean.slice(0, 2)).replace(/^./, (c) => c.toUpperCase());
};

function TechCard({ name, category }) {
  const meta = CATEGORIES[category];

  return (
    <li className="group relative flex flex-none items-center gap-3 overflow-hidden rounded-2xl border border-border bg-white/80 py-3 pl-3 pr-5 shadow-soft backdrop-blur transition-all duration-300 hover:-translate-y-1 hover:border-transparent hover:shadow-elevated">
      <span
        aria-hidden="true"
        className={cn("absolute inset-0 bg-gradient-to-br opacity-0 transition-opacity duration-300 group-hover:opacity-[0.07]", meta.tile)}
      />
      <span
        aria-hidden="true"
        className={cn(
          "relative flex h-11 w-11 flex-none items-center justify-center rounded-xl bg-gradient-to-br text-sm font-bold text-white shadow-[0_8px_20px_-6px] shadow-black/25 transition-transform duration-300 group-hover:-rotate-6 group-hover:scale-110",
          meta.tile
        )}
      >
        {monogram(name)}
      </span>
      <span className="relative flex flex-col leading-tight">
        <span className="whitespace-nowrap text-base font-semibold text-dark">{name}</span>
        <span className="text-[11px] font-medium text-muted">{meta.label}</span>
      </span>
    </li>
  );
}

function MarqueeRow({ row, reverse }) {
  return (
    <div className="group/row overflow-hidden py-1.5 [mask-image:linear-gradient(to_right,transparent,#000_10%,#000_90%,transparent)]">
      <div className={cn("flex w-max group-hover/row:[animation-play-state:paused]", reverse ? "animate-marquee-reverse" : "animate-marquee")}>
        {[0, 1].map((set) => (
          <ul key={set} aria-hidden={set === 1 ? "true" : undefined} className="flex gap-3 pr-3">
            {row.map((item) => (
              <TechCard key={item.name} {...item} />
            ))}
          </ul>
        ))}
      </div>
    </div>
  );
}

export function HiringPartners() {
  const courses = listCourses({ publishedOnly: true });
  const technologies = [...new Set(courses.flatMap((course) => course.technologies))];
  const items = technologies.map((name) => ({ name, category: CATEGORY_OF[name] ?? "other" }));
  const usedCategories = Object.keys(CATEGORIES).filter((key) => items.some((item) => item.category === key));
  const rows = Array.from({ length: ROWS }, (_, row) => items.filter((_, index) => index % ROWS === row));
  return (
    <Section className="relative overflow-clip bg-gradient-to-b from-white via-blue-50/60 to-white" containerClassName="relative">
      <div aria-hidden="true" className="animate-drift pointer-events-none absolute -left-24 top-1/3 h-80 w-80 rounded-full bg-primary/15 blur-3xl" />
      <div aria-hidden="true" className="animate-drift-slow pointer-events-none absolute -right-24 top-10 h-80 w-80 rounded-full bg-secondary/15 blur-3xl" />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-60 [mask-image:radial-gradient(ellipse_at_center,#000_30%,transparent_75%)]"
        style={{ backgroundImage: "radial-gradient(rgb(15 23 42 / 0.07) 1px, transparent 1px)", backgroundSize: "22px 22px" }}
      />

      <Reveal className="relative mx-auto flex max-w-3xl flex-col items-center gap-4 text-center">
        <span className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-white px-3.5 py-1.5 text-xs font-semibold uppercase tracking-widest text-primary shadow-soft">
          <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-gradient-to-r from-primary to-secondary" />
          Industry Technologies
        </span>
        <h2 className="text-balance text-3xl font-bold tracking-tight text-dark sm:text-4xl lg:text-5xl">
          Skills for{" "}
          <span className="animate-gradient-x bg-gradient-to-r from-primary via-secondary to-primary bg-clip-text text-transparent">
            modern technology
          </span>{" "}
          careers
        </h2>
        <p className="max-w-2xl text-balance text-base leading-relaxed text-muted sm:text-lg">
          Tools and technologies you&apos;ll practise across our courses.
        </p>

        <div className="mt-2 flex flex-wrap items-center justify-center gap-2">
          <span className="rounded-full bg-dark px-3.5 py-1.5 text-xs font-semibold text-white shadow-card">
            {technologies.length} technologies · {courses.length} courses
          </span>
          {usedCategories.map((key) => (
            <span key={key} className="inline-flex items-center gap-1.5 rounded-full border border-border bg-white px-3 py-1.5 text-xs font-semibold text-text shadow-soft">
              <span aria-hidden="true" className={cn("h-2 w-2 rounded-full", CATEGORIES[key].dot)} />
              {CATEGORIES[key].label}
            </span>
          ))}
        </div>
      </Reveal>

      {/* Full-bleed, counter-moving rows. Hovering a row pauses it. */}
      <Reveal delay={150} className="relative left-1/2 mt-12 flex w-screen -translate-x-1/2 flex-col gap-1.5 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {rows.map((row, index) => (
          <MarqueeRow key={index} row={row} reverse={index % 2 === 1} />
        ))}
      </Reveal>
    </Section>
  );
}
