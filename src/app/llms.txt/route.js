import { listCourses } from "@/lib/catalog";
import { contact } from "@/constants/contact";
import { SITE_DESCRIPTION, SITE_NAME } from "@/constants/seo";
import { faqs } from "@/data/faqs";
import { trainingModes } from "@/data/trainingModes";
import { absoluteUrl, joinModes } from "@/lib/seo";

// /llms.txt - a short, plain-text (markdown) summary of the site for AI assistants and
// answer engines (https://llmstxt.org). It is generated from the same data the pages
// render, so it never drifts, and the catalog is admin-editable, so it is built per request.
export const dynamic = "force-dynamic";

const oneLine = (text) => String(text ?? "").replace(/\s+/g, " ").trim();

export async function GET() {
  const courses = await listCourses({ publishedOnly: true });

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
      "Cache-Control": "public, max-age=3600",
    },
  });
}
