import { BatchCard } from "@/components/batches/BatchCard";
import { BatchEmptyState } from "@/components/batches/BatchEmptyState";

export function BatchGrid({ batches, spotlightFirst = false }) {
  if (batches.length === 0) return <BatchEmptyState />;

  return (
    <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
      {batches.map((batch, index) => (
        <BatchCard
          key={batch.id}
          batch={batch}
          delay={Math.min(index, 8) * 70}
          spotlight={spotlightFirst && index === 0}
        />
      ))}
    </div>
  );
}
