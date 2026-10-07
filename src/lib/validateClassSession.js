// Client-and-server-shared validation for the trainer class-session
// create/edit form. Mirrors the pattern already used by
// src/lib/validateAssignment.js / validateProfile.js.

import { CLASS_SESSION_STATUSES } from "@/constants/lmsStatuses";

const TIME_REGEX = /^([01]\d|2[0-3]):[0-5]\d$/;
const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;
const URL_REGEX = /^https?:\/\/\S+$/i;

export const TITLE_MAX_LENGTH = 150;

// `requireBatch` is false when editing an existing session — the edit
// form shows the batch as a read-only label rather than a <select> (a
// session's batch doesn't move once scheduled), so there is no batchId
// field to validate there at all; only the create form collects one.
export function validateClassSessionForm(values, { requireBatch = true } = {}) {
  const errors = {};

  const title = (values.title || "").trim();
  if (!title) errors.title = "Please enter a class title.";
  else if (title.length > TITLE_MAX_LENGTH) {
    errors.title = `Title should be ${TITLE_MAX_LENGTH} characters or fewer.`;
  }

  if (requireBatch && !values.batchId) errors.batchId = "Please select a batch.";

  const sessionDate = (values.sessionDate || "").trim();
  if (!sessionDate) errors.sessionDate = "Please choose a date.";
  else if (!DATE_REGEX.test(sessionDate)) errors.sessionDate = "Please enter a valid date.";

  const startTime = (values.startTime || "").trim();
  const endTime = (values.endTime || "").trim();
  if (!startTime) errors.startTime = "Please enter a start time.";
  else if (!TIME_REGEX.test(startTime)) errors.startTime = "Please enter a valid time (HH:MM).";

  if (!endTime) errors.endTime = "Please enter an end time.";
  else if (!TIME_REGEX.test(endTime)) errors.endTime = "Please enter a valid time (HH:MM).";

  if (startTime && endTime && TIME_REGEX.test(startTime) && TIME_REGEX.test(endTime) && endTime <= startTime) {
    errors.endTime = "End time must be after the start time.";
  }

  const meetingUrl = (values.meetingUrl || "").trim();
  if (meetingUrl && !URL_REGEX.test(meetingUrl)) {
    errors.meetingUrl = "Please enter a valid URL starting with http:// or https://.";
  }

  if (values.status && !CLASS_SESSION_STATUSES.includes(values.status)) {
    errors.status = "Please choose a valid status.";
  }

  return errors;
}
