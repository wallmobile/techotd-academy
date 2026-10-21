// Job-fit explanation for a student (Phase 10.9). DETERMINISTIC — no AI call
// is involved, so every statement is traceable to data: the job's listed
// skills versus the technologies of courses the student has an ACTIVE or
// COMPLETED enrollment in. It is guidance only: it never changes an
// application, never ranks or rejects candidates, and never claims the
// student is (un)qualified — a skill missing from the catalog doesn't mean
// the student lacks it.

import { getJobForStudent } from "@/lib/student/jobs";
import { getAiStudent } from "@/lib/ai/guard";
import { listCourseEnrollmentsForStudent } from "@/lib/db/courseEnrollments";
import { listCourses, getCourse } from "@/lib/catalog";
import { parseSkillList, skillKey } from "@/lib/ai/skills";

export const JOB_FIT_CAVEAT =
  "This compares the job's listed skills with technologies taught in your Academy courses. It is a learning guide, not an assessment, and it does not affect your application.";

export async function getJobFit(jobId) {
  const student = await getAiStudent();
  if (!student) return null;
  // Same visibility rules as the job page itself (open job, or one the
  // student already applied to).
  const detail = await getJobForStudent(jobId);
  if (!detail) return null;

  const required = parseSkillList(detail.job.skills);
  if (required.length === 0) return { hasSkills: false, caveat: JOB_FIT_CAVEAT };

  const enrolledSlugs = (await listCourseEnrollmentsForStudent(student.profile.id))
    .filter((e) => e.status === "ACTIVE" || e.status === "COMPLETED")
    .map((e) => e.courseSlug);
  const known = new Map();
  for (const slug of enrolledSlugs) {
    const course = await getCourse(slug);
    for (const tech of course?.technologies || []) known.set(skillKey(tech), { skill: tech, course: course.title });
  }

  const matching = [];
  const missing = [];
  for (const label of required) {
    const hit = known.get(skillKey(label));
    if (hit) matching.push({ skill: label, from: hit.course });
    else missing.push(label);
  }

  // Catalog courses (not already enrolled) that teach at least one missing skill.
  const missingKeys = new Set(missing.map(skillKey));
  const suggestedCourses = (await listCourses({ publishedOnly: true }))
    .filter((c) => !enrolledSlugs.includes(c.slug))
    .map((c) => ({
      slug: c.slug,
      title: c.title,
      covers: (c.technologies || []).filter((t) => missingKeys.has(skillKey(t))),
    }))
    .filter((c) => c.covers.length > 0)
    .sort((a, b) => b.covers.length - a.covers.length || a.slug.localeCompare(b.slug))
    .slice(0, 3);

  return { hasSkills: true, matching, missing, suggestedCourses, caveat: JOB_FIT_CAVEAT };
}
