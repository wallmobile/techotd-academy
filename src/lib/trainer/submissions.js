// Trainer submissions + evaluation (Phase 9.2). Same pattern as the rest
// of the trainer domain layer. Reads/writes the SAME
// assignment_submissions table the student assignment page reads from —
// evaluating a submission here is what the student sees on their own
// assignment detail page, with no separate feedback table.

import { getAssignmentDetailForTrainer } from "@/lib/trainer/assignments";
import {
  listSubmissionsForAssignmentInBatches,
  getSubmissionById,
  evaluateSubmission,
  isSubmissionInBatches,
} from "@/lib/db/assignmentSubmissions";

// Every submission for one of the trainer's own assignments. Returns
// null identically for "assignment doesn't exist" and "isn't mine" —
// getAssignmentDetailForTrainer() already does that ownership check, so
// this function inherits it rather than re-implementing it.
export async function getSubmissionsForAssignment(assignmentId) {
  const detail = await getAssignmentDetailForTrainer(assignmentId);
  if (!detail) return null;

  // Only submissions from students in this trainer's own batches — not
  // every submission for the (possibly shared) course.
  const submissions = listSubmissionsForAssignmentInBatches(assignmentId, detail.reviewBatchIds);
  return { ...detail, submissions };
}

// Ownership-checked evaluation write. Re-verifies from the database that
// the submission's assignment really is one of this trainer's own before
// writing score/feedback/status — never trusted merely because the form
// included an assignmentId alongside the submissionId.
export async function evaluateManagedSubmission(submissionId, { status, score, feedback }) {
  const submission = getSubmissionById(submissionId);
  if (!submission) return { ok: false };

  const detail = await getAssignmentDetailForTrainer(submission.assignmentId);
  if (!detail) return { ok: false };

  // The submission's STUDENT must also be one of this trainer's own
  // (enrolled in a batch they manage) — owning the assignment alone is not
  // enough when another trainer teaches the same course.
  if (!isSubmissionInBatches(submissionId, detail.reviewBatchIds)) return { ok: false };

  const updated = evaluateSubmission(submissionId, { status, score, feedback });
  return { ok: true, submission: updated };
}
