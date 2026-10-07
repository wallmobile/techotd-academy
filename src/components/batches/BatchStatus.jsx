import { Badge } from "@/components/ui/Badge";

const statusVariant = {
  Upcoming: "neutral",
  Open: "success",
  Filling: "warning",
  Closed: "neutral",
  Completed: "neutral",
};

export function BatchStatus({ status }) {
  return <Badge variant={statusVariant[status] ?? "neutral"}>{status}</Badge>;
}
