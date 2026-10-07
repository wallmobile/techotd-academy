import { EnquiryForm } from "@/components/enquiry/EnquiryForm";
import { EnquiryShell } from "@/components/enquiry/EnquiryShell";
import { getCourseBySlug } from "@/data/courses";
import { getTrainingModeBySlug } from "@/data/trainingModes";
import { batches } from "@/data/batches";
import { KNOWN_SOURCES } from "@/lib/enquiry";

export const metadata = {
  title: "Book a Free Counselling Session",
  description:
    "Book a free counselling session to discuss course options, learning modes and batch availability with the TechOTD Academy team.",
  alternates: { canonical: "/book-demo" },
  openGraph: {
    title: "Book a Free Counselling Session",
    description:
      "Book a free counselling session to discuss course options, learning modes and batch availability with the TechOTD Academy team.",
    url: "/book-demo",
  },
};

// Query params are visitor-controlled input — every value is validated
// against real data before it's trusted, and anything invalid is
// silently dropped rather than shown or crashing the page.
function readParams(searchParams) {
  const courseParam = typeof searchParams.course === "string" ? searchParams.course : "";
  const modeParam = typeof searchParams.mode === "string" ? searchParams.mode : "";
  const batchParam = typeof searchParams.batch === "string" ? searchParams.batch : "";
  const sourceParam = typeof searchParams.source === "string" ? searchParams.source : "";

  const course = getCourseBySlug(courseParam) ? courseParam : "";
  const mode = getTrainingModeBySlug(modeParam) ? modeParam : "";
  const batchMatch = batches.find(
    (batch) => batch.id === batchParam && (!course || batch.courseSlug === course)
  );
  const batch = batchMatch ? batchMatch.id : "";
  const source = KNOWN_SOURCES.includes(sourceParam) ? sourceParam : "direct";

  return { course, mode, batch, source };
}

export default async function BookDemoPage({ searchParams }) {
  const resolvedSearchParams = await searchParams;
  const { course, mode, batch, source } = readParams(resolvedSearchParams);

  return (
    <EnquiryShell variant="book-demo">
      <EnquiryForm
        variant="book-demo"
        initialCourse={course}
        initialMode={mode}
        initialBatch={batch}
        source={source}
      />
    </EnquiryShell>
  );
}
