// Client-and-server-shared validation for the trainer submission
// evaluation form. Mirrors the pattern already used elsewhere in
// src/lib/validate*.js.

export const FEEDBACK_MAX_LENGTH = 2000;
export const EVALUATION_STATUSES = ["REVIEWED", "RETURNED"];

export function validateEvaluationForm(values) {
  const errors = {};

  if (!EVALUATION_STATUSES.includes(values.status)) {
    errors.status = "Please choose Reviewed or Returned.";
  }

  const score = (values.score || "").trim();
  if (score) {
    const num = Number(score);
    if (!Number.isInteger(num) || num < 0 || num > 100) {
      errors.score = "Score must be a whole number between 0 and 100.";
    }
  }

  const feedback = (values.feedback || "").trim();
  if (feedback.length > FEEDBACK_MAX_LENGTH) {
    errors.feedback = `Feedback should be ${FEEDBACK_MAX_LENGTH} characters or fewer.`;
  }

  return errors;
}
