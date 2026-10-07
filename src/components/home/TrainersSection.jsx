import { Section } from "@/components/shared/Section";
import { MentorPanels } from "@/components/home/MentorPanels";
import { trainers } from "@/data/trainers";

// Names, taglines and avatars come from data/trainers.js and are sample
// placeholders, not real people — replace with verified profiles and photos
// before launch.
export function TrainersSection() {
  return (
    <Section tone="surface" className="relative overflow-clip">
      <div aria-hidden="true" className="animate-drift pointer-events-none absolute -left-24 top-10 h-72 w-72 rounded-full bg-primary/10 blur-3xl" />
      <div aria-hidden="true" className="animate-drift-slow pointer-events-none absolute -right-24 bottom-0 h-72 w-72 rounded-full bg-secondary/10 blur-3xl" />

      <div className="relative mx-auto flex max-w-3xl flex-col items-center gap-4 text-center">
        <span className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-white px-3.5 py-1.5 text-xs font-semibold uppercase tracking-widest text-primary shadow-soft">
          <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-gradient-to-r from-primary to-secondary" />
          Mentors
        </span>
        <h2 className="text-balance text-3xl font-bold tracking-tight text-dark sm:text-4xl lg:text-5xl">
          Learn from people who{" "}
          <span className="bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">build</span>, not just teach
        </h2>
        <p className="max-w-2xl text-balance text-base leading-relaxed text-muted sm:text-lg">
          Sample mentor profiles across our programs — verified trainer profiles are published at launch.
        </p>
      </div>

      <div className="relative mt-12">
        <MentorPanels mentors={trainers} />
      </div>
    </Section>
  );
}
