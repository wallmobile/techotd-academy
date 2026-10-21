import { listCourses } from "@/lib/catalog";
import { trainingModes } from "@/data/trainingModes";

// Per request: the catalog is admin-editable, and unpublished courses must not be listed.
export const dynamic = "force-dynamic";

export default async function sitemap() {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://academy.techotd.com";
  const lastModified = new Date();

  const staticRoutes = ["/", "/courses", "/batches", "/trainers", "/careers", "/blog", "/about", "/book-demo", "/enquiry"];
  const courseRoutes = (await listCourses({ publishedOnly: true })).map((course) => `/courses/${course.slug}`);
  const trainingRoutes = trainingModes.map((mode) => `/training/${mode.slug}`);

  const priorityFor = (path) => {
    if (path === "/") return 1;
    if (path === "/courses") return 0.9;
    if (path.startsWith("/courses/")) return 0.8;
    return 0.6;
  };

  return [...staticRoutes, ...courseRoutes, ...trainingRoutes].map((path) => ({
    url: `${siteUrl}${path}`,
    lastModified,
    changeFrequency: "weekly",
    priority: priorityFor(path),
  }));
}
