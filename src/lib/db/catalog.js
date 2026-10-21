// Data access for the admin catalog overlay (Phase 10.11). Authorization and
// validation live in src/lib/admin/courses.js / batches.js; every write here
// is a single transaction that also writes an audit_log row.

import crypto from "node:crypto";
import { db } from "@/lib/db/client";
import { writeAudit } from "@/lib/db/audit";

const parseList = (value) => {
  if (!value) return null;
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.filter((x) => typeof x === "string") : null;
  } catch {
    return null;
  }
};

function rowToCourse(row) {
  if (!row) return null;
  return {
    slug: row.slug,
    origin: row.origin,
    status: row.status,
    title: row.title,
    shortDescription: row.short_description,
    description: row.description,
    categorySlug: row.category_slug,
    level: row.level,
    duration: row.duration,
    durationBand: row.duration_band,
    modes: parseList(row.modes),
    technologies: parseList(row.technologies),
    prerequisites: parseList(row.prerequisites),
    outcomes: parseList(row.outcomes),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function rowToBatch(row) {
  if (!row) return null;
  return {
    id: row.id,
    origin: row.origin,
    courseSlug: row.course_slug,
    mode: row.mode,
    schedule: row.schedule,
    startsOn: row.starts_on,
    endsOn: row.ends_on,
    status: row.status,
    location: row.location,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function listCatalogCourseRows(x = db) {
  return (await x.all("SELECT * FROM catalog_courses ORDER BY created_at ASC, slug ASC")).map(rowToCourse);
}
export async function getCatalogCourseRow(slug, x = db) {
  return rowToCourse(await x.get("SELECT * FROM catalog_courses WHERE slug = ?", [slug]));
}
export async function listCatalogBatchRows(x = db) {
  return (await x.all("SELECT * FROM catalog_batches ORDER BY created_at ASC, id ASC")).map(rowToBatch);
}
export async function getCatalogBatchRow(id, x = db) {
  return rowToBatch(await x.get("SELECT * FROM catalog_batches WHERE id = ?", [id]));
}

const json = (list) => (list ? JSON.stringify(list) : null);

const COURSE_COLUMNS = [
  "title",
  "short_description",
  "description",
  "category_slug",
  "level",
  "duration",
  "duration_band",
  "modes",
  "technologies",
  "prerequisites",
  "outcomes",
];

function courseParams(f) {
  return {
    title: f.title,
    short_description: f.shortDescription,
    description: f.description,
    category_slug: f.categorySlug,
    level: f.level,
    duration: f.duration,
    duration_band: f.durationBand,
    modes: json(f.modes),
    technologies: json(f.technologies),
    prerequisites: json(f.prerequisites),
    outcomes: json(f.outcomes),
  };
}

/** Creates a CUSTOM course. The caller has already validated every field. */
export async function insertCustomCourse(actorId, slug, fields, status) {
  return await db.tx(async (t) => {
    await t.run(
      `INSERT INTO catalog_courses (slug, origin, status, ${COURSE_COLUMNS.join(", ")}, created_by, updated_by)
       VALUES (@slug, 'CUSTOM', @status, ${COURSE_COLUMNS.map((c) => "@" + c).join(", ")}, @actor, @actor)`,
      { slug, status, actor: actorId, ...courseParams(fields) }
    );
    await writeAudit(actorId, "course.created", "course", slug, { title: fields.title, status }, t);
    return await getCatalogCourseRow(slug, t);
  });
}

/** Saves edits for any course; the overlay row for a code-defined course is created on its first edit. */
export async function saveCourseEdits(actorId, slug, origin, fields, changed) {
  return await db.tx(async (t) => {
    await t.run("INSERT INTO catalog_courses (slug, origin, status, created_by, updated_by) VALUES (?, ?, 'PUBLISHED', ?, ?) ON CONFLICT (slug) DO NOTHING", [
      slug,
      origin,
      actorId,
      actorId,
    ]);
    await t.run(
      `UPDATE catalog_courses SET ${COURSE_COLUMNS.map((c) => `${c} = @${c}`).join(", ")},
         updated_by = @actor, updated_at = app_now() WHERE slug = @slug`,
      { slug, actor: actorId, ...courseParams(fields) }
    );
    await writeAudit(actorId, "course.updated", "course", slug, { changed }, t);
    return await getCatalogCourseRow(slug, t);
  });
}

export async function setCourseStatus(actorId, slug, origin, status) {
  return await db.tx(async (t) => {
    // Lock the overlay row (if any) so two concurrent toggles audit a consistent "from".
    const existing = await t.get("SELECT status FROM catalog_courses WHERE slug = ? FOR UPDATE", [slug]);
    if (!existing) {
      await t.run("INSERT INTO catalog_courses (slug, origin, status, created_by, updated_by) VALUES (?, ?, ?, ?, ?) ON CONFLICT (slug) DO UPDATE SET status = excluded.status, updated_by = excluded.updated_by, updated_at = app_now()", [
        slug,
        origin,
        status,
        actorId,
        actorId,
      ]);
    } else {
      await t.run("UPDATE catalog_courses SET status = ?, updated_by = ?, updated_at = app_now() WHERE slug = ?", [status, actorId, slug]);
    }
    await writeAudit(actorId, status === "PUBLISHED" ? "course.published" : "course.unpublished", "course", slug, {
      from: existing?.status ?? "PUBLISHED",
      to: status,
    }, t);
    return await getCatalogCourseRow(slug, t);
  });
}

export async function insertCustomBatch(actorId, id, fields) {
  return await db.tx(async (t) => {
    await t.run(
      `INSERT INTO catalog_batches (id, origin, course_slug, mode, schedule, starts_on, ends_on, status, location, created_by, updated_by)
       VALUES (@id, 'CUSTOM', @courseSlug, @mode, @schedule, @startsOn, @endsOn, @status, @location, @actor, @actor)`,
      { id, actor: actorId, ...fields }
    );
    await writeAudit(actorId, "batch.created", "batch", id, { courseSlug: fields.courseSlug, status: fields.status }, t);
    return await getCatalogBatchRow(id, t);
  });
}

export async function saveBatchEdits(actorId, id, origin, fields, changed) {
  return await db.tx(async (t) => {
    await t.run("INSERT INTO catalog_batches (id, origin, created_by, updated_by) VALUES (?, ?, ?, ?) ON CONFLICT (id) DO NOTHING", [id, origin, actorId, actorId]);
    await t.run(
      `UPDATE catalog_batches SET mode = @mode, schedule = @schedule, starts_on = @startsOn, ends_on = @endsOn,
         status = @status, location = @location, updated_by = @actor, updated_at = app_now() WHERE id = @id`,
      { id, actor: actorId, ...fields }
    );
    await writeAudit(actorId, "batch.updated", "batch", id, { changed }, t);
    return await getCatalogBatchRow(id, t);
  });
}

/** Idempotent trainer <-> batch link, with an audit row only when something changed. */
export async function assignTrainer(actorId, trainerUserId, batchId) {
  return await db.tx(async (t) => {
    const r = await t.run(
      "INSERT INTO trainer_batch_assignments (id, trainer_user_id, batch_id) VALUES (?, ?, ?) ON CONFLICT (trainer_user_id, batch_id) DO NOTHING",
      [crypto.randomUUID(), trainerUserId, batchId]
    );
    if (r.changes === 1) await writeAudit(actorId, "batch.trainer_assigned", "batch", batchId, { trainerUserId }, t);
    return r.changes === 1;
  });
}

export async function unassignTrainer(actorId, trainerUserId, batchId) {
  return await db.tx(async (t) => {
    const r = await t.run("DELETE FROM trainer_batch_assignments WHERE trainer_user_id = ? AND batch_id = ?", [trainerUserId, batchId]);
    if (r.changes === 1) await writeAudit(actorId, "batch.trainer_removed", "batch", batchId, { trainerUserId }, t);
    return r.changes === 1;
  });
}

export async function listTrainersForBatch(batchId) {
  const rows = await db.all(
    `SELECT u.id, u.name, u.email, u.status, a.created_at AS assigned_at
     FROM trainer_batch_assignments a JOIN users u ON u.id = a.trainer_user_id
     WHERE a.batch_id = ? ORDER BY a.created_at ASC, u.id ASC`,
    [batchId]
  );
  return rows.map((r) => ({ id: r.id, name: r.name, email: r.email, status: r.status, assignedAt: r.assigned_at }));
}

export async function listAssignableTrainers(batchId) {
  return await db.all(
    `SELECT id, name, email FROM users WHERE role = 'TRAINER' AND status = 'ACTIVE'
       AND id NOT IN (SELECT trainer_user_id FROM trainer_batch_assignments WHERE batch_id = ?)
     ORDER BY lower(name) ASC, id ASC`,
    [batchId]
  );
}

export async function getBatchEnrollmentSummary(batchId) {
  const out = { total: 0 };
  for (const r of await db.all("SELECT status, COUNT(*) AS c FROM batch_enrollments WHERE batch_id = ? GROUP BY status", [batchId])) {
    out[r.status] = r.c;
    out.total += r.c;
  }
  return out;
}

export async function listBatchEnrollmentsPreview(batchId, limit = 50) {
  const rows = await db.all(
    `SELECT e.id, e.status, e.created_at, u.id AS user_id, u.name, u.email
     FROM batch_enrollments e JOIN student_profiles p ON p.id = e.student_id JOIN users u ON u.id = p.user_id
     WHERE e.batch_id = ? ORDER BY e.created_at DESC, e.id ASC LIMIT ?`,
    [batchId, limit]
  );
  return rows.map((r) => ({ id: r.id, status: r.status, createdAt: r.created_at, userId: r.user_id, name: r.name, email: r.email }));
}

export async function countEnrollmentsForBatches(batchIds) {
  if (batchIds.length === 0) return { total: 0, active: 0 };
  const marks = batchIds.map(() => "?").join(",");
  const row = await db.get(
    `SELECT COUNT(*) AS total, COUNT(*) FILTER (WHERE status = 'ACTIVE') AS active FROM batch_enrollments WHERE batch_id IN (${marks})`,
    batchIds
  );
  return { total: row.total, active: row.active ?? 0 };
}

/** Newest-first audit rows for one course or batch. */
export async function listAuditForEntity(entityType, entityId, limit = 30) {
  const rows = await db.all(
    `SELECT a.action, a.detail, a.created_at, u.name AS actor_name FROM audit_log a
     LEFT JOIN users u ON u.id = a.actor_user_id
     WHERE a.entity_type = ? AND a.entity_id = ? ORDER BY a.created_at DESC, a.seq DESC LIMIT ?`,
    [entityType, entityId, limit]
  );
  return rows.map((r) => ({ action: r.action, detail: r.detail ? safeJson(r.detail) : null, createdAt: r.created_at, actorName: r.actor_name }));
}

function safeJson(text) {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}
