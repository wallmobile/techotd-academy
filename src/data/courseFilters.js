/**
 * Fixed enums driving the course filter/sort UI. Kept separate from
 * courses.js since these are UI configuration, not course records.
 */

export const LEVELS = ["Beginner", "Intermediate", "Advanced"];

export const MODES = ["Classroom", "Live Online", "Hybrid"];

export const DURATION_BANDS = [
  "Short (Up to 2 Months)",
  "Medium (2–4 Months)",
  "Long (4+ Months)",
];

/**
 * "newest" sorts by `order` — an explicit field set on each course record
 * for this purpose, since no real creation date exists yet.
 */
export const SORT_OPTIONS = [
  { value: "recommended", label: "Recommended" },
  { value: "az", label: "A–Z" },
  { value: "newest", label: "Newest" },
];
