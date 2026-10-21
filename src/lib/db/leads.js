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
  name: "lower(l.name) ASC, l.id ASC",
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

export async function createLead(input) {
  const id = crypto.randomUUID();
  await db.run(
    `INSERT INTO leads
       (id, name, phone, email, organization, city, experience_level, course_slug, mode, batch_id,
        message, source, origin, consent, status)
     VALUES
       (@id, @name, @phone, @email, @organization, @city, @experienceLevel, @courseSlug, @mode, @batchId,
        @message, @source, @origin, @consent, 'NEW')`,
    {
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
    }
  );
  return await getLeadById(id);
}

// An identical submission (same contact + same request) created within
// `seconds` — i.e. an accidental double-click/refresh, not a genuine
// repeat enquiry. Returns the existing lead or null.
export async function findRecentDuplicateLead(input, seconds = 60) {
  const row = await db.get(
    `${LEAD_SELECT}
     WHERE l.email = @email AND l.phone = @phone AND l.source = @source
       AND l.course_slug IS NOT DISTINCT FROM @courseSlug AND l.mode IS NOT DISTINCT FROM @mode
       AND l.batch_id IS NOT DISTINCT FROM @batchId AND l.message IS NOT DISTINCT FROM @message
       AND l.created_at >= app_now(@window)
     ORDER BY l.created_at DESC LIMIT 1`,
    {
      email: input.email,
      phone: input.phone,
      source: input.source,
      courseSlug: input.courseSlug ?? null,
      mode: input.mode ?? null,
      batchId: input.batchId ?? null,
      message: input.message ?? null,
      window: `-${Math.floor(seconds)} seconds`,
    }
  );
  return rowToLead(row);
}

export async function getLeadById(id) {
  if (!id || typeof id !== "string") return null;
  return rowToLead(await db.get(`${LEAD_SELECT} WHERE l.id = ?`, [id]));
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
    clauses.push("(l.name ILIKE @q ESCAPE '\\' OR l.email ILIKE @q ESCAPE '\\' OR l.phone ILIKE @q ESCAPE '\\')");
    params.q = likePattern(q);
  }
  return { where: clauses.length ? `WHERE ${clauses.join(" AND ")}` : "", params };
}

export async function listLeads({ sort = "newest", limit = 20, offset = 0, ...filters }) {
  const { where, params } = buildWhere(filters);
  const order = SORTS[sort] || SORTS.newest;
  const rows = await db.all(`${LEAD_SELECT} ${where} ORDER BY ${order} LIMIT @limit OFFSET @offset`, { ...params, limit, offset });
  const total = (await db.get(`SELECT COUNT(*) AS c FROM leads l ${where}`, params)).c;
  return { rows: rows.map(rowToLead), total };
}

// Real per-status counts for the summary row, within the caller's scope.
export async function countLeadsByStatus(scopeUserId = null) {
  const where = scopeUserId ? "WHERE assigned_to = @scopeUserId OR assigned_to IS NULL" : "";
  const rows = await db.all(`SELECT status, COUNT(*) AS c FROM leads ${where} GROUP BY status`, scopeUserId ? { scopeUserId } : {});
  const counts = Object.fromEntries(LEAD_STATUSES.map((s) => [s, 0]));
  for (const r of rows) counts[r.status] = r.c;
  return counts;
}

export async function updateLeadStatusRow(id, status) {
  await db.run("UPDATE leads SET status = ?, updated_at = app_now() WHERE id = ?", [status, id]);
}

// An explicit "mark contacted" event: status CONTACTED + last_contacted_at.
export async function markLeadContactedRow(id) {
  await db.run("UPDATE leads SET status = 'CONTACTED', last_contacted_at = app_now(), updated_at = app_now() WHERE id = ?", [id]);
}

export async function assignLeadRow(id, userId) {
  await db.run("UPDATE leads SET assigned_to = ?, updated_at = app_now() WHERE id = ?", [userId, id]);
}

export async function addLeadNoteRow({ leadId, authorUserId, note }) {
  const id = crypto.randomUUID();
  await db.tx(async (t) => {
    await t.run("INSERT INTO lead_notes (id, lead_id, author_user_id, note) VALUES (?, ?, ?, ?)", [id, leadId, authorUserId, note]);
    await t.run("UPDATE leads SET updated_at = app_now() WHERE id = ?", [leadId]);
  });
  return id;
}

export async function listLeadNotes(leadId) {
  const rows = await db.all(
    `SELECT n.id, n.note, n.created_at, n.author_user_id, u.name AS author_name
     FROM lead_notes n LEFT JOIN users u ON u.id = n.author_user_id
     WHERE n.lead_id = ? ORDER BY n.created_at DESC, n.seq DESC`,
    [leadId]
  );
  return rows.map((r) => ({
    id: r.id,
    note: r.note,
    createdAt: r.created_at,
    authorId: r.author_user_id,
    authorName: r.author_name ?? "Former user",
  }));
}

// Active users of the given roles — the only people a lead may be assigned to.
export async function listActiveUsersWithRoles(roles) {
  const placeholders = roles.map(() => "?").join(", ");
  return await db.all(`SELECT id, name, role FROM users WHERE status = 'ACTIVE' AND role IN (${placeholders}) ORDER BY lower(name) ASC, id ASC`, roles);
}

export async function getUserNameRole(userId) {
  if (!userId || typeof userId !== "string") return null;
  return (await db.get("SELECT id, name, role, status FROM users WHERE id = ?", [userId])) ?? null;
}

// Distinct courses/modes actually present on leads — drives filter options
// so no filter is offered for data that doesn't exist.
export async function listDistinctLeadValues(column, scopeUserId = null) {
  if (!["course_slug", "mode"].includes(column)) throw new Error("invalid column");
  const scope = scopeUserId ? "AND (assigned_to = @scopeUserId OR assigned_to IS NULL)" : "";
  const rows = await db.all(`SELECT DISTINCT ${column} AS v FROM leads WHERE ${column} IS NOT NULL ${scope} ORDER BY v`, scopeUserId ? { scopeUserId } : {});
  return rows.map((r) => r.v);
}

// Lead -> student conversion (Phase 10.3), atomically: the student account
// (when one is needed), the lead's CONVERTED status and the conversion
// reference are written together or not at all. The lead row is locked
// (FOR UPDATE) so a double-click / race converts it only once, and the
// email is re-checked inside the transaction (the UNIQUE constraint on
// users.email is the final backstop: a lost race rolls back and reports
// email_taken).
// `newStudent` is { name, email, phone, passwordHash } when no account
// exists; `existingUserId` when one does (already validated as an ACTIVE
// STUDENT by the caller).
export async function convertLeadTx({ leadId, existingUserId, newStudent }) {
  try {
    return await db.tx(async (t) => {
      const lead = await t.get("SELECT converted_user_id FROM leads WHERE id = ? FOR UPDATE", [leadId]);
      if (!lead) return { ok: false, reason: "not_found" };
      if (lead.converted_user_id) return { ok: false, reason: "already_converted" };

      let userId = existingUserId;
      let created = false;
      if (!userId) {
        if (await findUserByEmailInternal(newStudent.email, t)) return { ok: false, reason: "email_taken" };
        userId = (await createUser({ ...newStudent, role: "STUDENT" }, t)).id;
        created = true;
      }
      await t.run("UPDATE leads SET status = 'CONVERTED', converted_user_id = ?, converted_at = app_now(), updated_at = app_now() WHERE id = ?", [userId, leadId]);
      return { ok: true, userId, created };
    });
  } catch (error) {
    if (error?.code === "23505") return { ok: false, reason: "email_taken" };
    throw error;
  }
}
