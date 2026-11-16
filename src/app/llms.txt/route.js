import { listCourses } from "@/lib/catalog";
import { courses as codeDefinedCourses } from "@/data/courses";
import { contact } from "@/constants/contact";
import { SITE_DESCRIPTION, SITE_NAME } from "@/constants/seo";
import { faqs } from "@/data/faqs";
import { trainingModes } from "@/data/trainingModes";
import { absoluteUrl, joinModes } from "@/lib/seo";

// /llms.txt - a short, plain-text (markdown) summary of the site for AI assistants and
// answer engines (https://llmstxt.org). It is generated from the same data the pages
// render, so it never drifts, and the catalog is admin-editable, so it is built per request.
export const dynamic = "force-dynamic";

// Lighthouse's "Agentic Browsing" audit (and some AI crawlers) give up on /llms.txt after
// about 2 seconds. On a cold serverless instance the first database call alone can take
// longer, so the database gets a budget; past it the file is answered from the code-defined
// course list instead of failing, and that answer is cached only briefly.
const DB_BUDGET_MS = 1200;

// Public (CDN) caching: serve the cached copy instantly and refresh it in the background.
const CACHE_FRESH = "public, max-age=300, s-maxage=3600, stale-while-revalidate=86400";
const CACHE_FALLBACK = "public, max-age=0, s-maxage=60";

const oneLine = (text) => String(text ?? "").replace(/\s+/g, " ").trim();

async function loadCourses() {
  let timer;
  const budget = new Promise((resolve) => {
    timer = setTimeout(() => resolve(null), DB_BUDGET_MS);
  });
  try {
    const fromDatabase = await Promise.race([listCourses({ publishedOnly: true }).catch(() => null), budget]);
    return fromDatabase ? { courses: fromDatabase, complete: true } : { courses: codeDefinedCourses, complete: false };
  } finally {
    clearTimeout(timer);
  }
}

export async function GET() {
  const { courses, complete } = await loadCourses();

  const lines = [
    `# ${SITE_NAME}`,
    "",
    `> ${SITE_DESCRIPTION}`,
    "",
    "## Courses",
    ...courses.map((course) => {
      const formats = course.modes?.length ? ` Formats: ${joinModes(course.modes)}.` : "";
      return `- [${course.title}](${absoluteUrl(`/courses/${course.slug}`)}): ${oneLine(course.shortDescription)}${formats}`;
    }),
    "",
    "## Training formats",
    ...trainingModes.map(
      (mode) => `- [${mode.title}](${absoluteUrl(`/training/${mode.slug}`)}): ${oneLine(mode.shortDescription)}`
    ),
    "",
    "## Key pages",
    `- [About ${SITE_NAME}](${absoluteUrl("/about")}): who we are, how we teach and who the courses suit`,
    `- [Upcoming batches](${absoluteUrl("/batches")}): batch schedules`,
    `- [Trainers and mentors](${absoluteUrl("/trainers")}): how mentoring works`,
    `- [Career support](${absoluteUrl("/careers")}): resume, portfolio and interview guidance`,
    `- [Learning resources](${absoluteUrl("/blog")}): plain-language tech glossary, learning paths, interview checklist`,
    `- [Book a free counselling session](${absoluteUrl("/book-demo")})`,
    `- [Send an enquiry](${absoluteUrl("/enquiry")})`,
    "",
    "## Contact",
    `- Address: ${contact.address}`,
    `- Phone: ${contact.phone}`,
    `- Email: ${contact.email}`,
    "",
    "## Frequently asked questions",
    ...faqs.map((faq) => `- ${oneLine(faq.question)} ${oneLine(faq.answer)}`),
    "",
  ];

  return new Response(lines.join("\n"), {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": complete ? CACHE_FRESH : CACHE_FALLBACK,
    },
  });
}
