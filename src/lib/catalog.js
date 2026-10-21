// Course & batch catalog (Phase 10.11). SERVER-ONLY: it reads the database, so it
// must never be imported from a "use client" module (pass the data in as props).
//
// The catalog is the code-defined records (src/data/courses.js, batches.js)
// overlaid with admin edits and admin-created records (src/lib/db/catalog.js).
// Every consumer reads through here so that an edit, a new batch or an
// unpublished course is seen consistently by the public site, the student and
// trainer areas, enrollment, fees and certificates. There is deliberately no
// cache: the overlay tables are tiny, reads are in-process, and a cache would
// go stale across Next.js module instances, server processes and serverless
// instances. Every reader is therefore async.
//
// Published vs. all: public pages use { publishedOnly: true } /
// { publicOnly: true }. Everything that resolves an EXISTING enrollment,
// certificate or fee uses the unfiltered getters, so unpublishing a course or
// archiving a batch never breaks a student's history.

import { courses as baseCourses } from "@/data/courses";
import { batches as baseBatches } from "@/data/batches";
import { categories, getCategoryBySlug } from "@/data/categories";
import { PUBLIC_BATCH_STATUSES } from "@/constants/catalog";
import { getCatalogCourseRow, getCatalogBatchRow, listCatalogCourseRows, listCatalogBatchRows } from "@/lib/db/catalog";

const CERTIFICATION =
  "Certificate of Completion, awarded on meeting the program's completion criteria. Certificate details and eligibility may vary by program.";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** "2026-10-19" -> "19 Oct 2026" (the format used by the code-defined batches). */
export const BATCH_DATES_TBA = "Dates to be announced";
export const BATCH_TIMING_TBA = "Timing to be announced";

export function formatBatchDate(iso) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso || "");
  if (!m) return iso || "";
  return `${m[3]} ${MONTHS[Number(m[2]) - 1] ?? m[2]} ${m[1]}`;
}

const initialsOf = (title) =>
  title
    .split(/[^A-Za-z0-9]+/)
    .filter(Boolean)
    .map((w) => w[0].toUpperCase())
    .join("")
    .slice(0, 3) || "NA";

function mergeBaseCourse(base, row) {
  const merged = { ...base, origin: "BASE", status: "PUBLISHED", isCustom: false };
  if (!row) return merged;
  merged.status = row.status;
  const pick = (key, value) => {
    if (value !== null && value !== undefined) merged[key] = value;
  };
  pick("title", row.title);
  pick("shortDescription", row.shortDescription);
  pick("description", row.description);
  pick("duration", row.duration);
  pick("durationBand", row.durationBand);
  pick("modes", row.modes);
  pick("technologies", row.technologies);
  pick("prerequisites", row.prerequisites);
  pick("outcomes", row.outcomes);
  if (row.level) {
    merged.level = row.level;
    merged.levelLabel = row.level;
  }
  if (row.categorySlug) {
    merged.categorySlug = row.categorySlug;
    merged.category = getCategoryBySlug(row.categorySlug)?.title ?? merged.category;
  }
  return merged;
}

function buildCustomCourse(row, index) {
  const category = getCategoryBySlug(row.categorySlug);
  const description = row.description || "";
  return {
    id: row.slug,
    slug: row.slug,
    order: 100 + index,
    title: row.title,
    shortDescription: row.shortDescription || "",
    description,
    category: category?.title ?? row.categorySlug,
    categorySlug: row.categorySlug,
    level: row.level,
    levelLabel: row.level,
    duration: row.duration || "",
    durationBand: row.durationBand,
    modes: row.modes ?? [],
    featured: false,
    popular: false,
    accent: "primary",
    initials: initialsOf(row.title),
    technologies: row.technologies ?? [],
    prerequisites: row.prerequisites ?? [],
    outcomes: row.outcomes ?? [],
    // Syllabus content is authored in code (courseSyllabus.js); an admin-created
    // course starts without it and every course page renders that gracefully.
    modules: [],
    projects: [],
    certification: CERTIFICATION,
    faqs: [],
    related: [],
    overview: description ? [description] : [],
    audience: [],
    highlights: [],
    origin: "CUSTOM",
    status: row.status,
    isCustom: true,
  };
}

async function allCourses() {
  const rows = new Map((await listCatalogCourseRows()).map((r) => [r.slug, r]));
  const base = baseCourses.map((c) => mergeBaseCourse(c, rows.get(c.slug)));
  const custom = [...rows.values()].filter((r) => r.origin === "CUSTOM" && !baseCourses.some((c) => c.slug === r.slug));
  return [...base, ...custom.map((r, i) => buildCustomCourse(r, i))];
}

/** All courses (including unpublished unless publishedOnly). Order: code-defined first, then admin-created. */
export async function listCourses({ publishedOnly = false } = {}) {
  const all = await allCourses();
  return publishedOnly ? all.filter((c) => c.status === "PUBLISHED") : all;
}

/** One course by slug, or undefined. Pass publishedOnly for public routes. */
export async function getCourse(slug, { publishedOnly = false } = {}) {
  if (typeof slug !== "string") return undefined;
  const base = baseCourses.find((c) => c.slug === slug);
  const row = await getCatalogCourseRow(slug);
  let course;
  if (base) course = mergeBaseCourse(base, row);
  else if (row && row.origin === "CUSTOM") course = buildCustomCourse(row, (await listCatalogCourseRows()).filter((r) => r.origin === "CUSTOM").findIndex((r) => r.slug === slug));
  if (!course) return undefined;
  return publishedOnly && course.status !== "PUBLISHED" ? undefined : course;
}

/** The code-defined record (no admin edits applied), or undefined for admin-created courses. */
export function getBaseCourse(slug) {
  return baseCourses.find((c) => c.slug === slug);
}

export async function slugExists(slug) {
  return baseCourses.some((c) => c.slug === slug) || Boolean(await getCatalogCourseRow(slug));
}

export async function isCoursePublished(slug) {
  return Boolean(await getCourse(slug, { publishedOnly: true }));
}

const GENERIC_TECH = new Set(["Git", "REST APIs"]);

/** "Next step" suggestions among PUBLISHED courses (curated slugs first, then by relevance). */
export async function getRelatedCourses(course, limit = 3) {
  const published = await listCourses({ publishedOnly: true });
  const curated = (course.related ?? []).map((slug) => published.find((c) => c.slug === slug)).filter(Boolean);
  const scored = published
    .filter((candidate) => candidate.slug !== course.slug && !curated.includes(candidate))
    .map((candidate) => {
      const sharedTech = candidate.technologies.filter((t) => !GENERIC_TECH.has(t) && course.technologies.includes(t)).length;
      return { candidate, score: (candidate.categorySlug === course.categorySlug ? 3 : 0) + sharedTech };
    })
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score)
    .map((entry) => entry.candidate);
  return [...curated, ...scored].slice(0, limit);
}

// ----------------------------------------------------------------- batches

function mergeBatch(base, row) {
  const batch = { endsOn: null, ...base, origin: "BASE" };
  if (row) {
    if (row.mode) batch.mode = row.mode;
    if (row.schedule) batch.schedule = row.schedule;
    if (row.startsOn) batch.startsOn = row.startsOn;
    if (row.status) batch.status = row.status;
    if (row.location) batch.location = row.location;
    batch.endsOn = row.endsOn ?? batch.endsOn;
  }
  batch.startDate = formatBatchDate(batch.startsOn);
  batch.endDate = batch.endsOn ? formatBatchDate(batch.endsOn) : "";
  // Placeholder schedule in the code-defined data: never present it as a real
  // date/time. An admin-entered start date or schedule replaces it.
  batch.datesTba = Boolean(base.datesTba) && !row?.startsOn;
  if (batch.datesTba) batch.startDate = BATCH_DATES_TBA;
  if (base.datesTba && !row?.schedule) batch.schedule = BATCH_TIMING_TBA;
  return batch;
}

function customBatch(row) {
  return {
    id: row.id,
    courseSlug: row.courseSlug,
    mode: row.mode,
    schedule: row.schedule,
    startsOn: row.startsOn,
    startDate: formatBatchDate(row.startsOn),
    endsOn: row.endsOn ?? null,
    endDate: row.endsOn ? formatBatchDate(row.endsOn) : "",
    status: row.status,
    location: row.location,
    origin: "CUSTOM",
  };
}

async function allBatches() {
  const rows = new Map((await listCatalogBatchRows()).map((r) => [r.id, r]));
  const base = baseBatches.map((b) => mergeBatch(b, rows.get(b.id)));
  const custom = [...rows.values()]
    .filter((r) => r.origin === "CUSTOM" && !baseBatches.some((b) => b.id === r.id))
    .map(customBatch)
    .sort((a, b) => (a.startsOn < b.startsOn ? -1 : a.startsOn > b.startsOn ? 1 : 0));
  return [...base, ...custom];
}

/**
 * All batches, or with publicOnly just those a visitor may see / enrol in:
 * status Open/Upcoming AND the course is published. Optionally one course.
 */
export async function listBatches({ publicOnly = false, courseSlug } = {}) {
  let list = await allBatches();
  if (courseSlug) list = list.filter((b) => b.courseSlug === courseSlug);
  if (publicOnly) {
    const published = new Set((await listCourses({ publishedOnly: true })).map((c) => c.slug));
    list = list.filter((b) => PUBLIC_BATCH_STATUSES.includes(b.status) && published.has(b.courseSlug));
  }
  return list;
}

/** The code-defined batch record (no admin edits applied), or undefined. */
export function getBaseBatch(id) {
  return baseBatches.find((b) => b.id === id);
}

/** One batch by id (any status), or null. */
export async function getBatch(id) {
  if (typeof id !== "string") return null;
  const base = baseBatches.find((b) => b.id === id);
  const row = await getCatalogBatchRow(id);
  if (base) return mergeBatch(base, row);
  if (row && row.origin === "CUSTOM") return customBatch(row);
  return null;
}

export const catalogCategories = categories;
