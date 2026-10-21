import crypto from "node:crypto";
import { db } from "@/lib/db/client";

/**
 * Appends one audit_log row. `detail` must never contain secrets (passwords, tokens).
 * Pass `executor` (a transaction handle `t` from db.tx) to make the audit row part
 * of the caller's transaction; it defaults to the pool.
 */
export async function writeAudit(actorUserId, action, entityType, entityId, detail = null, executor = db) {
  await executor.run("INSERT INTO audit_log (id, actor_user_id, action, entity_type, entity_id, detail) VALUES (?, ?, ?, ?, ?, ?)", [
    crypto.randomUUID(),
    actorUserId,
    action,
    entityType,
    entityId,
    detail ? JSON.stringify(detail) : null,
  ]);
}
