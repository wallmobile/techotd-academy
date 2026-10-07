import { Section } from "@/components/shared/Section";
import { Button } from "@/components/ui/Button";

export default function CourseNotFound() {
  return (
    <Section className="text-center">
      <h1 className="text-2xl font-semibold tracking-tight text-dark sm:text-3xl">
        Course Not Found
      </h1>
      <p className="mx-auto mt-3 max-w-md text-base text-muted">
        The course you&apos;re looking for doesn&apos;t exist or may have moved.
      </p>
      <div className="mt-8 flex justify-center">
        <Button href="/courses">Explore Courses</Button>
      </div>
    </Section>
  );
}
