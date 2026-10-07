import { PAGE_SIZE, SORT_KEYS } from "@/lib/db/adminQueries";
import { ROLES } from "@/lib/auth/roles";

// Normalizes untrusted ?q=&role=&sort=&page= search params into safe query
// inputs: unknown roles/sorts fall back to "no filter"/newest, page is
// clamped to a positive integer, and q is trimmed and length-capped. The
// result only ever feeds parameterized SQL.
export function parseListParams(searchParams = {}, { allowRole = false } = {}) {
  const first = (v) => (Array.isArray(v) ? v[0] : v);
  const q = String(first(searchParams.q) ?? "").trim().slice(0, 100);
  const roleRaw = String(first(searchParams.role) ?? "");
  const role = allowRole && ROLES.includes(roleRaw) ? roleRaw : "";
  const sortRaw = String(first(searchParams.sort) ?? "");
  const sort = SORT_KEYS.includes(sortRaw) ? sortRaw : "newest";
  const pageNum = Number.parseInt(String(first(searchParams.page) ?? "1"), 10);
  const page = Number.isFinite(pageNum) && pageNum > 0 ? Math.min(pageNum, 100000) : 1;
  return { q, role, sort, page };
}

export function paginate(total, page) {
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  return { page: Math.min(page, totalPages), totalPages, pageSize: PAGE_SIZE, total };
}

export { PAGE_SIZE };
