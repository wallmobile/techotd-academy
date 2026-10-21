import Link from "next/link";
import { Section } from "@/components/shared/Section";
import { categories } from "@/data/categories";
import { listCourses } from "@/lib/catalog";
import { cn } from "@/lib/utils";

// Alternates the two brand accents so the grid reads as one system — never
// more than these two tones, per the "no random colors" direction.
const ACCENTS = [
  {
    header: "from-primary/10 to-primary/25",
    tile: "bg-primary",
    strip: "bg-primary/5 text-primary group-hover:bg-primary group-hover:text-white",
  },
  {
    header: "from-secondary/10 to-secondary/25",
    tile: "bg-secondary",
    strip: "bg-secondary/5 text-secondary group-hover:bg-secondary group-hover:text-white",
  },
];

const MAX_TECH = 4;

// Course count and technologies are derived from the course catalog, so the
// card never claims more than the data supports.
async function getItems() {
  const courses = await listCourses({ publishedOnly: true });
  return categories.map((category) => {
    const inCategory = courses.filter((course) => course.categorySlug === category.slug);
    const technologies = [...new Set(inCategory.flatMap((course) => course.technologies))];
    return { ...category, courseCount: inCategory.length, technologies };
  });
}

export async function LearningCategories() {
  const items = await getItems();
  return (
    <Section>
      <div className="mx-auto mb-10 flex max-w-2xl flex-col items-center gap-3 text-center">
        <p className="border-b-2 border-primary pb-1 text-sm font-semibold uppercase tracking-wide text-dark">
          Learning Paths
        </p>
        <h2 className="text-3xl font-semibold tracking-tight text-dark sm:text-4xl">
          What do you want to <span className="text-primary">learn?</span>
        </h2>
        <p className="text-base leading-relaxed text-muted sm:text-lg">
          Choose a learning path designed around the skills you want to build next.
        </p>
      </div>

      <ul className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {items.map((category, index) => {
          const accent = ACCENTS[index % ACCENTS.length];
          const extra = Math.max(category.technologies.length - MAX_TECH, 0);
          return (
            <li key={category.slug} className="flex">
              <Link
                href={category.href}
                className="group flex w-full flex-col overflow-hidden rounded-md border border-border bg-white shadow-card transition-all duration-200 hover:-translate-y-1 hover:shadow-elevated"
              >
                <div className={cn("bg-gradient-to-br p-4", accent.header)}>
                  <div className="flex items-start justify-between gap-3">
                    <span
                      aria-hidden="true"
                      className={cn(
                        "flex h-11 w-11 items-center justify-center rounded-sm text-sm font-bold text-white",
                        accent.tile
                      )}
                    >
                      {category.code}
                    </span>
                    <span className="rounded-full bg-white px-2.5 py-1 text-xs font-medium text-dark shadow-soft">
                      {category.courseCount > 0
                        ? `${category.courseCount} ${category.courseCount === 1 ? "course" : "courses"}`
                        : "Coming soon"}
                    </span>
                  </div>
                  <h3 className="mt-4 text-base font-semibold text-dark">{category.title}</h3>
                </div>

                <div className="flex flex-1 flex-col p-4">
                  <p className="text-sm text-muted">{category.description}</p>
                  <div className="mt-4 flex min-h-[3.5rem] flex-wrap content-start gap-1.5">
                    {category.technologies.slice(0, MAX_TECH).map((tech) => (
                      <span
                        key={tech}
                        className="rounded-sm border border-border bg-surface px-2 py-1 text-[11px] text-text"
                      >
                        {tech}
                      </span>
                    ))}
                    {extra > 0 && (
                      <span className="px-2 py-1 text-[11px] text-muted">+{extra} more</span>
                    )}
                  </div>
                </div>

                <span
                  className={cn(
                    "flex items-center justify-center gap-1.5 py-2.5 text-sm font-semibold transition-colors duration-200",
                    accent.strip
                  )}
                >
                  Explore path
                  <span aria-hidden="true" className="transition-transform duration-200 group-hover:translate-x-1">
                    →
                  </span>
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </Section>
  );
}
