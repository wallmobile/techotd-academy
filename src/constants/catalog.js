// Client-safe constants for the admin-managed course / batch catalog (Phase 10.11).

export const COURSE_STATUSES = ["PUBLISHED", "UNPUBLISHED"];
export const COURSE_STATUS_LABELS = { PUBLISHED: "Published", UNPUBLISHED: "Unpublished" };

// Batch lifecycle. Only Open and Upcoming batches are shown publicly and can
// take new enrollments (see ENROLLABLE_BATCH_STATUSES). Closed / Completed /
// Archived keep every enrollment, attendance and fee record intact.
export const BATCH_STATUSES = ["Open", "Upcoming", "Closed", "Completed", "Archived"];
export const PUBLIC_BATCH_STATUSES = ["Open", "Upcoming"];
export const BATCH_MODES = ["Live Online", "Classroom", "Hybrid"];

export const COURSE_LIMITS = {
  title: 100,
  shortDescription: 200,
  description: 2000,
  duration: 60,
  listItem: 120,
  listItems: 20,
};
export const BATCH_LIMITS = { schedule: 80, location: 120 };

export const CATALOG_PAGE_SIZE = 20;

export const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
