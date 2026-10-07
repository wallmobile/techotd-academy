import { CourseCard } from "@/components/courses/CourseCard";

export function CourseGrid({ courses, spotlightFirst = false }) {
  if (courses.length === 0) {
    return (
      <div className="animate-fade-up-in flex flex-col items-center gap-2 rounded-3xl border border-dashed border-border bg-white/70 py-20 text-center">
        <p className="text-lg font-semibold text-dark">No courses match that.</p>
        <p className="text-sm text-muted">Try another keyword or reset your filters.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
      {courses.map((course, index) => (
        <CourseCard
          key={course.slug}
          course={course}
          delay={Math.min(index, 8) * 70}
          spotlight={spotlightFirst && index === 0}
        />
      ))}
    </div>
  );
}
