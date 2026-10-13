import { FEE_STATUS_LABELS } from "@/constants/fees";
import { FEE_SORT_KEYS } from "@/lib/db/fees";

// Sanitizes untrusted ?q=&status=&course=&sort=&page= for the fee list.
export function parseFeeParams(searchParams = {}) {
  const first = (v) => (Array.isArray(v) ? v[0] : v);
  const text = (name, max) => String(first(searchParams[name]) ?? "").trim().slice(0, max);
  const status = text("status", 20);
  const sort = text("sort", 12);
  const course = text("course", 100);
  const pageNum = Number.parseInt(text("page", 8) || "1", 10);
  return {
    q: text("q", 100),
    status: Object.keys(FEE_STATUS_LABELS).includes(status) ? status : "",
    course: /^[a-z0-9-]{0,100}$/.test(course) ? course : "",
    sort: FEE_SORT_KEYS.includes(sort) ? sort : "newest",
    page: Number.isFinite(pageNum) && pageNum > 0 ? Math.min(pageNum, 100000) : 1,
  };
}
