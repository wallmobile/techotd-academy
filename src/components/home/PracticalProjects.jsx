import { Section } from "@/components/shared/Section";
import { ProjectShowcase } from "@/components/home/ProjectShowcase";
import { projects } from "@/data/projects";
import { cn } from "@/lib/utils";

// Abstract, decorative UI wireframes — one layout per project type. These
// are illustrations of the *kind* of interface students build, not
// screenshots of real student work.
const previews = {
  "E-Commerce Platform": (
    <div className="flex h-full flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="h-2 w-16 rounded-full bg-dark/20" />
        <span className="flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[8px] font-bold text-white">2</span>
      </div>
      <div className="grid flex-1 grid-cols-3 gap-2">
        {["bg-primary/20", "bg-secondary/20", "bg-sky-200"].map((tone, i) => (
          <div key={i} className="flex flex-col rounded-md border border-border bg-white p-1.5 shadow-soft">
            <div className={cn("flex-1 rounded", tone)} />
            <div className="mt-1.5 h-1.5 w-3/4 rounded-full bg-border" />
            <div className="mt-1 h-1.5 w-1/2 rounded-full bg-primary/50" />
          </div>
        ))}
      </div>
    </div>
  ),
  "Admin Dashboard": (
    <div className="flex h-full gap-2">
      <div className="flex w-1/4 flex-col gap-1.5 rounded-md bg-dark p-2">
        <span className="h-2 w-2/3 rounded-full bg-white/60" />
        {[0, 1, 2, 3].map((i) => (
          <span key={i} className={cn("h-1.5 rounded-full", i === 1 ? "bg-primary" : "bg-white/20")} />
        ))}
      </div>
      <div className="flex flex-1 flex-col gap-2">
        <div className="grid grid-cols-3 gap-1.5">
          {[0, 1, 2].map((i) => (
            <div key={i} className="rounded-md border border-border bg-white p-1.5">
              <span className="block h-1.5 w-1/2 rounded-full bg-border" />
              <span className="mt-1 block h-2.5 w-2/3 rounded-full bg-primary/40" />
            </div>
          ))}
        </div>
        <div className="flex flex-1 flex-col gap-1 rounded-md border border-border bg-white p-1.5">
          {[0, 1, 2].map((i) => (
            <span key={i} className="h-1.5 rounded-full bg-border" />
          ))}
        </div>
      </div>
    </div>
  ),
  "AI-Powered Application": (
    <div className="flex h-full flex-col justify-between gap-1.5">
      <div className="flex items-center gap-1.5">
        <span className="flex h-4 w-4 items-center justify-center rounded-full bg-secondary text-[8px] text-white">✦</span>
        <span className="h-4 w-2/3 rounded-lg rounded-tl-none border border-border bg-white" />
      </div>
      <span className="ml-auto h-4 w-3/5 rounded-lg rounded-tr-none bg-primary/30" />
      <div className="flex items-center gap-1.5">
        <span className="flex h-4 w-4 items-center justify-center rounded-full bg-secondary text-[8px] text-white">✦</span>
        <span className="h-4 w-1/2 rounded-lg rounded-tl-none border border-border bg-white" />
      </div>
      <span className="flex h-5 items-center justify-end rounded-full border border-border bg-white px-1.5">
        <span className="h-3 w-3 rounded-full bg-primary" />
      </span>
    </div>
  ),
  "CRM Platform": (
    <div className="grid h-full grid-cols-3 gap-2">
      {[
        { label: "bg-primary/50", cards: 3 },
        { label: "bg-secondary/50", cards: 2 },
        { label: "bg-emerald-400/60", cards: 1 },
      ].map((col, i) => (
        <div key={i} className="flex flex-col gap-1.5 rounded-md bg-white/70 p-1.5">
          <span className={cn("h-1.5 w-1/2 rounded-full", col.label)} />
          {Array.from({ length: col.cards }).map((_, n) => (
            <span key={n} className="h-5 rounded border border-border bg-white shadow-soft" />
          ))}
        </div>
      ))}
    </div>
  ),
  "Analytics Dashboard": (
    <div className="flex h-full flex-col gap-2">
      <div className="flex gap-2">
        <span className="h-2 w-10 rounded-full bg-primary/50" />
        <span className="h-2 w-8 rounded-full bg-border" />
      </div>
      <div className="flex flex-1 items-end gap-1.5">
        {[40, 65, 50, 85, 60, 95, 70].map((height, i) => (
          <span
            key={i}
            style={{ height: `${height}%` }}
            className={cn("flex-1 rounded-t", i % 2 ? "bg-secondary/50" : "bg-primary/60")}
          />
        ))}
      </div>
    </div>
  ),
  "Real-Time Web Application": (
    <div className="flex h-full flex-col justify-between gap-1.5">
      {[0, 1, 2].map((i) => (
        <div key={i} className="flex items-center gap-2 rounded-md border border-border bg-white px-2 py-1.5 shadow-soft">
          <span className="relative flex h-2 w-2">
            {i === 0 && <span className="animate-ping-soft absolute inline-flex h-full w-full rounded-full bg-emerald-400" />}
            <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
          </span>
          <span className="h-1.5 flex-1 rounded-full bg-border" />
          <span className="h-1.5 w-6 rounded-full bg-primary/30" />
        </div>
      ))}
    </div>
  ),
};

export function PracticalProjects() {
  const items = projects.map((project) => ({ ...project, preview: previews[project.title] }));

  return (
    <Section tone="surface" className="relative overflow-clip bg-gradient-to-br from-blue-50 via-white to-violet-100">
      <div aria-hidden="true" className="animate-drift pointer-events-none absolute -left-24 top-10 h-80 w-80 rounded-full bg-primary/20 blur-3xl" />
      <div aria-hidden="true" className="animate-drift-slow pointer-events-none absolute -right-24 bottom-0 h-80 w-80 rounded-full bg-secondary/20 blur-3xl" />

      <div className="relative mx-auto flex max-w-3xl flex-col items-center gap-4 text-center">
        <span className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-white px-3.5 py-1.5 text-xs font-semibold uppercase tracking-widest text-primary shadow-soft">
          <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-gradient-to-r from-primary to-secondary" />
          Hands-On Learning
        </span>
        <h2 className="text-4xl font-bold tracking-tight text-dark sm:text-5xl">
          Don&rsquo;t just learn.{" "}
          <span className="bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">Build.</span>
        </h2>
        <p className="max-w-2xl text-balance text-base leading-relaxed text-muted sm:text-lg">
          Example projects showing the kind of practical, portfolio-worthy work our courses are built around.
        </p>
      </div>

      <div className="relative mt-12">
        <ProjectShowcase projects={items} />
      </div>
    </Section>
  );
}