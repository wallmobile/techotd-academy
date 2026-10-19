import crypto from "node:crypto";
import { db } from "@/lib/db/client";

/** Appends one audit_log row. `detail` must never contain secrets (passwords, tokens). */
export function writeAudit(actorUserId, action, entityType, entityId, detail = null) {
  db.prepare("INSERT INTO audit_log (id, actor_user_id, action, entity_type, entity_id, detail) VALUES (?, ?, ?, ?, ?, ?)").run(
    crypto.randomUUID(),
    actorUserId,
    action,
    entityType,
    entityId,
    detail ? JSON.stringify(detail) : null
  );
}
