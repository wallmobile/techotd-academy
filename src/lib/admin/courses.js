// Admin course management (Phase 10.11). Every function re-derives the caller
// from the session via getAdminContext() (ADMIN / SUPER_ADMIN only) and
// validates everything it is given against the catalog and the database; ids
// and slugs from forms and URLs are only ever targets to validate.
//
// Courses are never deleted: they are unpublished. Enrollments, fees and
// certificates reference a course by slug, so an unpublished course keeps
// resolving for everyone who already has it; it just disappears from the
// public site and from new enrollments.

import { getAdminContext } from "@/lib/admin/context";
import { listCourses, getCourse, getBaseCourse, slugExists, listBatches } from "@/lib/catalog";
import {
  insertCustomCourse,
  saveCourseEdits,
  setCourseStatus as dbSetCourseStatus,
  countEnrollmentsForBatches,
  listAuditForEntity,
} from "@/lib/db/catalog";
import { validateCourseInput, validateCourseSlug } from "@/lib/validateCatalog";
import { COURSE_STATUSES, CATALOG_PAGE_SIZE } from "@/constants/catalog";
import { categories } from "@/data/categories";
import { LEVELS, MODES, DURATION_BANDS } from "@/data/courseFilters";

const FORBIDDEN = { ok: false, reason: "forbidden", message: "You don't have permission to do that." };
const EMPTY_PAGE = { rows: [], page: 1, totalPages: 1, pageSize: CATALOG_PAGE_SIZE, total: 0 };

export const COURSE_MESSAGES = {
  not_found: "Course not found.",
  duplicate_slug: "A course with that URL name already exists.",
  duplicate_title: "Another course already has that title.",
  invalid: "Please fix the highlighted fields.",
  status_invalid: "Please choose a valid status.",
};

const fail = (reason, extra = {}) => ({ ok: false, reason, message: COURSE_MESSAGES[reason], ...extra });

export function getCourseFormOptions() {
  return {
    categories: categories.map((c) => ({ value: c.slug, label: c.title })),
    levels: LEVELS,
    modes: MODES,
    durationBands: DURATION_BANDS,
  };
}

function enrollmentCountsFor(courseSlug) {
  const batchIds = listBatches({ courseSlug }).map((b) => b.id);
  return { batchCount: batchIds.length, ...countEnrollmentsForBatches(batchIds) };
}

const SORTERS = {
  az: (a, b) => a.title.localeCompare(b.title),
  newest: (a, b) => (b.order ?? 0) - (a.order ?? 0) || a.title.localeCompare(b.title),
  status: (a, b) => a.status.localeCompare(b.status) || a.title.localeCompare(b.title),
};

// {q, category, level, status, sort, page}; already whitelisted by parseCourseParams.
export async function getCoursesPage({ q = "", category = "", level = "", status = "", sort = "az", page = 1 } = {}) {
  if (!(await getAdminContext())) return EMPTY_PAGE;
  const needle = q.trim().toLowerCase();
  const filtered = listCourses()
    .filter((c) => !category || c.categorySlug === category)
    .filter((c) => !level || c.level === level)
    .filter((c) => !status || c.status === status)
    .filter((c) => !needle || [c.title, c.slug, c.category, ...(c.technologies ?? [])].join(" ").toLowerCase().includes(needle))
    .sort(SORTERS[sort] ?? SORTERS.az);

  const total = filtered.length;
  const totalPages = Math.max(1, Math.ceil(total / CATALOG_PAGE_SIZE));
  const current = Math.min(Math.max(1, page || 1), totalPages);
  const rows = filtered.slice((current - 1) * CATALOG_PAGE_SIZE, current * CATALOG_PAGE_SIZE).map((c) => ({
    id: c.slug,
    slug: c.slug,
    title: c.title,
    category: c.category,
    level: c.level,
    duration: c.duration,
    status: c.status,
    isCustom: c.isCustom,
    ...enrollmentCountsFor(c.slug),
  }));
  return { rows, page: current, totalPages, pageSize: CATALOG_PAGE_SIZE, total };
}

// Null for an unknown slug. The batches list carries per-batch enrollment counts.
export async function getCourseDetailForAdmin(slug) {
  if (!(await getAdminContext())) return null;
  const course = getCourse(slug);
  if (!course) return null;
  const batches = listBatches({ courseSlug: course.slug }).map((b) => ({ ...b, ...countEnrollmentsForBatches([b.id]) }));
  return {
    course,
    batches,
    counts: enrollmentCountsFor(course.slug),
    audit: listAuditForEntity("course", course.slug),
  };
}

const LIST_KEYS = ["technologies", "prerequisites", "outcomes", "modes"];
const FIELD_KEYS = ["title", "shortDescription", "description", "categorySlug", "level", "duration", "durationBand", ...LIST_KEYS];

function sameValue(a, b) {
  return Array.isArray(a) || Array.isArray(b) ? JSON.stringify(a ?? []) === JSON.stringify(b ?? []) : (a ?? "") === (b ?? "");
}

function titleTaken(title, exceptSlug) {
  const key = title.toLowerCase();
  return listCourses().some((c) => c.slug !== exceptSlug && c.title.trim().toLowerCase() === key);
}

/** Creates an admin-defined course (starts Unpublished unless asked otherwise). */
export async function createCourse(raw) {
  const ctx = await getAdminContext();
  if (!ctx) return FORBIDDEN;

  const slug = validateCourseSlug(raw.slug);
  const { errors, value } = validateCourseInput(raw);
  if (slug.error) errors.slug = slug.error;
  else if (slugExists(slug.value)) errors.slug = COURSE_MESSAGES.duplicate_slug;
  if (!errors.title && titleTaken(value.title, null)) errors.title = COURSE_MESSAGES.duplicate_title;
  const status = COURSE_STATUSES.includes(raw.status) ? raw.status : "UNPUBLISHED";
  if (Object.keys(errors).length > 0) return fail("invalid", { errors });

  try {
    insertCustomCourse(ctx.user.id, slug.value, value, status);
  } catch (error) {
    // Two admins creating the same slug at once: the primary key decides.
    if (String(error?.code || "").startsWith("SQLITE_CONSTRAINT")) return fail("duplicate_slug", { errors: { slug: COURSE_MESSAGES.duplicate_slug } });
    throw error;
  }
  return { ok: true, slug: slug.value, status };
}

/** Edits any course's managed fields. The slug never changes. */
export async function updateCourse(slug, raw) {
  const ctx = await getAdminContext();
  if (!ctx) return FORBIDDEN;
  const course = getCourse(slug);
  if (!course) return fail("not_found");

  const { errors, value } = validateCourseInput(raw);
  if (!errors.title && titleTaken(value.title, course.slug)) errors.title = COURSE_MESSAGES.duplicate_title;
  if (Object.keys(errors).length > 0) return fail("invalid", { errors });

  const changed = FIELD_KEYS.filter((key) => !sameValue(value[key], course[key]));
  if (changed.length === 0) return { ok: true, slug: course.slug, unchanged: true };

  // For a code-defined course only genuine differences from the code values are
  // stored as overrides, so untouched fields keep their original presentation
  // (for example the "Beginner → Advanced" level label).
  const base = course.isCustom ? null : getBaseCourse(course.slug);
  const stored = {};
  for (const key of FIELD_KEYS) stored[key] = base && sameValue(value[key], base[key]) ? null : value[key];

  saveCourseEdits(ctx.user.id, course.slug, course.origin, stored, changed);
  return { ok: true, slug: course.slug, changed };
}

/** Publish / unpublish. Existing enrollments, fees and certificates are untouched. */
export async function setCourseStatus(slug, status) {
  const ctx = await getAdminContext();
  if (!ctx) return FORBIDDEN;
  if (!COURSE_STATUSES.includes(status)) return fail("status_invalid");
  const course = getCourse(slug);
  if (!course) return fail("not_found");
  if (course.status === status) return { ok: true, slug: course.slug, status, unchanged: true };

  dbSetCourseStatus(ctx.user.id, course.slug, course.origin, status);
  return { ok: true, slug: course.slug, status, activeEnrollments: enrollmentCountsFor(course.slug).active };
}
