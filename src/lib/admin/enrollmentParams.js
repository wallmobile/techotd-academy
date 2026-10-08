import { ENROLLMENT_STATUSES } from "@/constants/enrollment";
import { ENROLLMENT_SORT_KEYS } from "@/lib/db/enrollments";

// Sanitizes untrusted ?q=&course=&batch=&status=&sort=&page= for the
// enrollment list. Enumerated fields not on their whitelist become "" (no
// filter); course/batch are format-checked only and then validated against
// the catalog by getEnrollmentsPage (they're also bound SQL parameters).
export function parseEnrollmentParams(searchParams = {}) {
  const first = (v) => (Array.isArray(v) ? v[0] : v);
  const text = (name, max) => String(first(searchParams[name]) ?? "").trim().slice(0, max);

  const status = text("status", 20);
  const sort = text("sort", 10);
  const pageNum = Number.parseInt(text("page", 8) || "1", 10);
  const course = text("course", 100);
  const batch = text("batch", 100);

  return {
    q: text("q", 100),
    course: /^[a-z0-9-]{0,100}$/.test(course) ? course : "",
    batch: /^[a-z0-9-]{0,100}$/.test(batch) ? batch : "",
    status: ENROLLMENT_STATUSES.includes(status) ? status : "",
    sort: ENROLLMENT_SORT_KEYS.includes(sort) ? sort : "newest",
    page: Number.isFinite(pageNum) && pageNum > 0 ? Math.min(pageNum, 100000) : 1,
  };
}
