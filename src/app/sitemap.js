import { listCourses } from "@/lib/catalog";
import { listCatalogCourseRows } from "@/lib/db/catalog";
import { trainingModes } from "@/data/trainingModes";
import { absoluteUrl } from "@/lib/seo";

// Per request: the catalog is admin-editable, and unpublished courses must not be listed.
export const dynamic = "force-dynamic";

/** "2026-10-19 08:30:00" (UTC, written by app_now()) or an ISO string -> Date, or undefined. */
function parseStoredDate(value) {
  if (typeof value !== "string" || !value) return undefined;
  const iso = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(value) ? `${value.replace(" ", "T")}Z` : value;
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

export default async function sitemap() {
  const staticRoutes = ["/", "/courses", "/batches", "/trainers", "/careers", "/blog", "/about", "/book-demo", "/enquiry"];
  const courses = await listCourses({ publishedOnly: true });
  const trainingRoutes = trainingModes.map((mode) => `/training/${mode.slug}`);

  // A real <lastmod> only: the time an admin last edited the course. Search engines
  // learn to ignore a <lastmod> that changes on every request, so where the true date
  // is not known (code-defined content nobody has edited, static pages) it is omitted.
  const editedAt = new Map((await listCatalogCourseRows()).map((row) => [row.slug, parseStoredDate(row.updatedAt)]));

  const priorityFor = (path) => {
    if (path === "/") return 1;
    if (path === "/courses") return 0.9;
    if (path.startsWith("/courses/")) return 0.8;
    return 0.6;
  };

  const entry = (path, lastModified) => ({
    url: absoluteUrl(path),
    ...(lastModified ? { lastModified } : {}),
    priority: priorityFor(path),
  });

  return [
    ...staticRoutes.map((path) => entry(path)),
    ...courses.map((course) => entry(`/courses/${course.slug}`, editedAt.get(course.slug))),
    ...trainingRoutes.map((path) => entry(path)),
  ];
}
