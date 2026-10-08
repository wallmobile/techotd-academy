// Client-safe enrollment constants (Phase 10.3).

// Same three values the course_enrollments / batch_enrollments tables
// already use; no new lifecycle states were added.
export const ENROLLMENT_STATUSES = ["ACTIVE", "COMPLETED", "CANCELLED"];

export const ENROLLMENT_STATUS_LABELS = {
  ACTIVE: "Active",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
};

// Batch catalog statuses (src/data/batches.js) that can take a new ACTIVE
// enrollment. The catalog currently only uses these two; any other status a
// future catalog introduces (e.g. closed/completed) is treated as not open.
export const ENROLLABLE_BATCH_STATUSES = ["Open", "Upcoming"];

export const ENROLLMENTS_PAGE_SIZE = 20;
