import { BatchExplorer } from "@/components/batches/BatchExplorer";
import { JsonLd } from "@/components/seo/JsonLd";
import { listBatches, listCourses } from "@/lib/catalog";
import { breadcrumbSchema, pageMetadata, webPageSchema } from "@/lib/seo";

const TITLE = "Upcoming Batches";
const DESCRIPTION =
  "Browse upcoming TechOTD Academy batches for live online, classroom and hybrid courses in Noida. Start dates and fees are confirmed by our team.";

export const metadata = pageMetadata({ title: TITLE, description: DESCRIPTION, path: "/batches" });

export default async function BatchesPage() {
  return (
    <>
      <JsonLd
        data={[
          webPageSchema({ type: "CollectionPage", name: TITLE, description: DESCRIPTION, path: "/batches" }),
          breadcrumbSchema([
            { name: "Home", path: "/" },
            { name: "Upcoming Batches", path: "/batches" },
          ]),
        ]}
      />
      <BatchExplorer batches={await listBatches({ publicOnly: true })} courses={(await listCourses({ publishedOnly: true })).map((c) => ({ slug: c.slug, title: c.title, category: c.category, levelLabel: c.levelLabel, duration: c.duration }))} />
    </>
  );
}
