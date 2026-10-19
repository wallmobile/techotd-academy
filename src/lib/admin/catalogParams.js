import { categories } from "@/data/categories";
import { LEVELS } from "@/data/courseFilters";
import { COURSE_STATUSES, BATCH_STATUSES, BATCH_MODES } from "@/constants/catalog";

// Sanitizes untrusted ?q=&category=&level=&status=&sort=&page= for the admin
// course / batch lists. Enumerated values not on their whitelist become ""
// (no filter); slugs are format-checked here and matched against the catalog
// by the list functions (they are only ever compared, never put in SQL).
const first = (v) => (Array.isArray(v) ? v[0] : v);
const text = (sp, name, max) => String(first(sp[name]) ?? "").trim().slice(0, max);
const slugOrEmpty = (value) => (/^[a-z0-9-]{0,100}$/.test(value) ? value : "");
const pageOf = (sp) => {
  const n = Number.parseInt(text(sp, "page", 8) || "1", 10);
  return Number.isFinite(n) && n > 0 ? Math.min(n, 100000) : 1;
};

export const COURSE_SORTS = { az: "Title (A–Z)", newest: "Newest first", status: "Status" };
export const BATCH_SORTS = { start: "Start date (latest first)", "start-asc": "Start date (earliest first)", course: "Course (A–Z)" };

export function parseCourseParams(searchParams = {}) {
  const category = text(searchParams, "category", 100);
  const level = text(searchParams, "level", 20);
  const status = text(searchParams, "status", 20);
  const sort = text(searchParams, "sort", 10);
  return {
    q: text(searchParams, "q", 100),
    category: categories.some((c) => c.slug === category) ? category : "",
    level: LEVELS.includes(level) ? level : "",
    status: COURSE_STATUSES.includes(status) ? status : "",
    sort: sort in COURSE_SORTS ? sort : "az",
    page: pageOf(searchParams),
  };
}

export function parseBatchParams(searchParams = {}) {
  const status = text(searchParams, "status", 20);
  const mode = text(searchParams, "mode", 20);
  const sort = text(searchParams, "sort", 12);
  return {
    q: text(searchParams, "q", 100),
    course: slugOrEmpty(text(searchParams, "course", 100)),
    status: BATCH_STATUSES.includes(status) ? status : "",
    mode: BATCH_MODES.includes(mode) ? mode : "",
    sort: sort in BATCH_SORTS ? sort : "start",
    page: pageOf(searchParams),
  };
}
