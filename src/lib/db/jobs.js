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
export function getJobById(id) {
  if (!id || typeof id !== "string") return null;
  return rowToJob(db.prepare("SELECT * FROM jobs WHERE id = ?").get(id));
}

export function createJobRow(f, actorUserId) {
  const id = crypto.randomUUID();
  const run = db.transaction(() => {
    db.prepare(
      `INSERT INTO jobs (id, title, company_name, description, location, employment_type, work_mode, experience, skills, apply_deadline, status, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'DRAFT', ?)`
    ).run(id, f.title, f.companyName, f.description, f.location || null, f.employmentType, f.workMode, f.experience || null, f.skills || null, f.applyDeadline || null, actorUserId);
    writeAudit({ actorUserId, action: "JOB_CREATED", entityType: "job", entityId: id, detail: { title: f.title, companyName: f.companyName } });
  });
  run();
  return id;
}

export function updateJobRow(id, f, actorUserId) {
  const run = db.transaction(() => {
    const res = db
      .prepare(
        `UPDATE jobs SET title = ?, company_name = ?, description = ?, location = ?, employment_type = ?, work_mode = ?,
           experience = ?, skills = ?, apply_deadline = ?, updated_at = datetime('now') WHERE id = ?`
      )
      .run(f.title, f.companyName, f.description, f.location || null, f.employmentType, f.workMode, f.experience || null, f.skills || null, f.applyDeadline || null, id);
    if (res.changes !== 1) return false;
    writeAudit({ actorUserId, action: "JOB_UPDATED", entityType: "job", entityId: id, detail: { title: f.title } });
    return true;
  });
  return run();
}

export function setJobStatusRow(id, status, actorUserId) {
  const run = db.transaction(() => {
    const job = db.prepare("SELECT status, published_at FROM jobs WHERE id = ?").get(id);
    if (!job) return false;
    db.prepare(
      `UPDATE jobs SET status = ?, published_at = COALESCE(published_at, CASE WHEN ? = 'PUBLISHED' THEN datetime('now') END),
         updated_at = datetime('now') WHERE id = ?`
    ).run(status, status, id);
    writeAudit({ actorUserId, action: "JOB_STATUS_CHANGED", entityType: "job", entityId: id, detail: { from: job.status, to: status } });
    return true;
  });
  return run();
}

const ADMIN_SORTS = {
  newest: "j.created_at DESC, j.id ASC",
  oldest: "j.created_at ASC, j.id ASC",
  title: "j.title COLLATE NOCASE ASC, j.id ASC",
};
export const JOB_SORT_KEYS = Object.keys(ADMIN_SORTS);

export function listJobsForStaff({ q = "", status = "", sort = "newest", limit = 20, offset = 0 }) {
  const clauses = [];
  const params = {};
  if (status) {
    clauses.push("j.status = @status");
    params.status = status;
  }
  if (q) {
    clauses.push("(j.title LIKE @q ESCAPE '\\' OR j.company_name LIKE @q ESCAPE '\\')");
    params.q = likePattern(q);
  }
  const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
  const rows = db
    .prepare(
      `SELECT j.*, (SELECT COUNT(*) FROM job_applications a WHERE a.job_id = j.id) AS application_count
       FROM jobs j ${where} ORDER BY ${ADMIN_SORTS[sort] || ADMIN_SORTS.newest} LIMIT @limit OFFSET @offset`
    )
    .all({ ...params, limit, offset });
  const total = db.prepare(`SELECT COUNT(*) AS c FROM jobs j ${where}`).get(params).c;
  return { rows: rows.map(rowToJob), total };
}

// Student board: only OPEN jobs.
export function listOpenJobs({ q = "", employmentType = "", workMode = "", limit = 10, offset = 0 }) {
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
    clauses.push("(j.title LIKE @q ESCAPE '\\' OR j.company_name LIKE @q ESCAPE '\\' OR j.skills LIKE @q ESCAPE '\\')");
    params.q = likePattern(q);
  }
  const where = `WHERE ${clauses.join(" AND ")}`;
  const rows = db
    .prepare(`SELECT j.* FROM jobs j ${where} ORDER BY j.published_at DESC, j.id ASC LIMIT @limit OFFSET @offset`)
    .all({ ...params, limit, offset });
  const total = db.prepare(`SELECT COUNT(*) AS c FROM jobs j ${where}`).get(params).c;
  return { rows: rows.map(rowToJob), total };
}

export function placementSummary() {
  const today = todayIso();
  const jobs = db
    .prepare(
      `SELECT COUNT(*) AS total,
         COALESCE(SUM(status = 'PUBLISHED'), 0) AS published,
         COALESCE(SUM(status = 'PUBLISHED' AND (apply_deadline IS NULL OR apply_deadline >= ?)), 0) AS open
       FROM jobs`
    )
    .get(today);
  const apps = db
    .prepare(
      `SELECT COUNT(*) AS total,
         COALESCE(SUM(status = 'UNDER_REVIEW'), 0) AS under_review,
         COALESCE(SUM(status = 'SHORTLISTED'), 0) AS shortlisted,
         COALESCE(SUM(status = 'INTERVIEW'), 0) AS interview,
         COALESCE(SUM(status = 'SELECTED'), 0) AS selected,
         COALESCE(SUM(placement_confirmed_at IS NOT NULL), 0) AS verified
       FROM job_applications`
    )
    .get();
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
export function studentCanApply(userId) {
  const row = db
    .prepare(
      `SELECT u.status AS user_status,
         EXISTS (SELECT 1 FROM batch_enrollments be JOIN student_profiles sp ON sp.id = be.student_id
                 WHERE sp.user_id = u.id AND be.status IN ('ACTIVE','COMPLETED')) AS enrolled
       FROM users u WHERE u.id = ? AND u.role = 'STUDENT'`
    )
    .get(userId);
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

export function getStudentApplicationForJob(userId, jobId) {
  const r = db
    .prepare(`SELECT ${STUDENT_APP_COLUMNS} FROM job_applications a WHERE a.student_user_id = ? AND a.job_id = ?`)
    .get(userId, jobId);
  return r ? rowToStudentApplication(r) : null;
}

export function listStudentApplications(userId) {
  return db
    .prepare(
      `SELECT ${STUDENT_APP_COLUMNS}, j.title, j.company_name FROM job_applications a JOIN jobs j ON j.id = a.job_id
       WHERE a.student_user_id = ? ORDER BY a.applied_at DESC, a.id ASC`
    )
    .all(userId)
    .map(rowToStudentApplication);
}

export function listAppliedJobIds(userId) {
  return db.prepare("SELECT job_id FROM job_applications WHERE student_user_id = ?").all(userId).map((r) => r.job_id);
}

export function applyTx({ jobId, userId, coverMessage }) {
  const run = db.transaction(() => {
    const job = db.prepare("SELECT status, apply_deadline FROM jobs WHERE id = ?").get(jobId);
    if (!job) return { ok: false, reason: "job_not_found" };
    if (job.status !== "PUBLISHED") return { ok: false, reason: "job_closed" };
    if (job.apply_deadline && job.apply_deadline < todayIso()) return { ok: false, reason: "deadline_passed" };
    if (db.prepare("SELECT 1 FROM job_applications WHERE job_id = ? AND student_user_id = ?").get(jobId, userId)) {
      return { ok: false, reason: "already_applied" };
    }
    const id = crypto.randomUUID();
    db.prepare("INSERT INTO job_applications (id, job_id, student_user_id, cover_message) VALUES (?, ?, ?, ?)").run(
      id, jobId, userId, coverMessage || null
    );
    writeAudit({ actorUserId: userId, action: "APPLICATION_SUBMITTED", entityType: "job_application", entityId: id, detail: { jobId } });
    return { ok: true, applicationId: id };
  });
  return run.immediate();
}

export function withdrawTx({ applicationId, userId, allowed }) {
  const run = db.transaction(() => {
    const a = db.prepare("SELECT status, student_user_id FROM job_applications WHERE id = ?").get(applicationId);
    if (!a || a.student_user_id !== userId) return { ok: false, reason: "not_found" };
    if (!allowed.includes(a.status)) return { ok: false, reason: "cannot_withdraw" };
    db.prepare("UPDATE job_applications SET status = 'WITHDRAWN', updated_at = datetime('now') WHERE id = ?").run(applicationId);
    writeAudit({ actorUserId: userId, action: "APPLICATION_WITHDRAWN", entityType: "job_application", entityId: applicationId, detail: { from: a.status } });
    return { ok: true };
  });
  return run.immediate();
}

// Staff view: includes the applicant's profile fields and internal notes.
export function listApplicationsForJob(jobId) {
  return db
    .prepare(
      `SELECT a.id, a.status, a.cover_message, a.staff_notes, a.applied_at, a.updated_at, a.placement_confirmed_at, a.placement_note,
              u.id AS user_id, u.name, u.email, u.phone AS user_phone, sp.city, sp.bio, sp.phone AS profile_phone
       FROM job_applications a
       JOIN users u ON u.id = a.student_user_id
       LEFT JOIN student_profiles sp ON sp.user_id = u.id
       WHERE a.job_id = ? ORDER BY a.applied_at DESC, a.id ASC`
    )
    .all(jobId)
    .map((r) => ({
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

export function getApplicationRow(id) {
  if (!id || typeof id !== "string") return null;
  return db.prepare("SELECT * FROM job_applications WHERE id = ?").get(id) ?? null;
}

export function setApplicationStatusTx({ applicationId, status, notes, actorUserId, transitions }) {
  const run = db.transaction(() => {
    const a = db.prepare("SELECT status, job_id FROM job_applications WHERE id = ?").get(applicationId);
    if (!a) return { ok: false, reason: "not_found" };
    if (status !== a.status && !(transitions[a.status] || []).includes(status)) return { ok: false, reason: "transition_invalid", from: a.status };
    db.prepare(
      "UPDATE job_applications SET status = ?, staff_notes = COALESCE(?, staff_notes), updated_at = datetime('now') WHERE id = ?"
    ).run(status, notes ?? null, applicationId);
    // Leaving SELECTED invalidates any placement confirmation made for it.
    if (status !== "SELECTED") {
      db.prepare(
        "UPDATE job_applications SET placement_confirmed_at = NULL, placement_confirmed_by = NULL, placement_note = NULL WHERE id = ? AND placement_confirmed_at IS NOT NULL"
      ).run(applicationId);
    }
    if (status !== a.status) {
      writeAudit({
        actorUserId,
        action: "APPLICATION_STATUS_CHANGED",
        entityType: "job_application",
        entityId: applicationId,
        detail: { jobId: a.job_id, from: a.status, to: status },
      });
    }
    return { ok: true, jobId: a.job_id };
  });
  return run.immediate();
}

export function confirmPlacementTx({ applicationId, note, actorUserId }) {
  const run = db.transaction(() => {
    const a = db.prepare("SELECT status, job_id, placement_confirmed_at FROM job_applications WHERE id = ?").get(applicationId);
    if (!a) return { ok: false, reason: "not_found" };
    if (a.status !== "SELECTED") return { ok: false, reason: "not_selected" };
    if (a.placement_confirmed_at) return { ok: false, reason: "already_confirmed" };
    db.prepare(
      `UPDATE job_applications SET placement_confirmed_at = datetime('now'), placement_confirmed_by = ?, placement_note = ?,
         updated_at = datetime('now') WHERE id = ?`
    ).run(actorUserId, note || null, applicationId);
    writeAudit({ actorUserId, action: "PLACEMENT_CONFIRMED", entityType: "job_application", entityId: applicationId, detail: { jobId: a.job_id } });
    return { ok: true, jobId: a.job_id };
  });
  return run.immediate();
}

// Change history for one job (status changes, edits) from audit_log.
export function listAuditForEntity(entityType, entityId) {
  return db
    .prepare(
      `SELECT a.action, a.detail, a.created_at, u.name AS actor_name FROM audit_log a
       LEFT JOIN users u ON u.id = a.actor_user_id
       WHERE a.entity_type = ? AND a.entity_id = ? ORDER BY a.created_at DESC, a.rowid DESC`
    )
    .all(entityType, entityId)
    .map((r) => ({ action: r.action, detail: r.detail ? JSON.parse(r.detail) : null, at: r.created_at, actorName: r.actor_name }));
}
