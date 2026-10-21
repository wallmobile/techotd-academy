import { BatchExplorer } from "@/components/batches/BatchExplorer";
import { listBatches, listCourses } from "@/lib/catalog";

export const metadata = {
  title: "Upcoming Batches",
  description:
    "Browse upcoming learning batches across TechOTD Academy courses and find a schedule that fits you.",
};

export default async function BatchesPage() {
  return <BatchExplorer batches={await listBatches({ publicOnly: true })} courses={(await listCourses({ publishedOnly: true })).map((c) => ({ slug: c.slug, title: c.title, category: c.category, levelLabel: c.levelLabel, duration: c.duration }))} />;
}
