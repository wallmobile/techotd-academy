// Client-safe placement constants (Phase 10.6).

// Who may manage jobs and applications. Trainers, counsellors, accountants
// and content managers have no access to applicants' data.
export const PLACEMENT_ROLES = ["SUPER_ADMIN", "ADMIN", "PLACEMENT_MANAGER"];

export const JOB_STATUSES = ["DRAFT", "PUBLISHED", "CLOSED"];
export const JOB_STATUS_LABELS = { DRAFT: "Draft", PUBLISHED: "Published", CLOSED: "Closed" };

export const EMPLOYMENT_TYPES = ["FULL_TIME", "PART_TIME", "INTERNSHIP", "CONTRACT"];
export const EMPLOYMENT_TYPE_LABELS = {
  FULL_TIME: "Full-time",
  PART_TIME: "Part-time",
  INTERNSHIP: "Internship",
  CONTRACT: "Contract",
};

export const WORK_MODES = ["ONSITE", "REMOTE", "HYBRID"];
export const WORK_MODE_LABELS = { ONSITE: "On-site", REMOTE: "Remote", HYBRID: "Hybrid" };

// Application pipeline. Only staff advance it; a student may only WITHDRAW.
export const APPLICATION_STATUSES = ["APPLIED", "UNDER_REVIEW", "SHORTLISTED", "INTERVIEW", "SELECTED", "REJECTED", "WITHDRAWN"];
export const APPLICATION_STATUS_LABELS = {
  APPLIED: "Applied",
  UNDER_REVIEW: "Under review",
  SHORTLISTED: "Shortlisted",
  INTERVIEW: "Interview",
  SELECTED: "Selected",
  REJECTED: "Not selected",
  WITHDRAWN: "Withdrawn",
};

// Allowed staff transitions (server-enforced). REJECTED / WITHDRAWN are final.
export const STAFF_TRANSITIONS = {
  APPLIED: ["UNDER_REVIEW", "SHORTLISTED", "REJECTED"],
  UNDER_REVIEW: ["SHORTLISTED", "REJECTED"],
  SHORTLISTED: ["INTERVIEW", "REJECTED"],
  INTERVIEW: ["SELECTED", "REJECTED"],
  SELECTED: ["REJECTED"],
  REJECTED: [],
  WITHDRAWN: [],
};

export const STUDENT_WITHDRAWABLE = ["APPLIED", "UNDER_REVIEW", "SHORTLISTED", "INTERVIEW"];

export const JOBS_PAGE_SIZE = 10;
export const ADMIN_JOBS_PAGE_SIZE = 20;
export const MAX = { title: 120, company: 120, description: 5000, location: 120, experience: 80, skills: 300, cover: 1000, notes: 1000 };
