import { Section } from "@/components/shared/Section";
import { Reveal } from "@/components/shared/Reveal";
import { ResourceShelf } from "@/components/home/ResourceShelf";
import { isBuiltRoute } from "@/constants/navigation";
import { resources } from "@/data/resources";

// Resources whose route isn't built yet show a "Coming soon" label instead of
// a link, so the section never ships a dead end.
const items = resources.map((resource) => ({ ...resource, built: isBuiltRoute(resource.href) }));

export function LearningResources() {
  return (
    <Section tone="surface" className="relative overflow-clip bg-gradient-to-br from-blue-50 via-white to-violet-100">
      <div aria-hidden="true" className="animate-drift pointer-events-none absolute -left-24 top-10 h-80 w-80 rounded-full bg-primary/20 blur-3xl" />
      <div aria-hidden="true" className="animate-drift-slow pointer-events-none absolute -right-24 bottom-0 h-80 w-80 rounded-full bg-secondary/20 blur-3xl" />

      <Reveal className="relative mx-auto flex max-w-3xl flex-col items-center gap-4 text-center">
        <span className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-white px-3.5 py-1.5 text-xs font-semibold uppercase tracking-widest text-primary shadow-soft">
          <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-gradient-to-r from-primary to-secondary" />
          Resources
        </span>
        <h2 className="text-balance text-3xl font-bold tracking-tight text-dark sm:text-4xl lg:text-5xl">
          Learning{" "}
          <span className="animate-gradient-x bg-gradient-to-r from-primary via-secondary to-primary bg-clip-text text-transparent">
            resources
          </span>
        </h2>
        <p className="max-w-2xl text-balance text-base leading-relaxed text-muted sm:text-lg">
          Guides and articles to support your learning outside the classroom.
        </p>
      </Reveal>

      <Reveal delay={150} className="relative mt-14">
        <ResourceShelf resources={items} />
      </Reveal>
    </Section>
  );
}
