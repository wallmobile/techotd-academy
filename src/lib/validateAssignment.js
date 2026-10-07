// Client-and-server-shared validation for the assignment submission form.
// Mirrors the pattern already used by src/lib/validateAuth.js and
// src/lib/validateEnquiry.js.

export const SUBMISSION_TEXT_MAX_LENGTH = 5000;

export function validateAssignmentSubmission(values) {
  const errors = {};

  const submissionText = (values.submissionText || "").trim();
  if (!submissionText) {
    errors.submissionText = "Please enter your submission before sending.";
  } else if (submissionText.length > SUBMISSION_TEXT_MAX_LENGTH) {
    errors.submissionText = `Submission must be ${SUBMISSION_TEXT_MAX_LENGTH} characters or fewer.`;
  }

  return errors;
}
