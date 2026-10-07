import { Container } from "@/components/layout/Container";
import { ArrowLink } from "@/components/shared/ArrowLink";
import { CourseCard } from "@/components/courses/CourseCard";
import { Gradient } from "@/components/training/icons";

export function RelatedCourses({ courses }) {
  if (courses.length === 0) return null;

  return (
    <section className="bg-surface py-12 sm:py-14 lg:py-20">
      <Container>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="max-w-2xl">
            <p className="text-sm font-semibold uppercase tracking-wide text-primary">Keep Exploring</p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight text-dark sm:text-4xl">
              You may <Gradient>also like</Gradient>
            </h2>
          </div>
          <ArrowLink href="/courses">View all courses</ArrowLink>
        </div>
        <div className="mt-10 grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
          {courses.map((course, index) => (
            <CourseCard key={course.slug} course={course} delay={index * 80} />
          ))}
        </div>
      </Container>
    </section>
  );
}
