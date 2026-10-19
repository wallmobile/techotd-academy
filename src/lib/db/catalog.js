// Data access for the admin catalog overlay (Phase 10.11). Authorization and
// validation live in src/lib/admin/courses.js / batches.js; every write here
// is a single IMMEDIATE transaction that also writes an audit_log row.

import crypto from "node:crypto";
import { db } from "@/lib/db/client";

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

export const listCatalogCourseRows = () =>
  db.prepare("SELECT * FROM catalog_courses ORDER BY created_at ASC, rowid ASC").all().map(rowToCourse);
export const getCatalogCourseRow = (slug) => rowToCourse(db.prepare("SELECT * FROM catalog_courses WHERE slug = ?").get(slug));
export const listCatalogBatchRows = () =>
  db.prepare("SELECT * FROM catalog_batches ORDER BY created_at ASC, rowid ASC").all().map(rowToBatch);
export const getCatalogBatchRow = (id) => rowToBatch(db.prepare("SELECT * FROM catalog_batches WHERE id = ?").get(id));

function audit(actorId, action, entityType, entityId, detail) {
  db.prepare("INSERT INTO audit_log (id, actor_user_id, action, entity_type, entity_id, detail) VALUES (?, ?, ?, ?, ?, ?)").run(
    crypto.randomUUID(),
    actorId,
    action,
    entityType,
    entityId,
    detail ? JSON.stringify(detail) : null
  );
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
export function insertCustomCourse(actorId, slug, fields, status) {
  return db
    .transaction(() => {
      db.prepare(
        `INSERT INTO catalog_courses (slug, origin, status, ${COURSE_COLUMNS.join(", ")}, created_by, updated_by)
         VALUES (@slug, 'CUSTOM', @status, ${COURSE_COLUMNS.map((c) => "@" + c).join(", ")}, @actor, @actor)`
      ).run({ slug, status, actor: actorId, ...courseParams(fields) });
      audit(actorId, "course.created", "course", slug, { title: fields.title, status });
      return getCatalogCourseRow(slug);
    })
    .immediate();
}

/** Saves edits for any course; the overlay row for a code-defined course is created on its first edit. */
export function saveCourseEdits(actorId, slug, origin, fields, changed) {
  return db
    .transaction(() => {
      const exists = db.prepare("SELECT 1 FROM catalog_courses WHERE slug = ?").get(slug);
      if (!exists) {
        db.prepare("INSERT INTO catalog_courses (slug, origin, status, created_by, updated_by) VALUES (?, ?, 'PUBLISHED', ?, ?)").run(
          slug,
          origin,
          actorId,
          actorId
        );
      }
      db.prepare(
        `UPDATE catalog_courses SET ${COURSE_COLUMNS.map((c) => `${c} = @${c}`).join(", ")},
           updated_by = @actor, updated_at = datetime('now') WHERE slug = @slug`
      ).run({ slug, actor: actorId, ...courseParams(fields) });
      audit(actorId, "course.updated", "course", slug, { changed });
      return getCatalogCourseRow(slug);
    })
    .immediate();
}

export function setCourseStatus(actorId, slug, origin, status) {
  return db
    .transaction(() => {
      const existing = db.prepare("SELECT status FROM catalog_courses WHERE slug = ?").get(slug);
      if (!existing) {
        db.prepare("INSERT INTO catalog_courses (slug, origin, status, created_by, updated_by) VALUES (?, ?, ?, ?, ?)").run(
          slug,
          origin,
          status,
          actorId,
          actorId
        );
      } else {
        db.prepare("UPDATE catalog_courses SET status = ?, updated_by = ?, updated_at = datetime('now') WHERE slug = ?").run(status, actorId, slug);
      }
      audit(actorId, status === "PUBLISHED" ? "course.published" : "course.unpublished", "course", slug, {
        from: existing?.status ?? "PUBLISHED",
        to: status,
      });
      return getCatalogCourseRow(slug);
    })
    .immediate();
}

export function insertCustomBatch(actorId, id, fields) {
  return db
    .transaction(() => {
      db.prepare(
        `INSERT INTO catalog_batches (id, origin, course_slug, mode, schedule, starts_on, ends_on, status, location, created_by, updated_by)
         VALUES (@id, 'CUSTOM', @courseSlug, @mode, @schedule, @startsOn, @endsOn, @status, @location, @actor, @actor)`
      ).run({ id, actor: actorId, ...fields });
      audit(actorId, "batch.created", "batch", id, { courseSlug: fields.courseSlug, status: fields.status });
      return getCatalogBatchRow(id);
    })
    .immediate();
}

export function saveBatchEdits(actorId, id, origin, fields, changed) {
  return db
    .transaction(() => {
      const exists = db.prepare("SELECT 1 FROM catalog_batches WHERE id = ?").get(id);
      if (!exists) {
        db.prepare("INSERT INTO catalog_batches (id, origin, created_by, updated_by) VALUES (?, ?, ?, ?)").run(id, origin, actorId, actorId);
      }
      db.prepare(
        `UPDATE catalog_batches SET mode = @mode, schedule = @schedule, starts_on = @startsOn, ends_on = @endsOn,
           status = @status, location = @location, updated_by = @actor, updated_at = datetime('now') WHERE id = @id`
      ).run({ id, actor: actorId, ...fields });
      audit(actorId, "batch.updated", "batch", id, { changed });
      return getCatalogBatchRow(id);
    })
    .immediate();
}

/** Idempotent trainer <-> batch link, with an audit row only when something changed. */
export function assignTrainer(actorId, trainerUserId, batchId) {
  return db
    .transaction(() => {
      const r = db
        .prepare("INSERT INTO trainer_batch_assignments (id, trainer_user_id, batch_id) VALUES (?, ?, ?) ON CONFLICT (trainer_user_id, batch_id) DO NOTHING")
        .run(crypto.randomUUID(), trainerUserId, batchId);
      if (r.changes === 1) audit(actorId, "batch.trainer_assigned", "batch", batchId, { trainerUserId });
      return r.changes === 1;
    })
    .immediate();
}

export function unassignTrainer(actorId, trainerUserId, batchId) {
  return db
    .transaction(() => {
      const r = db.prepare("DELETE FROM trainer_batch_assignments WHERE trainer_user_id = ? AND batch_id = ?").run(trainerUserId, batchId);
      if (r.changes === 1) audit(actorId, "batch.trainer_removed", "batch", batchId, { trainerUserId });
      return r.changes === 1;
    })
    .immediate();
}

export function listTrainersForBatch(batchId) {
  return db
    .prepare(
      `SELECT u.id, u.name, u.email, u.status, a.created_at AS assigned_at
       FROM trainer_batch_assignments a JOIN users u ON u.id = a.trainer_user_id
       WHERE a.batch_id = ? ORDER BY a.created_at ASC`
    )
    .all(batchId)
    .map((r) => ({ id: r.id, name: r.name, email: r.email, status: r.status, assignedAt: r.assigned_at }));
}

export function listAssignableTrainers(batchId) {
  return db
    .prepare(
      `SELECT id, name, email FROM users WHERE role = 'TRAINER' AND status = 'ACTIVE'
         AND id NOT IN (SELECT trainer_user_id FROM trainer_batch_assignments WHERE batch_id = ?)
       ORDER BY name COLLATE NOCASE ASC`
    )
    .all(batchId);
}

export function getBatchEnrollmentSummary(batchId) {
  const out = { total: 0 };
  for (const r of db.prepare("SELECT status, COUNT(*) AS c FROM batch_enrollments WHERE batch_id = ? GROUP BY status").all(batchId)) {
    out[r.status] = r.c;
    out.total += r.c;
  }
  return out;
}

export function listBatchEnrollmentsPreview(batchId, limit = 50) {
  return db
    .prepare(
      `SELECT e.id, e.status, e.created_at, u.id AS user_id, u.name, u.email
       FROM batch_enrollments e JOIN student_profiles p ON p.id = e.student_id JOIN users u ON u.id = p.user_id
       WHERE e.batch_id = ? ORDER BY e.created_at DESC LIMIT ?`
    )
    .all(batchId, limit)
    .map((r) => ({ id: r.id, status: r.status, createdAt: r.created_at, userId: r.user_id, name: r.name, email: r.email }));
}

export function countEnrollmentsForBatches(batchIds) {
  if (batchIds.length === 0) return { total: 0, active: 0 };
  const marks = batchIds.map(() => "?").join(",");
  const row = db
    .prepare(`SELECT COUNT(*) AS total, SUM(CASE WHEN status = 'ACTIVE' THEN 1 ELSE 0 END) AS active FROM batch_enrollments WHERE batch_id IN (${marks})`)
    .get(...batchIds);
  return { total: row.total, active: row.active ?? 0 };
}

/** Newest-first audit rows for one course or batch. */
export function listAuditForEntity(entityType, entityId, limit = 30) {
  return db
    .prepare(
      `SELECT a.action, a.detail, a.created_at, u.name AS actor_name FROM audit_log a
       LEFT JOIN users u ON u.id = a.actor_user_id
       WHERE a.entity_type = ? AND a.entity_id = ? ORDER BY a.created_at DESC, a.rowid DESC LIMIT ?`
    )
    .all(entityType, entityId, limit)
    .map((r) => ({ action: r.action, detail: r.detail ? safeJson(r.detail) : null, createdAt: r.created_at, actorName: r.actor_name }));
}

function safeJson(text) {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}
