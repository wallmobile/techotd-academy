import { EnquiryForm } from "@/components/enquiry/EnquiryForm";
import { EnquiryShell } from "@/components/enquiry/EnquiryShell";
import { getCourse, listCourses, listBatches } from "@/lib/catalog";
import { getTrainingModeBySlug } from "@/data/trainingModes";
import { KNOWN_SOURCES } from "@/lib/enquiry";
import { JsonLd } from "@/components/seo/JsonLd";
import { breadcrumbSchema, pageMetadata, webPageSchema } from "@/lib/seo";

const TITLE = "Course Enquiry";
const DESCRIPTION =
  "Send an enquiry about TechOTD Academy courses, training modes or batches in Noida and our team will get back to you.";

// The canonical stays "/enquiry" for every ?course= / ?mode= / ?source= variant.
export const metadata = pageMetadata({ title: TITLE, description: DESCRIPTION, path: "/enquiry" });

async function readParams(searchParams) {
  const courseParam = typeof searchParams.course === "string" ? searchParams.course : "";
  const modeParam = typeof searchParams.mode === "string" ? searchParams.mode : "";
  const sourceParam = typeof searchParams.source === "string" ? searchParams.source : "";

  const course = await getCourse(courseParam, { publishedOnly: true }) ? courseParam : "";
  const mode = getTrainingModeBySlug(modeParam) ? modeParam : "";
  const source = KNOWN_SOURCES.includes(sourceParam) ? sourceParam : "direct";

  return { course, mode, source };
}

export default async function EnquiryPage({ searchParams }) {
  const resolvedSearchParams = await searchParams;
  const { course, mode, source } = await readParams(resolvedSearchParams);

  return (
    <>
      <JsonLd
        data={[
          webPageSchema({ type: "ContactPage", name: TITLE, description: DESCRIPTION, path: "/enquiry" }),
          breadcrumbSchema([
            { name: "Home", path: "/" },
            { name: "Enquiry", path: "/enquiry" },
          ]),
        ]}
      />
      <EnquiryShell variant="enquiry">
        <EnquiryForm
          variant="enquiry"
          initialCourse={course}
          initialMode={mode}
          source={source}
          courses={(await listCourses({ publishedOnly: true })).map((c) => ({ slug: c.slug, title: c.title }))}
          batches={await listBatches({ publicOnly: true })}
        />
      </EnquiryShell>
    </>
  );
}
