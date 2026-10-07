"use server";

// Server Action for trainer submission evaluation (Phase 9.2). Delegates
// ownership checking to evaluateManagedSubmission() in
// src/lib/trainer/submissions.js — this file only handles form
// parsing/validation.

import { revalidatePath } from "next/cache";
import { evaluateManagedSubmission } from "@/lib/trainer/submissions";
import { validateEvaluationForm } from "@/lib/validateEvaluation";

export async function evaluateSubmissionAction(_prevState, formData) {
  const submissionId = formData.get("submissionId");
  const values = {
    status: formData.get("status") ?? "",
    score: formData.get("score") ?? "",
    feedback: formData.get("feedback") ?? "",
  };

  const errors = validateEvaluationForm(values);
  if (Object.keys(errors).length > 0) {
    return { status: "error", errors, submissionId };
  }

  const result = await evaluateManagedSubmission(submissionId, {
    status: values.status,
    score: values.score.trim() ? Number(values.score.trim()) : null,
    feedback: values.feedback.trim(),
  });

  if (!result.ok) {
    return { status: "error", errors: {}, formError: "You don't have access to this submission.", submissionId };
  }

  // The student's own assignment detail page reads this same
  // assignment_submissions row for its "Trainer Feedback" section (spec
  // Step 16) — revalidate both sides so the evaluation shows up without
  // a stale cached render.
  revalidatePath(`/trainer/assignments/${result.submission.assignmentId}`);
  revalidatePath(`/student/assignments/${result.submission.assignmentId}`);

  return { status: "success", message: "Evaluation saved.", submissionId };
}
