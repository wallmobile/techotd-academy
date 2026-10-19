import { EnquiryForm } from "@/components/enquiry/EnquiryForm";
import { EnquiryShell } from "@/components/enquiry/EnquiryShell";
import { getCourse, listCourses, listBatches } from "@/lib/catalog";
import { getTrainingModeBySlug } from "@/data/trainingModes";
import { KNOWN_SOURCES } from "@/lib/enquiry";

export const metadata = {
  title: "Enquiry",
  description:
    "Send an enquiry about TechOTD Academy courses, training modes or batches and our team will get back to you.",
  alternates: { canonical: "/enquiry" },
  openGraph: {
    title: "Enquiry",
    description:
      "Send an enquiry about TechOTD Academy courses, training modes or batches and our team will get back to you.",
    url: "/enquiry",
  },
};

function readParams(searchParams) {
  const courseParam = typeof searchParams.course === "string" ? searchParams.course : "";
  const modeParam = typeof searchParams.mode === "string" ? searchParams.mode : "";
  const sourceParam = typeof searchParams.source === "string" ? searchParams.source : "";

  const course = getCourse(courseParam, { publishedOnly: true }) ? courseParam : "";
  const mode = getTrainingModeBySlug(modeParam) ? modeParam : "";
  const source = KNOWN_SOURCES.includes(sourceParam) ? sourceParam : "direct";

  return { course, mode, source };
}

export default async function EnquiryPage({ searchParams }) {
  const resolvedSearchParams = await searchParams;
  const { course, mode, source } = readParams(resolvedSearchParams);

  return (
    <EnquiryShell variant="enquiry">
      <EnquiryForm
        variant="enquiry"
        initialCourse={course}
        initialMode={mode}
        source={source}
        courses={listCourses({ publishedOnly: true }).map((c) => ({ slug: c.slug, title: c.title }))}
        batches={listBatches({ publicOnly: true })}
      />
    </EnquiryShell>
  );
}
