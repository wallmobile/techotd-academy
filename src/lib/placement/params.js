import { JOB_STATUSES, EMPLOYMENT_TYPES, WORK_MODES } from "@/constants/placement";
import { JOB_SORT_KEYS } from "@/lib/db/jobs";

const first = (v) => (Array.isArray(v) ? v[0] : v);
const text = (sp, name, max) => String(first(sp[name]) ?? "").trim().slice(0, max);
const page = (sp) => {
  const n = Number.parseInt(text(sp, "page", 8) || "1", 10);
  return Number.isFinite(n) && n > 0 ? Math.min(n, 100000) : 1;
};

// Staff job list: ?q=&status=&sort=&page=
export function parseJobParams(sp = {}) {
  const status = text(sp, "status", 12);
  const sort = text(sp, "sort", 10);
  return {
    q: text(sp, "q", 100),
    status: JOB_STATUSES.includes(status) ? status : "",
    sort: JOB_SORT_KEYS.includes(sort) ? sort : "newest",
    page: page(sp),
  };
}

// Student job board: URL ?q=&type=&mode=&page= -> { q, employmentType, workMode, page }
export function parseBoardParams(sp = {}) {
  const type = text(sp, "type", 12);
  const mode = text(sp, "mode", 8);
  return {
    q: text(sp, "q", 100),
    employmentType: EMPLOYMENT_TYPES.includes(type) ? type : "",
    workMode: WORK_MODES.includes(mode) ? mode : "",
    page: page(sp),
  };
}
