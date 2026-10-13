import { CERTIFICATE_SORT_KEYS, CERTIFICATE_STATUSES } from "@/lib/db/certificates";

// Sanitizes untrusted ?q=&status=&course=&sort=&page= for the certificate list.
export function parseCertificateParams(searchParams = {}) {
  const first = (v) => (Array.isArray(v) ? v[0] : v);
  const text = (name, max) => String(first(searchParams[name]) ?? "").trim().slice(0, max);
  const status = text("status", 12);
  const sort = text("sort", 10);
  const course = text("course", 100);
  const pageNum = Number.parseInt(text("page", 8) || "1", 10);
  return {
    q: text("q", 100),
    status: CERTIFICATE_STATUSES.includes(status) ? status : "",
    course: /^[a-z0-9-]{0,100}$/.test(course) ? course : "",
    sort: CERTIFICATE_SORT_KEYS.includes(sort) ? sort : "newest",
    page: Number.isFinite(pageNum) && pageNum > 0 ? Math.min(pageNum, 100000) : 1,
  };
}
