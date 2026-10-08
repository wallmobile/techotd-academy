import { LEAD_STATUSES, LEAD_SOURCES } from "@/constants/crm";
import { LEAD_SORT_KEYS } from "@/lib/db/leads";

// Normalizes untrusted ?q=&status=&source=&course=&mode=&assigned=&sort=&page=
// into safe inputs. Enumerated fields not on their whitelist become "" (no
// filter). course/mode are format-checked only; they're bound as SQL
// parameters, so an unknown value just matches nothing. `assigned` accepts
// "", "unassigned", "me" or an opaque id (a manager-only filter, enforced in
// the domain layer; ids are bound parameters too).
export function parseLeadParams(searchParams = {}) {
  const first = (v) => (Array.isArray(v) ? v[0] : v);
  const text = (name, max) => String(first(searchParams[name]) ?? "").trim().slice(0, max);
  const oneOf = (name, allowed) => (allowed.includes(text(name, 30)) ? text(name, 30) : "");

  const sort = LEAD_SORT_KEYS.includes(text("sort", 10)) ? text("sort", 10) : "newest";
  const pageNum = Number.parseInt(text("page", 8) || "1", 10);
  const assigned = text("assigned", 64);

  return {
    q: text("q", 100),
    status: oneOf("status", LEAD_STATUSES),
    source: oneOf("source", LEAD_SOURCES),
    course: /^[a-z0-9-]{0,100}$/.test(text("course", 100)) ? text("course", 100) : "",
    mode: /^[a-z0-9-]{0,40}$/.test(text("mode", 40)) ? text("mode", 40) : "",
    assigned: /^[A-Za-z0-9-]{0,64}$/.test(assigned) ? assigned : "",
    sort,
    page: Number.isFinite(pageNum) && pageNum > 0 ? Math.min(pageNum, 100000) : 1,
  };
}
