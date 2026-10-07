import { Container } from "@/components/layout/Container";
import { ArrowLink } from "@/components/shared/ArrowLink";

export function AnnouncementBar() {
  return (
    <div className="bg-dark text-white">
      <Container className="flex flex-col items-center justify-center gap-1 py-2 text-center text-xs sm:flex-row sm:gap-3 sm:text-sm">
        <p className="text-white/85">
          New batches starting soon • Online + Classroom training available
        </p>
        <ArrowLink href="/batches" tone="light" className="shrink-0">
          Explore Batches
        </ArrowLink>
      </Container>
    </div>
  );
}
