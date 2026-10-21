import { CourseExplorer } from "@/components/courses/CourseExplorer";
import { listCourses } from "@/lib/catalog";
import { categories } from "@/data/categories";

export const metadata = {
  title: "Explore Courses",
  description:
    "Build practical technology skills through structured, mentor-led learning paths designed for real-world development.",
};

export default async function CoursesPage({ searchParams }) {
  const resolvedSearchParams = (await searchParams) || {};
  const initialCategory =
    typeof resolvedSearchParams.category === "string" ? resolvedSearchParams.category : undefined;

  return (
    <CourseExplorer courses={await listCourses({ publishedOnly: true })} categories={categories} initialCategory={initialCategory} />
  );
}
