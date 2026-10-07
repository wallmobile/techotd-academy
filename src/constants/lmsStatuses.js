/**
 * Plain status-value constants shared between server DB modules and
 * client form components. Kept in their own dependency-free file
 * (imports nothing) so a "use client" form (e.g.
 * src/components/trainer/classes/ClassSessionForm.jsx) can read a status
 * list WITHOUT pulling in the module that defines it elsewhere — every
 * src/lib/db/*.js file that owns one of these tables imports its list
 * from here too, so there is still exactly one source of truth, not a
 * second copy that could drift.
 */
export const CLASS_SESSION_STATUSES = ["SCHEDULED", "COMPLETED", "CANCELLED"];
export const ASSIGNMENT_STATUSES = ["DRAFT", "PUBLISHED", "CLOSED"];
export const ATTENDANCE_STATUSES = ["PRESENT", "ABSENT", "LATE", "EXCUSED"];
export const SUBMISSION_STATUSES = ["SUBMITTED", "REVIEWED", "RETURNED"];
