import { EnquiryForm } from "@/components/enquiry/EnquiryForm";
import { EnquiryShell } from "@/components/enquiry/EnquiryShell";
import { getCourse, listCourses, listBatches } from "@/lib/catalog";
import { getTrainingModeBySlug } from "@/data/trainingModes";
import { KNOWN_SOURCES } from "@/lib/enquiry";
import { JsonLd } from "@/components/seo/JsonLd";
import { breadcrumbSchema, pageMetadata, webPageSchema } from "@/lib/seo";

const TITLE = "Book a Free Counselling Session";
const DESCRIPTION =
  "Book a free counselling session to discuss course options, learning modes and batch availability with the TechOTD Academy team in Noida.";

// The canonical stays "/book-demo" for every ?course= / ?mode= / ?batch= / ?source= variant.
export const metadata = pageMetadata({ title: TITLE, description: DESCRIPTION, path: "/book-demo" });

// Query params are visitor-controlled input — every value is validated
// against real data before it's trusted, and anything invalid is
// silently dropped rather than shown or crashing the page.
async function readParams(searchParams) {
  const courseParam = typeof searchParams.course === "string" ? searchParams.course : "";
  const modeParam = typeof searchParams.mode === "string" ? searchParams.mode : "";
  const batchParam = typeof searchParams.batch === "string" ? searchParams.batch : "";
  const sourceParam = typeof searchParams.source === "string" ? searchParams.source : "";

  const course = await getCourse(courseParam, { publishedOnly: true }) ? courseParam : "";
  const mode = getTrainingModeBySlug(modeParam) ? modeParam : "";
  const batchMatch = (await listBatches({ publicOnly: true })).find(
    (batch) => batch.id === batchParam && (!course || batch.courseSlug === course)
  );
  const batch = batchMatch ? batchMatch.id : "";
  const source = KNOWN_SOURCES.includes(sourceParam) ? sourceParam : "direct";

  return { course, mode, batch, source };
}

export default async function BookDemoPage({ searchParams }) {
  const resolvedSearchParams = await searchParams;
  const { course, mode, batch, source } = await readParams(resolvedSearchParams);

  return (
    <>
      <JsonLd
        data={[
          webPageSchema({ type: "ContactPage", name: TITLE, description: DESCRIPTION, path: "/book-demo" }),
          breadcrumbSchema([
            { name: "Home", path: "/" },
            { name: "Book Demo", path: "/book-demo" },
          ]),
        ]}
      />
      <EnquiryShell variant="book-demo">
        <EnquiryForm
          variant="book-demo"
          initialCourse={course}
          initialMode={mode}
          initialBatch={batch}
          source={source}
          courses={(await listCourses({ publishedOnly: true })).map((c) => ({ slug: c.slug, title: c.title }))}
          batches={await listBatches({ publicOnly: true })}
        />
      </EnquiryShell>
    </>
  );
}
