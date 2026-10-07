// Curriculum data boundary for the student learning experience (Phase 8.3).
//
// course.modules already exists as catalog data in src/data/courses.js —
// this file only *derives* a flat, navigable lesson list from it; nothing
// is duplicated into the database (per the Phase 8.3 spec, "do not
// duplicate curriculum in DB unless required" — it isn't required yet).
//
// Lesson identity: catalog items have no id of their own, so a lesson's
// id here is its position — `m{moduleIndex}-i{itemIndex}` — stable as
// long as courses.js's module/item order doesn't change. This is an
// intentional, documented limitation: if a later phase lets an
// Admin/Trainer reorder or edit curriculum, or attach real content
// (videos, resources, assignments) to a specific lesson, that phase
// should give each module item an explicit, permanent `id` field in
// courses.js and this file should key off that instead of array
// position. Keeping ids derived (rather than inventing a lesson table
// now) is what "minimum representation required" means for this phase.
//
// Progress (Phase 8.4): real per-lesson completion/last-accessed state now
// lives in the `lesson_progress` table (src/lib/db/lessonProgress.js) and
// is computed into a single { [lessonId]: "completed"|"current"|
// "not-started" } map per page load by src/lib/student/progress.js, rather
// than this file exposing a per-lesson lookup function that would get
// called once per lesson (which would mean re-querying the database for
// every single item just to render a list). This file still only knows
// about the file-based catalog; it has no idea progress persistence exists.

export function getCourseCurriculum(course) {
  const modules = (course.modules || []).map((module, moduleIndex) => {
    const lessons = (module.items || []).map((item, itemIndex) => ({
      id: `m${moduleIndex}-i${itemIndex}`,
      moduleIndex,
      itemIndex,
      moduleTitle: module.title,
      type: item.type,
      title: item.title,
    }));
    return {
      index: moduleIndex,
      title: module.title,
      duration: module.duration,
      lessons,
    };
  });

  const flatLessons = modules.flatMap((module) => module.lessons);

  return { modules, flatLessons };
}

export function getLessonById(curriculum, lessonId) {
  return curriculum.flatLessons.find((lesson) => lesson.id === lessonId) || null;
}

export function getAdjacentLessons(curriculum, lessonId) {
  const index = curriculum.flatLessons.findIndex((lesson) => lesson.id === lessonId);
  if (index === -1) return { previous: null, next: null };
  return {
    previous: curriculum.flatLessons[index - 1] || null,
    next: curriculum.flatLessons[index + 1] || null,
  };
}

// Parses the "m{moduleIndex}-i{itemIndex}" id scheme back into its parts.
// Returns null for anything that doesn't match the shape — callers must
// still confirm the parsed indexes point at a real lesson (getLessonById)
// before trusting them for anything; this only checks the *format*, not
// that a module/lesson at that position exists in this course's data.
export function parseLessonId(lessonId) {
  const match = /^m(\d+)-i(\d+)$/.exec(lessonId || "");
  if (!match) return null;
  return { moduleIndex: Number(match[1]), lessonIndex: Number(match[2]) };
}
