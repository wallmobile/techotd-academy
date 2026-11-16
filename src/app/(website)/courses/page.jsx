import { CourseExplorer } from "@/components/courses/CourseExplorer";
import { JsonLd } from "@/components/seo/JsonLd";
import { listCourses } from "@/lib/catalog";
import { categories } from "@/data/categories";
import { breadcrumbSchema, itemListSchema, pageMetadata, webPageSchema } from "@/lib/seo";

const TITLE = "IT Training Courses in Noida";
const DESCRIPTION =
  "Explore TechOTD Academy's IT courses in Noida: full stack, MERN, React, Next.js, Python, AI, data analytics and cloud, in live online and classroom formats.";

// The canonical stays "/courses" for every ?category= filter view.
export const metadata = pageMetadata({ title: TITLE, description: DESCRIPTION, path: "/courses" });

export default async function CoursesPage({ searchParams }) {
  const resolvedSearchParams = (await searchParams) || {};
  const initialCategory =
    typeof resolvedSearchParams.category === "string" ? resolvedSearchParams.category : undefined;
  const courses = await listCourses({ publishedOnly: true });

  return (
    <>
      <JsonLd
        data={[
          webPageSchema({ type: "CollectionPage", name: TITLE, description: DESCRIPTION, path: "/courses" }),
          breadcrumbSchema([
            { name: "Home", path: "/" },
            { name: "Courses", path: "/courses" },
          ]),
          itemListSchema(courses.map((course) => ({ name: course.title, path: `/courses/${course.slug}` }))),
        ]}
      />
      <CourseExplorer courses={courses} categories={categories} initialCategory={initialCategory} />
    </>
  );
}
