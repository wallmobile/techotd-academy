import { BatchExplorer } from "@/components/batches/BatchExplorer";
import { batches } from "@/data/batches";

export const metadata = {
  title: "Upcoming Batches",
  description:
    "Browse upcoming learning batches across TechOTD Academy courses and find a schedule that fits you.",
};

export default function BatchesPage() {
  return <BatchExplorer batches={batches} />;
}
