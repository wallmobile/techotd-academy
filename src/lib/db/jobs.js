import crypto from "node:crypto";
import { db } from "@/lib/db/client";
import { writeAudit } from "@/lib/db/fees";

// Job + application persistence (Phase 10.6). Parameterized SQL only (the
// sole interpolation is a fixed sort whitelist). Authorization and input
// validation live one layer up (src/lib/placement/*). Student-facing
// queries select an explicit column list that never includes staff_notes or
// placement fields other than the confirmed flag.

const todayIso = () => new Date().toISOString().slice(0, 10);

function rowToJob(r) {
  if (!r) return null;
  return {
    id: r.id,
    title: r.title,
    companyName: r.company_name,
    description: r.description,
    location: r.location,
    employmentType: r.employment_type,
    workMode: r.work_mode,
    experience: r.experience,
    skills: r.skills,
    applyDeadline: r.apply_deadline,
    status: r.status,
    publishedAt: r.published_at,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
    applicationCount: r.application_count ?? undefined,
  };
}

// Open = published and the deadline (if any) has not passed.
export function isJobOpen(job, today = todayIso()) {
  return job.status === "PUBLISHED" && (!job.applyDeadline || job.applyDeadline >= today);
}

function likePattern(q) {
  return `%${q.replace(/[\\%_]/g, (c) => `\\${c}`)}%`;
}

// --- jobs ------------------------------------------------------------------
export async function getJobById(id) {
  if (!id || typeof id !== "string") return null;
  return rowToJob(await db.get("SELECT * FROM jobs WHERE id = ?", [id]));
}

export async function createJobRow(f, actorUserId) {
  const id = crypto.randomUUID();
  await db.tx(async (t) => {
    await t.run(
      `INSERT INTO jobs (id, title, company_name, description, location, employment_type, work_mode, experience, skills, apply_deadline, status, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'DRAFT', ?)`,
      [id, f.title, f.companyName, f.description, f.location || null, f.employmentType, f.workMode, f.experience || null, f.skills || null, f.applyDeadline || null, actorUserId]
    );
    await writeAudit({ actorUserId, action: "JOB_CREATED", entityType: "job", entityId: id, detail: { title: f.title, companyName: f.companyName } }, t);
  });
  return id;
}

export async function updateJobRow(id, f, actorUserId) {
  return await db.tx(async (t) => {
    const res = await t.run(
      `UPDATE jobs SET title = ?, company_name = ?, description = ?, location = ?, employment_type = ?, work_mode = ?,
         experience = ?, skills = ?, apply_deadline = ?, updated_at = app_now() WHERE id = ?`,
      [f.title, f.companyName, f.description, f.location || null, f.employmentType, f.workMode, f.experience || null, f.skills || null, f.applyDeadline || null, id]
    );
    if (res.changes !== 1) return false;
    await writeAudit({ actorUserId, action: "JOB_UPDATED", entityType: "job", entityId: id, detail: { title: f.title } }, t);
    return true;
  });
}

export async function setJobStatusRow(id, status, actorUserId) {
  return await db.tx(async (t) => {
    const job = await t.get("SELECT status, published_at FROM jobs WHERE id = ? FOR UPDATE", [id]);
    if (!job) return false;
    await t.run(
      `UPDATE jobs SET status = ?, published_at = COALESCE(published_at, CASE WHEN ?::text = 'PUBLISHED' THEN app_now() END),
         updated_at = app_now() WHERE id = ?`,
      [status, status, id]
    );
    await writeAudit({ actorUserId, action: "JOB_STATUS_CHANGED", entityType: "job", entityId: id, detail: { from: job.status, to: status } }, t);
    return true;
  });
}

const ADMIN_SORTS = {
  newest: "j.created_at DESC, j.id ASC",
  oldest: "j.created_at ASC, j.id ASC",
  title: "lower(j.title) ASC, j.id ASC",
};
export const JOB_SORT_KEYS = Object.keys(ADMIN_SORTS);

export async function listJobsForStaff({ q = "", status = "", sort = "newest", limit = 20, offset = 0 }) {
  const clauses = [];
  const params = {};
  if (status) {
    clauses.push("j.status = @status");
    params.status = status;
  }
  if (q) {
    clauses.push("(j.title ILIKE @q ESCAPE '\\' OR j.company_name ILIKE @q ESCAPE '\\')");
    params.q = likePattern(q);
  }
  const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
  const rows = await db.all(
    `SELECT j.*, (SELECT COUNT(*) FROM job_applications a WHERE a.job_id = j.id) AS application_count
     FROM jobs j ${where} ORDER BY ${ADMIN_SORTS[sort] || ADMIN_SORTS.newest} LIMIT @limit OFFSET @offset`,
    { ...params, limit, offset }
  );
  const total = (await db.get(`SELECT COUNT(*) AS c FROM jobs j ${where}`, params)).c;
  return { rows: rows.map(rowToJob), total };
}

// Student board: only OPEN jobs.
export async function listOpenJobs({ q = "", employmentType = "", workMode = "", limit = 10, offset = 0 }) {
  const clauses = ["j.status = 'PUBLISHED'", "(j.apply_deadline IS NULL OR j.apply_deadline >= @today)"];
  const params = { today: todayIso() };
  if (employmentType) {
    clauses.push("j.employment_type = @employmentType");
    params.employmentType = employmentType;
  }
  if (workMode) {
    clauses.push("j.work_mode = @workMode");
    params.workMode = workMode;
  }
  if (q) {
    clauses.push("(j.title ILIKE @q ESCAPE '\\' OR j.company_name ILIKE @q ESCAPE '\\' OR j.skills ILIKE @q ESCAPE '\\')");
    params.q = likePattern(q);
  }
  const where = `WHERE ${clauses.join(" AND ")}`;
  const rows = await db.all(`SELECT j.* FROM jobs j ${where} ORDER BY j.published_at DESC NULLS LAST, j.id ASC LIMIT @limit OFFSET @offset`, { ...params, limit, offset });
  const total = (await db.get(`SELECT COUNT(*) AS c FROM jobs j ${where}`, params)).c;
  return { rows: rows.map(rowToJob), total };
}

export async function placementSummary() {
  const today = todayIso();
  const jobs = await db.get(
    `SELECT COUNT(*) AS total,
       COUNT(*) FILTER (WHERE status = 'PUBLISHED') AS published,
       COUNT(*) FILTER (WHERE status = 'PUBLISHED' AND (apply_deadline IS NULL OR apply_deadline >= ?)) AS open
     FROM jobs`,
    [today]
  );
  const apps = await db.get(
    `SELECT COUNT(*) AS total,
       COUNT(*) FILTER (WHERE status = 'UNDER_REVIEW') AS under_review,
       COUNT(*) FILTER (WHERE status = 'SHORTLISTED') AS shortlisted,
       COUNT(*) FILTER (WHERE status = 'INTERVIEW') AS interview,
       COUNT(*) FILTER (WHERE status = 'SELECTED') AS selected,
       COUNT(*) FILTER (WHERE placement_confirmed_at IS NOT NULL) AS verified
     FROM job_applications`
  );
  return {
    jobsTotal: jobs.total,
    jobsPublished: jobs.published,
    jobsOpen: jobs.open,
    applicationsTotal: apps.total,
    underReview: apps.under_review,
    shortlisted: apps.shortlisted,
    interview: apps.interview,
    selected: apps.selected,
    verifiedPlacements: apps.verified,
  };
}

// --- eligibility ---------------------------------------------------------------
// A student may apply if their account is an ACTIVE student with at least one
// ACTIVE or COMPLETED batch enrollment (i.e. a real learner of the academy).
export async function studentCanApply(userId) {
  const row = await db.get(
    `SELECT u.status AS user_status,
       EXISTS (SELECT 1 FROM batch_enrollments be JOIN student_profiles sp ON sp.id = be.student_id
               WHERE sp.user_id = u.id AND be.status IN ('ACTIVE','COMPLETED')) AS enrolled
     FROM users u WHERE u.id = ? AND u.role = 'STUDENT'`,
    [userId]
  );
  return Boolean(row && row.user_status === "ACTIVE" && row.enrolled);
}

// --- applications --------------------------------------------------------------
const STUDENT_APP_COLUMNS = `a.id, a.job_id, a.status, a.cover_message, a.applied_at, a.updated_at,
  (a.placement_confirmed_at IS NOT NULL) AS placed`;

function rowToStudentApplication(r) {
  return {
    id: r.id,
    jobId: r.job_id,
    status: r.status,
    coverMessage: r.cover_message,
    appliedAt: r.applied_at,
    updatedAt: r.updated_at,
    placementConfirmed: Boolean(r.placed),
    jobTitle: r.title ?? null,
    companyName: r.company_name ?? null,
  };
}

export async function getStudentApplicationForJob(userId, jobId) {
  const r = await db.get(`SELECT ${STUDENT_APP_COLUMNS} FROM job_applications a WHERE a.student_user_id = ? AND a.job_id = ?`, [userId, jobId]);
  return r ? rowToStudentApplication(r) : null;
}

export async function listStudentApplications(userId) {
  const rows = await db.all(
    `SELECT ${STUDENT_APP_COLUMNS}, j.title, j.company_name FROM job_applications a JOIN jobs j ON j.id = a.job_id
     WHERE a.student_user_id = ? ORDER BY a.applied_at DESC, a.id ASC`,
    [userId]
  );
  return rows.map(rowToStudentApplication);
}

export async function listAppliedJobIds(userId) {
  return (await db.all("SELECT job_id FROM job_applications WHERE student_user_id = ?", [userId])).map((r) => r.job_id);
}

export async function applyTx({ jobId, userId, coverMessage }) {
  return await db.tx(async (t) => {
    // One application per (job, student): two simultaneous submits serialize here.
    await t.lock(`apply:${jobId}:${userId}`);
    const job = await t.get("SELECT status, apply_deadline FROM jobs WHERE id = ?", [jobId]);
    if (!job) return { ok: false, reason: "job_not_found" };
    if (job.status !== "PUBLISHED") return { ok: false, reason: "job_closed" };
    if (job.apply_deadline && job.apply_deadline < todayIso()) return { ok: false, reason: "deadline_passed" };
    if (await t.get("SELECT 1 AS one FROM job_applications WHERE job_id = ? AND student_user_id = ?", [jobId, userId])) {
      return { ok: false, reason: "already_applied" };
    }
    const id = crypto.randomUUID();
    await t.run("INSERT INTO job_applications (id, job_id, student_user_id, cover_message) VALUES (?, ?, ?, ?)", [id, jobId, userId, coverMessage || null]);
    await writeAudit({ actorUserId: userId, action: "APPLICATION_SUBMITTED", entityType: "job_application", entityId: id, detail: { jobId } }, t);
    return { ok: true, applicationId: id };
  });
}

export async function withdrawTx({ applicationId, userId, allowed }) {
  return await db.tx(async (t) => {
    const a = await t.get("SELECT status, student_user_id FROM job_applications WHERE id = ? FOR UPDATE", [applicationId]);
    if (!a || a.student_user_id !== userId) return { ok: false, reason: "not_found" };
    if (!allowed.includes(a.status)) return { ok: false, reason: "cannot_withdraw" };
    await t.run("UPDATE job_applications SET status = 'WITHDRAWN', updated_at = app_now() WHERE id = ?", [applicationId]);
    await writeAudit({ actorUserId: userId, action: "APPLICATION_WITHDRAWN", entityType: "job_application", entityId: applicationId, detail: { from: a.status } }, t);
    return { ok: true };
  });
}

// Staff view: includes the applicant's profile fields and internal notes.
export async function listApplicationsForJob(jobId) {
  const rows = await db.all(
    `SELECT a.id, a.status, a.cover_message, a.staff_notes, a.applied_at, a.updated_at, a.placement_confirmed_at, a.placement_note,
            u.id AS user_id, u.name, u.email, u.phone AS user_phone, sp.city, sp.bio, sp.phone AS profile_phone
     FROM job_applications a
     JOIN users u ON u.id = a.student_user_id
     LEFT JOIN student_profiles sp ON sp.user_id = u.id
     WHERE a.job_id = ? ORDER BY a.applied_at DESC, a.id ASC`,
    [jobId]
  );
  return rows.map((r) => ({
    id: r.id,
    status: r.status,
    coverMessage: r.cover_message,
    staffNotes: r.staff_notes,
    appliedAt: r.applied_at,
    updatedAt: r.updated_at,
    placementConfirmedAt: r.placement_confirmed_at,
    placementNote: r.placement_note,
    studentUserId: r.user_id,
    name: r.name,
    email: r.email,
    phone: r.user_phone || r.profile_phone || null,
    city: r.city,
    bio: r.bio,
  }));
}

export async function getApplicationRow(id) {
  if (!id || typeof id !== "string") return null;
  return (await db.get("SELECT * FROM job_applications WHERE id = ?", [id])) ?? null;
}

export async function setApplicationStatusTx({ applicationId, status, notes, actorUserId, transitions }) {
  return await db.tx(async (t) => {
    // Row lock: two staff moving the same application cannot both pass the transition check.
    const a = await t.get("SELECT status, job_id FROM job_applications WHERE id = ? FOR UPDATE", [applicationId]);
    if (!a) return { ok: false, reason: "not_found" };
    if (status !== a.status && !(transitions[a.status] || []).includes(status)) return { ok: false, reason: "transition_invalid", from: a.status };
    await t.run("UPDATE job_applications SET status = ?, staff_notes = COALESCE(?, staff_notes), updated_at = app_now() WHERE id = ?", [
      status,
      notes ?? null,
      applicationId,
    ]);
    // Leaving SELECTED invalidates any placement confirmation made for it.
    if (status !== "SELECTED") {
      await t.run(
        "UPDATE job_applications SET placement_confirmed_at = NULL, placement_confirmed_by = NULL, placement_note = NULL WHERE id = ? AND placement_confirmed_at IS NOT NULL",
        [applicationId]
      );
    }
    if (status !== a.status) {
      await writeAudit(
        {
          actorUserId,
          action: "APPLICATION_STATUS_CHANGED",
          entityType: "job_application",
          entityId: applicationId,
          detail: { jobId: a.job_id, from: a.status, to: status },
        },
        t
      );
    }
    return { ok: true, jobId: a.job_id };
  });
}

export async function confirmPlacementTx({ applicationId, note, actorUserId }) {
  return await db.tx(async (t) => {
    const a = await t.get("SELECT status, job_id, placement_confirmed_at FROM job_applications WHERE id = ? FOR UPDATE", [applicationId]);
    if (!a) return { ok: false, reason: "not_found" };
    if (a.status !== "SELECTED") return { ok: false, reason: "not_selected" };
    if (a.placement_confirmed_at) return { ok: false, reason: "already_confirmed" };
    await t.run(
      `UPDATE job_applications SET placement_confirmed_at = app_now(), placement_confirmed_by = ?, placement_note = ?,
         updated_at = app_now() WHERE id = ?`,
      [actorUserId, note || null, applicationId]
    );
    await writeAudit({ actorUserId, action: "PLACEMENT_CONFIRMED", entityType: "job_application", entityId: applicationId, detail: { jobId: a.job_id } }, t);
    return { ok: true, jobId: a.job_id };
  });
}

// Change history for one job (status changes, edits) from audit_log.
export async function listAuditForEntity(entityType, entityId) {
  const rows = await db.all(
    `SELECT a.action, a.detail, a.created_at, u.name AS actor_name FROM audit_log a
     LEFT JOIN users u ON u.id = a.actor_user_id
     WHERE a.entity_type = ? AND a.entity_id = ? ORDER BY a.created_at DESC, a.seq DESC`,
    [entityType, entityId]
  );
  return rows.map((r) => ({ action: r.action, detail: r.detail ? JSON.parse(r.detail) : null, at: r.created_at, actorName: r.actor_name }));
}
