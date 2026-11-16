import { notFound } from "next/navigation";
import { getCourse, getRelatedCourses } from "@/lib/catalog";
import { CourseDetailHero } from "@/components/courses/CourseDetailHero";
import { CourseSubNav } from "@/components/courses/CourseSubNav";
import { CourseOverview } from "@/components/courses/CourseOverview";
import { CourseFit } from "@/components/courses/CourseFit";
import { HowYouLearn } from "@/components/courses/HowYouLearn";
import { LearningOutcomes } from "@/components/courses/LearningOutcomes";
import { TechnologyStack } from "@/components/courses/TechnologyStack";
import { CurriculumAccordion } from "@/components/courses/CurriculumAccordion";
import { CourseProjects } from "@/components/courses/CourseProjects";
import { LearningModes } from "@/components/courses/LearningModes";
import { CourseCertification } from "@/components/courses/CourseCertification";
import { CareerSupport } from "@/components/courses/CareerSupport";
import { CourseFAQ } from "@/components/courses/CourseFAQ";
import { RelatedCourses } from "@/components/courses/RelatedCourses";
import { CourseCTA } from "@/components/courses/CourseCTA";
import { JsonLd } from "@/components/seo/JsonLd";
import {
  breadcrumbSchema,
  courseMetaDescription,
  courseSchema,
  courseSeoTitle,
  faqSchema,
  pageMetadata,
  webPageSchema,
} from "@/lib/seo";

const SUBNAV_ITEMS = [
  { id: "overview", label: "Overview" },
  { id: "fit", label: "Is it for you?" },
  { id: "outcomes", label: "Outcomes" },
  { id: "tech", label: "Tech Stack" },
  { id: "curriculum", label: "Curriculum" },
  { id: "how", label: "How you learn" },
  { id: "projects", label: "Projects" },
  { id: "faq", label: "FAQ" },
];

export async function generateMetadata({ params }) {
  const { "course-slug": slug } = await params;
  // Unpublished courses are not exposed on public routes.
  const course = await getCourse(slug, { publishedOnly: true });

  if (!course) {
    return { title: "Course Not Found" };
  }

  // The root layout's title template appends " | TechOTD Academy" —
  // keep this plain so it doesn't get duplicated.
  return pageMetadata({
    title: courseSeoTitle(course),
    description: courseMetaDescription(course),
    path: `/courses/${course.slug}`,
  });
}

export default async function CourseDetailPage({ params }) {
  const { "course-slug": slug } = await params;
  const course = await getCourse(slug, { publishedOnly: true });

  if (!course) {
    notFound();
  }

  const related = await getRelatedCourses(course);

  const path = `/courses/${course.slug}`;

  return (
    <>
      <JsonLd
        data={[
          webPageSchema({ name: courseSeoTitle(course), description: courseMetaDescription(course), path }),
          breadcrumbSchema([
            { name: "Home", path: "/" },
            { name: "Courses", path: "/courses" },
            { name: course.title, path },
          ]),
          courseSchema(course),
          faqSchema(course.faqs),
        ]}
      />
      <CourseDetailHero course={course} />
      <CourseSubNav items={SUBNAV_ITEMS} ctaHref={`/book-demo?course=${course.slug}&source=course-detail`} />
      <CourseOverview course={course} />
      <CourseFit course={course} />
      <LearningOutcomes course={course} />
      <TechnologyStack course={course} />
      <CurriculumAccordion course={course} />
      <HowYouLearn course={course} />
      <CourseProjects course={course} />
      <LearningModes course={course} />
      <CourseCertification course={course} />
      <CareerSupport />
      <CourseFAQ course={course} />
      <RelatedCourses courses={related} />
      <CourseCTA course={course} />
    </>
  );
}
