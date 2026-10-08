import crypto from "node:crypto";
import { db } from "@/lib/db/client";
import { LEAD_STATUSES } from "@/constants/crm";
import { createUser, findUserByEmailInternal } from "@/lib/db/users";

// Lead + lead-note persistence (Phase 10.2). All SQL is parameterized; the
// only interpolated fragment is a sort order picked from a fixed whitelist.
// Authorization is NOT decided here — callers (src/lib/crm/*) pass in the
// already-derived scope. No function selects password hashes or tokens;
// the only user fields joined in are names.

const SORTS = {
  newest: "l.created_at DESC, l.id ASC",
  oldest: "l.created_at ASC, l.id ASC",
  name: "l.name COLLATE NOCASE ASC, l.id ASC",
};
export const LEAD_SORT_KEYS = Object.keys(SORTS);

function rowToLead(row) {
  if (!row) return null;
  return {
    id: row.id,
    name: row.name,
    phone: row.phone,
    email: row.email,
    organization: row.organization,
    city: row.city,
    experienceLevel: row.experience_level,
    courseSlug: row.course_slug,
    mode: row.mode,
    batchId: row.batch_id,
    message: row.message,
    source: row.source,
    origin: row.origin,
    consent: Boolean(row.consent),
    status: row.status,
    assignedTo: row.assigned_to,
    assignedToName: row.assignee_name ?? null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    lastContactedAt: row.last_contacted_at,
    convertedUserId: row.converted_user_id ?? null,
    convertedAt: row.converted_at ?? null,
  };
}

const LEAD_SELECT = `SELECT l.*, u.name AS assignee_name
  FROM leads l LEFT JOIN users u ON u.id = l.assigned_to`;

export function createLead(input) {
  const id = crypto.randomUUID();
  db.prepare(
    `INSERT INTO leads
       (id, name, phone, email, organization, city, experience_level, course_slug, mode, batch_id,
        message, source, origin, consent, status)
     VALUES
       (@id, @name, @phone, @email, @organization, @city, @experienceLevel, @courseSlug, @mode, @batchId,
        @message, @source, @origin, @consent, 'NEW')`
  ).run({
    id,
    name: input.name,
    phone: input.phone,
    email: input.email,
    organization: input.organization ?? null,
    city: input.city ?? null,
    experienceLevel: input.experienceLevel ?? null,
    courseSlug: input.courseSlug ?? null,
    mode: input.mode ?? null,
    batchId: input.batchId ?? null,
    message: input.message ?? null,
    source: input.source,
    origin: input.origin ?? null,
    consent: input.consent ? 1 : 0,
  });
  return getLeadById(id);
}

// An identical submission (same contact + same request) created within
// `seconds` — i.e. an accidental double-click/refresh, not a genuine
// repeat enquiry. Returns the existing lead or null.
export function findRecentDuplicateLead(input, seconds = 60) {
  const row = db
    .prepare(
      `${LEAD_SELECT}
       WHERE l.email = @email AND l.phone = @phone AND l.source = @source
         AND l.course_slug IS @courseSlug AND l.mode IS @mode AND l.batch_id IS @batchId
         AND l.message IS @message
         AND l.created_at >= datetime('now', @window)
       ORDER BY l.created_at DESC LIMIT 1`
    )
    .get({
      email: input.email,
      phone: input.phone,
      source: input.source,
      courseSlug: input.courseSlug ?? null,
      mode: input.mode ?? null,
      batchId: input.batchId ?? null,
      message: input.message ?? null,
      window: `-${Math.floor(seconds)} seconds`,
    });
  return rowToLead(row);
}

export function getLeadById(id) {
  if (!id || typeof id !== "string") return null;
  return rowToLead(db.prepare(`${LEAD_SELECT} WHERE l.id = ?`).get(id));
}

function likePattern(q) {
  return `%${q.replace(/[\\%_]/g, (c) => `\\${c}`)}%`;
}

function buildWhere({ q, status, source, course, mode, assigned, scopeUserId }) {
  const clauses = [];
  const params = {};
  if (scopeUserId) {
    clauses.push("(l.assigned_to = @scopeUserId OR l.assigned_to IS NULL)");
    params.scopeUserId = scopeUserId;
  }
  if (status) {
    clauses.push("l.status = @status");
    params.status = status;
  }
  if (source) {
    clauses.push("l.source = @source");
    params.source = source;
  }
  if (course) {
    clauses.push("l.course_slug = @course");
    params.course = course;
  }
  if (mode) {
    clauses.push("l.mode = @mode");
    params.mode = mode;
  }
  if (assigned === "unassigned") {
    clauses.push("l.assigned_to IS NULL");
  } else if (assigned) {
    clauses.push("l.assigned_to = @assigned");
    params.assigned = assigned;
  }
  if (q) {
    clauses.push("(l.name LIKE @q ESCAPE '\\' OR l.email LIKE @q ESCAPE '\\' OR l.phone LIKE @q ESCAPE '\\')");
    params.q = likePattern(q);
  }
  return { where: clauses.length ? `WHERE ${clauses.join(" AND ")}` : "", params };
}

export function listLeads({ sort = "newest", limit = 20, offset = 0, ...filters }) {
  const { where, params } = buildWhere(filters);
  const order = SORTS[sort] || SORTS.newest;
  const rows = db
    .prepare(`${LEAD_SELECT} ${where} ORDER BY ${order} LIMIT @limit OFFSET @offset`)
    .all({ ...params, limit, offset });
  const total = db.prepare(`SELECT COUNT(*) AS c FROM leads l ${where}`).get(params).c;
  return { rows: rows.map(rowToLead), total };
}

// Real per-status counts for the summary row, within the caller's scope.
export function countLeadsByStatus(scopeUserId = null) {
  const where = scopeUserId ? "WHERE assigned_to = @scopeUserId OR assigned_to IS NULL" : "";
  const rows = db
    .prepare(`SELECT status, COUNT(*) AS c FROM leads ${where} GROUP BY status`)
    .all(scopeUserId ? { scopeUserId } : {});
  const counts = Object.fromEntries(LEAD_STATUSES.map((s) => [s, 0]));
  for (const r of rows) counts[r.status] = r.c;
  return counts;
}

export function updateLeadStatusRow(id, status) {
  db.prepare("UPDATE leads SET status = ?, updated_at = datetime('now') WHERE id = ?").run(status, id);
}

// An explicit "mark contacted" event: status CONTACTED + last_contacted_at.
export function markLeadContactedRow(id) {
  db.prepare(
    "UPDATE leads SET status = 'CONTACTED', last_contacted_at = datetime('now'), updated_at = datetime('now') WHERE id = ?"
  ).run(id);
}

export function assignLeadRow(id, userId) {
  db.prepare("UPDATE leads SET assigned_to = ?, updated_at = datetime('now') WHERE id = ?").run(userId, id);
}

export function addLeadNoteRow({ leadId, authorUserId, note }) {
  const id = crypto.randomUUID();
  db.prepare("INSERT INTO lead_notes (id, lead_id, author_user_id, note) VALUES (?, ?, ?, ?)").run(
    id,
    leadId,
    authorUserId,
    note
  );
  db.prepare("UPDATE leads SET updated_at = datetime('now') WHERE id = ?").run(leadId);
  return id;
}

export function listLeadNotes(leadId) {
  return db
    .prepare(
      `SELECT n.id, n.note, n.created_at, n.author_user_id, u.name AS author_name
       FROM lead_notes n LEFT JOIN users u ON u.id = n.author_user_id
       WHERE n.lead_id = ? ORDER BY n.created_at DESC, n.rowid DESC`
    )
    .all(leadId)
    .map((r) => ({
      id: r.id,
      note: r.note,
      createdAt: r.created_at,
      authorId: r.author_user_id,
      authorName: r.author_name ?? "Former user",
    }));
}

// Active users of the given roles — the only people a lead may be assigned to.
export function listActiveUsersWithRoles(roles) {
  const placeholders = roles.map(() => "?").join(", ");
  return db
    .prepare(
      `SELECT id, name, role FROM users WHERE status = 'ACTIVE' AND role IN (${placeholders}) ORDER BY name COLLATE NOCASE ASC`
    )
    .all(...roles);
}

export function getUserNameRole(userId) {
  if (!userId || typeof userId !== "string") return null;
  return db.prepare("SELECT id, name, role, status FROM users WHERE id = ?").get(userId) ?? null;
}

// Distinct courses/modes actually present on leads — drives filter options
// so no filter is offered for data that doesn't exist.
export function listDistinctLeadValues(column, scopeUserId = null) {
  if (!["course_slug", "mode"].includes(column)) throw new Error("invalid column");
  const scope = scopeUserId ? "AND (assigned_to = @scopeUserId OR assigned_to IS NULL)" : "";
  return db
    .prepare(`SELECT DISTINCT ${column} AS v FROM leads WHERE ${column} IS NOT NULL ${scope} ORDER BY v`)
    .all(scopeUserId ? { scopeUserId } : {})
    .map((r) => r.v);
}

// Lead -> student conversion (Phase 10.3), atomically: the student account
// (when one is needed), the lead's CONVERTED status and the conversion
// reference are written together or not at all. Re-checks inside the
// transaction that the lead isn't already converted (idempotent under
// double-clicks / races) and that the email wasn't taken in the meantime.
// `newStudent` is { name, email, phone, passwordHash } when no account
// exists; `existingUserId` when one does (already validated as an ACTIVE
// STUDENT by the caller).
export function convertLeadTx({ leadId, existingUserId, newStudent }) {
  const run = db.transaction(() => {
    const lead = db.prepare('SELECT converted_user_id FROM leads WHERE id = ?').get(leadId);
    if (!lead) return { ok: false, reason: 'not_found' };
    if (lead.converted_user_id) return { ok: false, reason: 'already_converted' };

    let userId = existingUserId;
    let created = false;
    if (!userId) {
      if (findUserByEmailInternal(newStudent.email)) return { ok: false, reason: 'email_taken' };
      userId = createUser({ ...newStudent, role: 'STUDENT' }).id;
      created = true;
    }
    db.prepare(
      "UPDATE leads SET status = 'CONVERTED', converted_user_id = ?, converted_at = datetime('now'), updated_at = datetime('now') WHERE id = ?"
    ).run(userId, leadId);
    return { ok: true, userId, created };
  });
  return run();
}
