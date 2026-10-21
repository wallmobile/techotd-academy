"use server";

// Server Action for assignment submission (Phase 8.6). Dispatched from
// AssignmentSubmissionForm the same way every other mutation in this app
// is — through Next.js's protected Server Action mechanism, never a
// hand-rolled API route.
//
// Re-derives "who" from the session and re-validates "what" (enrollment +
// assignment state) on every call — never trusts a studentId or an
// assignment's visibility/openness as given by the client.

import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/auth/currentUser";
import { getOrCreateStudentProfile } from "@/lib/db/studentProfiles";
import { listCourseEnrollmentsForStudent } from "@/lib/db/courseEnrollments";
import { listBatchEnrollmentsForStudent } from "@/lib/db/batchEnrollments";
import { getVisibleAssignmentById } from "@/lib/db/assignments";
import { upsertSubmission, getSubmissionForStudentAssignment } from "@/lib/db/assignmentSubmissions";
import { validateAssignmentSubmission } from "@/lib/validateAssignment";

// Mirrors src/lib/student/assignments.js#isAssignmentVisibleTo — kept as
// a small local check here (rather than importing a client-facing
// helper) so this file's authorization logic is fully self-contained and
// auditable on its own.
function isEnrolledForAssignment(assignment, courseSlugs, batchIds) {
  if (!courseSlugs.has(assignment.courseSlug)) return false;
  if (assignment.batchId && !batchIds.has(assignment.batchId)) return false;
  return true;
}

export async function submitAssignmentAction(_prevState, formData) {
  const assignmentId = formData.get("assignmentId") || "";
  const submissionText = formData.get("submissionText") || "";

  // 1. Authenticated STUDENT — getCurrentUser() reads the session cookie;
  //    nothing here accepts a userId/studentId from the form.
  const user = await getCurrentUser();
  if (!user || user.role !== "STUDENT") {
    return {
      status: "error",
      errors: {},
      formError: "You need to be signed in as a student to submit this assignment.",
      values: { submissionText },
    };
  }

  // 2. The assignment must be real and in a student-visible status
  //    (never DRAFT) — same check the detail page uses, re-run here
  //    rather than trusted from a hidden field.
  const assignment = await getVisibleAssignmentById(assignmentId);
  if (!assignment) {
    return {
      status: "error",
      errors: {},
      formError: "This assignment could not be found.",
      values: { submissionText },
    };
  }

  // 3. Enrollment: this student must be enrolled in the assignment's
  //    course (and, if the assignment is batch-scoped, that exact batch).
  const profile = await getOrCreateStudentProfile(user.id);
  const courseSlugs = new Set(
    (await listCourseEnrollmentsForStudent(profile.id))
      .filter((e) => e.status !== "CANCELLED")
      .map((e) => e.courseSlug)
  );
  const batchIds = new Set(
    (await listBatchEnrollmentsForStudent(profile.id))
      .filter((e) => e.status !== "CANCELLED")
      .map((e) => e.batchId)
  );
  if (!isEnrolledForAssignment(assignment, courseSlugs, batchIds)) {
    return {
      status: "error",
      errors: {},
      formError: "You're not enrolled in this assignment's course.",
      values: { submissionText },
    };
  }

  // 4. Explicit business rule (spec section 7): resubmission is allowed
  //    up until the assignment is closed; a CLOSED assignment never
  //    accepts a new or revised submission.
  if (assignment.status === "CLOSED") {
    return {
      status: "error",
      errors: {},
      formError: "This assignment is closed for submissions.",
      values: { submissionText },
    };
  }

  const errors = validateAssignmentSubmission({ submissionText });
  if (Object.keys(errors).length > 0) {
    return { status: "error", errors, values: { submissionText } };
  }

  await upsertSubmission({
    assignmentId: assignment.id,
    studentId: profile.id,
    submissionText: submissionText.trim(),
  });

  const submission = await getSubmissionForStudentAssignment(profile.id, assignment.id);

  // The submission-status/feedback cards on the assignment detail page are
  // server-rendered from initial page props, not from this action's return
  // value — without this, a resubmission shows the success banner but
  // leaves those cards showing the pre-submission state until a manual
  // reload.
  revalidatePath(`/student/assignments/${assignment.id}`);
  revalidatePath("/student/assignments");

  return { status: "success", submission };
}
