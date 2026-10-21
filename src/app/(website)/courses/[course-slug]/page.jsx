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

// Inside a <script> tag, a literal "<" could close the tag; JSON allows the
// escaped form, so structured data is emitted with every "<" escaped.
const JSON_LD_LT = String.fromCharCode(92) + "u003c";

export async function generateMetadata({ params }) {
  const { "course-slug": slug } = await params;
  // Unpublished courses are not exposed on public routes.
  const course = await getCourse(slug, { publishedOnly: true });

  if (!course) {
    return { title: "Course Not Found" };
  }

  // The root layout's title template appends " | TechOTD Academy" —
  // keep this plain so it doesn't get duplicated.
  const title = `${course.title} Course`;

  return {
    title,
    description: course.shortDescription,
    alternates: { canonical: `/courses/${course.slug}` },
    openGraph: {
      title,
      description: course.shortDescription,
      url: `/courses/${course.slug}`,
    },
  };
}

export default async function CourseDetailPage({ params }) {
  const { "course-slug": slug } = await params;
  const course = await getCourse(slug, { publishedOnly: true });

  if (!course) {
    notFound();
  }

  const related = await getRelatedCourses(course);

  const structuredData = {
    "@context": "https://schema.org",
    "@type": "Course",
    name: course.title,
    description: course.shortDescription,
    provider: {
      "@type": "Organization",
      name: "TechOTD Academy",
      sameAs: "https://academy.techotd.com",
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData).replace(/</g, JSON_LD_LT) }}
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
