// Validation for the admin course / batch forms (Phase 10.11). Pure functions:
// they take untrusted strings and return { errors, value }. The server actions
// call them; the database is only touched after they pass. Lengths are checked,
// never silently truncated, so what was saved is exactly what the admin typed.

import { categories } from "@/data/categories";
import { LEVELS, MODES, DURATION_BANDS } from "@/data/courseFilters";
import { BATCH_MODES, BATCH_STATUSES, BATCH_LIMITS, COURSE_LIMITS, SLUG_PATTERN } from "@/constants/catalog";

// Strip control characters (keep newline in multi-line fields), normalise
// spaces. Angle brackets are legal text; React escapes on output.
function clean(value, { multiline = false } = {}) {
  let text = String(value ?? "").replace(/\r\n?/g, "\n");
  text = text.replace(multiline ? /[\u0000-\u0009\u000B-\u001F\u007F]/g : /[\u0000-\u001F\u007F]/g, " ");
  text = multiline ? text.replace(/[ \t]+/g, " ").replace(/\n{3,}/g, "\n\n") : text.replace(/\s+/g, " ");
  return text.trim();
}

/** "a, b\nc" -> ["a","b","c"] (deduplicated, case-insensitive). */
export function parseList(text, { separators = /\n/ } = {}) {
  const seen = new Set();
  const out = [];
  for (const part of String(text ?? "").split(separators)) {
    const item = clean(part);
    if (!item) continue;
    const key = item.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(item);
  }
  return out;
}

function checkList(list, label, errors, key, { required = false } = {}) {
  if (required && list.length === 0) errors[key] = `Add at least one ${label}.`;
  else if (list.length > COURSE_LIMITS.listItems) errors[key] = `Use at most ${COURSE_LIMITS.listItems} ${label}s.`;
  else if (list.some((item) => item.length > COURSE_LIMITS.listItem)) errors[key] = `Each ${label} must be ${COURSE_LIMITS.listItem} characters or fewer.`;
}

export function isValidIsoDate(value) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [y, m, d] = value.split("-").map(Number);
  if (y < 2000 || y > 2100) return false;
  const date = new Date(Date.UTC(y, m - 1, d));
  return date.getUTCFullYear() === y && date.getUTCMonth() === m - 1 && date.getUTCDate() === d;
}

/** Suggests a slug from a title (the admin may edit it before creating). */
export function slugify(title) {
  return String(title ?? "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

/**
 * raw: { title, shortDescription, description, categorySlug, level, duration,
 *        durationBand, modes: string[], technologies, prerequisites, outcomes }
 * (the three lists arrive as text: technologies comma/newline separated, the
 * others one per line).
 */
export function validateCourseInput(raw) {
  const errors = {};
  const title = clean(raw.title);
  const shortDescription = clean(raw.shortDescription);
  const description = clean(raw.description, { multiline: true });
  const duration = clean(raw.duration);
  const categorySlug = clean(raw.categorySlug);
  const level = clean(raw.level);
  const durationBand = clean(raw.durationBand);
  const modes = [...new Set((Array.isArray(raw.modes) ? raw.modes : []).map((m) => clean(m)))];
  const technologies = parseList(raw.technologies, { separators: /[\n,]/ });
  const prerequisites = parseList(raw.prerequisites);
  const outcomes = parseList(raw.outcomes);

  if (title.length < 3) errors.title = "Enter a course title (at least 3 characters).";
  else if (title.length > COURSE_LIMITS.title) errors.title = `Keep the title to ${COURSE_LIMITS.title} characters or fewer.`;

  if (shortDescription.length < 10) errors.shortDescription = "Add a short summary (at least 10 characters).";
  else if (shortDescription.length > COURSE_LIMITS.shortDescription) errors.shortDescription = `Keep the summary to ${COURSE_LIMITS.shortDescription} characters or fewer.`;

  if (description.length < 20) errors.description = "Add a description (at least 20 characters).";
  else if (description.length > COURSE_LIMITS.description) errors.description = `Keep the description to ${COURSE_LIMITS.description} characters or fewer.`;

  if (!categories.some((c) => c.slug === categorySlug)) errors.categorySlug = "Please choose a category.";
  if (!LEVELS.includes(level)) errors.level = "Please choose a level.";
  if (!DURATION_BANDS.includes(durationBand)) errors.durationBand = "Please choose a duration band.";

  if (duration.length < 2) errors.duration = "Enter the duration (for example 3 Months).";
  else if (duration.length > COURSE_LIMITS.duration) errors.duration = `Keep the duration to ${COURSE_LIMITS.duration} characters or fewer.`;

  if (modes.length === 0) errors.modes = "Choose at least one learning mode.";
  else if (modes.some((m) => !MODES.includes(m))) errors.modes = "Please choose valid learning modes.";

  checkList(technologies, "technology", errors, "technologies");
  checkList(prerequisites, "prerequisite", errors, "prerequisites");
  checkList(outcomes, "outcome", errors, "outcomes");

  return {
    errors,
    value: { title, shortDescription, description, categorySlug, level, duration, durationBand, modes, technologies, prerequisites, outcomes },
  };
}

export function validateCourseSlug(slug) {
  const value = String(slug ?? "").trim();
  if (!value) return { error: "Enter a URL name (slug) for the course.", value };
  if (value.length > 60) return { error: "Keep the URL name to 60 characters or fewer.", value };
  if (!SLUG_PATTERN.test(value)) return { error: "Use lowercase letters, numbers and single hyphens only.", value };
  return { error: null, value };
}

/**
 * raw: { mode, schedule, startsOn, endsOn, status, location }. `course` is the
 * (already resolved) course the batch belongs to; its supported modes bound the
 * batch mode, but an UNCHANGED existing mode is always accepted so editing
 * other fields never trips over older data.
 */
export function validateBatchInput(raw, { course, currentMode = null } = {}) {
  const errors = {};
  const mode = clean(raw.mode);
  const schedule = clean(raw.schedule);
  const startsOn = clean(raw.startsOn);
  const endsOn = clean(raw.endsOn);
  const status = clean(raw.status);
  const location = clean(raw.location);

  if (!BATCH_MODES.includes(mode)) errors.mode = "Please choose a mode.";
  else if (course && !(course.modes ?? []).includes(mode) && mode !== currentMode) errors.mode = `${course.title} is not offered in ${mode} mode.`;

  if (schedule.length < 3) errors.schedule = "Enter the schedule (for example Mon – Fri • 7:00 PM).";
  else if (schedule.length > BATCH_LIMITS.schedule) errors.schedule = `Keep the schedule to ${BATCH_LIMITS.schedule} characters or fewer.`;

  if (!isValidIsoDate(startsOn)) errors.startsOn = "Enter a valid start date.";
  if (endsOn) {
    if (!isValidIsoDate(endsOn)) errors.endsOn = "Enter a valid end date, or leave it empty.";
    else if (isValidIsoDate(startsOn) && endsOn < startsOn) errors.endsOn = "The end date can't be before the start date.";
  }

  if (!BATCH_STATUSES.includes(status)) errors.status = "Please choose a status.";
  if (location.length > BATCH_LIMITS.location) errors.location = `Keep the location to ${BATCH_LIMITS.location} characters or fewer.`;

  const defaultLocation = mode === "Live Online" ? "Online" : mode === "Hybrid" ? "Online and classroom — details shared on enrollment" : "Classroom — location shared on enrollment";
  return { errors, value: { mode, schedule, startsOn, endsOn: endsOn || null, status, location: location || defaultLocation } };
}
