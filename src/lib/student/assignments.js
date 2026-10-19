// Assignment + project server functions (Phase 8.6). Same pattern as
// src/lib/student/courses.js and batches.js: UI calls these, never
// src/lib/db/* directly, and the student identity always comes from
// getCurrentUser() — there is no studentId parameter anywhere in this
// file for that reason.

import { getCurrentUser } from "@/lib/auth/currentUser";
import { getOrCreateStudentProfile } from "@/lib/db/studentProfiles";
import { listCourseEnrollmentsForStudent } from "@/lib/db/courseEnrollments";
import { listBatchEnrollmentsForStudent } from "@/lib/db/batchEnrollments";
import { listVisibleAssignmentsForCourseSlugs, getVisibleAssignmentById } from "@/lib/db/assignments";
import { getSubmissionForStudentAssignment } from "@/lib/db/assignmentSubmissions";
import { getCourse } from "@/lib/catalog";
import { getCourseCurriculum } from "@/lib/student/curriculum";

async function getEnrollmentContext() {
  const user = await getCurrentUser();
  if (!user || user.role !== "STUDENT") return null;

  const profile = getOrCreateStudentProfile(user.id);
  const courseEnrollments = listCourseEnrollmentsForStudent(profile.id).filter(
    (e) => e.status !== "CANCELLED"
  );
  const batchEnrollments = listBatchEnrollmentsForStudent(profile.id).filter(
    (e) => e.status !== "CANCELLED"
  );

  return {
    user,
    profile,
    courseSlugs: new Set(courseEnrollments.map((e) => e.courseSlug)),
    batchIds: new Set(batchEnrollments.map((e) => e.batchId)),
  };
}

// An assignment is visible to a student only if they're enrolled in its
// course, AND — when the assignment is scoped to a specific batch
// (batchId is not null) — they're also enrolled in that exact batch.
// A course-wide assignment (batchId null) is visible to every enrolled
// student regardless of which batch they're in.
function isAssignmentVisibleTo(assignment, ctx) {
  if (!ctx.courseSlugs.has(assignment.courseSlug)) return false;
  if (assignment.batchId && !ctx.batchIds.has(assignment.batchId)) return false;
  return true;
}

// "My Assignments" — every PUBLISHED/CLOSED assignment for a course this
// student is enrolled in (respecting the batch scoping above), enriched
// with the real course and this student's own submission (if any). No
// fake assignments — an empty result is a real empty state, not padded.
export async function getMyAssignments() {
  const ctx = await getEnrollmentContext();
  if (!ctx) return [];

  const assignments = listVisibleAssignmentsForCourseSlugs([...ctx.courseSlugs]).filter((a) =>
    isAssignmentVisibleTo(a, ctx)
  );

  return assignments.map((assignment) => ({
    ...assignment,
    course: getCourse(assignment.courseSlug),
    submission: getSubmissionForStudentAssignment(ctx.profile.id, assignment.id),
  }));
}

// Assignment detail for /student/assignments/[assignment-id]. Returns
// null whenever this student shouldn't see it for ANY reason (doesn't
// exist, still DRAFT, wrong course, wrong batch) — the caller always
// responds with the same notFound(), so a student can't distinguish "this
// id doesn't exist" from "this exists but isn't yours" by probing ids.
export async function getAssignmentDetailForStudent(assignmentId) {
  const ctx = await getEnrollmentContext();
  if (!ctx) return null;

  const assignment = getVisibleAssignmentById(assignmentId);
  if (!assignment) return null;
  if (!isAssignmentVisibleTo(assignment, ctx)) return null;

  const course = getCourse(assignment.courseSlug);
  if (!course) return null;

  const submission = getSubmissionForStudentAssignment(ctx.profile.id, assignment.id);

  return { assignment, course, submission };
}

// "Projects" (spec section 8): reuses the existing course.modules
// curriculum data (src/lib/student/curriculum.js) — project items are
// never duplicated into their own table. Purely informational at this
// stage: a curriculum "project" item only becomes a real, submittable
// Assignment once a future authoring phase creates one for it (spec:
// "A project can later become an Assignment-like submission").
export async function getMyCourseProjects() {
  const ctx = await getEnrollmentContext();
  if (!ctx) return [];

  const projects = [];
  for (const courseSlug of ctx.courseSlugs) {
    const course = getCourse(courseSlug);
    if (!course) continue;
    const curriculum = getCourseCurriculum(course);
    for (const lesson of curriculum.flatLessons) {
      if (lesson.type === "project") {
        projects.push({ course, lesson });
      }
    }
  }
  return projects;
}
