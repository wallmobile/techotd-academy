// Client-and-server-shared validation for the trainer assignment
// create/edit form. Mirrors the pattern already used by
// src/lib/validateClassSession.js / validateAssignment.js.

import { ASSIGNMENT_STATUSES } from "@/constants/lmsStatuses";

const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

export const TITLE_MAX_LENGTH = 150;
export const DESCRIPTION_MAX_LENGTH = 3000;

export function validateTrainerAssignmentForm(values) {
  const errors = {};

  const title = (values.title || "").trim();
  if (!title) errors.title = "Please enter an assignment title.";
  else if (title.length > TITLE_MAX_LENGTH) {
    errors.title = `Title should be ${TITLE_MAX_LENGTH} characters or fewer.`;
  }

  if (!values.courseSlug) errors.courseSlug = "Please select a course.";

  const description = (values.description || "").trim();
  if (description.length > DESCRIPTION_MAX_LENGTH) {
    errors.description = `Description should be ${DESCRIPTION_MAX_LENGTH} characters or fewer.`;
  }

  const dueAt = (values.dueAt || "").trim();
  if (dueAt && !DATE_REGEX.test(dueAt)) {
    errors.dueAt = "Please enter a valid due date.";
  }

  if (values.status && !ASSIGNMENT_STATUSES.includes(values.status)) {
    errors.status = "Please choose a valid status.";
  }

  return errors;
}
