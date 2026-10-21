import { Section } from "@/components/shared/Section";
import { PopularCoursesCarousel } from "@/components/home/PopularCoursesCarousel";
import { listCourses, listBatches } from "@/lib/catalog";

// Only fields that exist in the data are surfaced: project/module counts
// come from the course catalog and "next batch" from the sample batch list.
// No learner counts or scholarship claims are shown because no such data exists.
async function getSlides() {
  const batches = await listBatches({ publicOnly: true });
  return [...await listCourses({ publishedOnly: true })]
  .sort((a, b) => Number(b.popular) - Number(a.popular))
  .map((course) => {
    const batch = batches.find((item) => item.courseSlug === course.slug);
    return {
      slug: course.slug,
      title: course.title,
      categorySlug: course.categorySlug,
      shortDescription: course.shortDescription,
      initials: course.initials,
      duration: course.duration,
      level: course.level,
      modes: course.modes,
      technologies: course.technologies,
      popular: Boolean(course.popular),
      nextBatch: batch ? batch.startDate : null,
    };
  });
}

export async function PopularCourses() {
  const slides = await getSlides();
  return (
    <Section tone="surface" className="bg-gradient-to-b from-surface to-primary/10">
      <div className="mx-auto mb-10 flex max-w-3xl flex-col items-center gap-4 text-center">
        <span className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-white px-3.5 py-1.5 text-xs font-semibold uppercase tracking-widest text-primary shadow-soft">
          <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-gradient-to-r from-primary to-secondary" />
          Courses
        </span>
        <h2 className="text-4xl font-bold tracking-tight text-dark sm:text-5xl">
          <span className="bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">Popular</span>{" "}
          Courses
        </h2>
        <p className="max-w-3xl text-balance text-base leading-relaxed text-muted sm:text-lg">
          Practical, project-based programs in live online, classroom and hybrid formats.
        </p>
      </div>
      <PopularCoursesCarousel courses={slides} />
    </Section>
  );
}
