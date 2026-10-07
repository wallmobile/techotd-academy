import { Section } from "@/components/shared/Section";
import { SectionHeading } from "@/components/shared/SectionHeading";
import { ArrowLink } from "@/components/shared/ArrowLink";
import { CourseCard } from "@/components/courses/CourseCard";
import { Gradient } from "@/components/training/icons";
import { getCourseBySlug } from "@/data/courses";

export function RelatedTrainingCourses({ trainingMode }) {
  const courses = trainingMode.relatedCourses
    .map((slug) => getCourseBySlug(slug))
    .filter(Boolean);

  if (courses.length === 0) return null;

  return (
    <Section tone="surface">
      <SectionHeading
        eyebrow="Related Courses"
        title={<>Courses available in <Gradient>{trainingMode.shortTitle}</Gradient> format</>}
        align="left"
        action={<ArrowLink href="/courses">View all courses</ArrowLink>}
      />
      <div className="mt-10 grid grid-cols-1 gap-5 md:grid-cols-2">
        {courses.map((course, index) => (
          <CourseCard key={course.slug} course={course} delay={index * 80} />
        ))}
      </div>
    </Section>
  );
}
