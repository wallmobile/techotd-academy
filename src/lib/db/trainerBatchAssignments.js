import crypto from "node:crypto";
import { db } from "@/lib/db/client";

function rowToAssignment(row) {
  if (!row) return null;
  return {
    id: row.id,
    trainerUserId: row.trainer_user_id,
    batchId: row.batch_id,
    createdAt: row.created_at,
  };
}

// `trainerUserId` must always come from the authenticated session (see
// src/lib/trainer/*.js) — never a value a client supplied. This is the
// ONE query every trainer route ultimately depends on for ownership: a
// batch id that doesn't come back in this list is not this trainer's to
// see, full stop.
export async function listBatchIdsForTrainer(trainerUserId) {
  const rows = await db.all("SELECT batch_id FROM trainer_batch_assignments WHERE trainer_user_id = ? ORDER BY created_at ASC, id ASC", [trainerUserId]);
  return rows.map((row) => row.batch_id);
}

// Server-side ownership check: is this exact batch assigned to this exact
// trainer? Used to guard a single-batch detail lookup without having to
// materialize the trainer's whole batch list first.
export async function isBatchAssignedToTrainer(trainerUserId, batchId) {
  const row = await db.get("SELECT 1 AS one FROM trainer_batch_assignments WHERE trainer_user_id = ? AND batch_id = ?", [trainerUserId, batchId]);
  return Boolean(row);
}

// Seeds / writes an assignment. Safe to call repeatedly: the
// UNIQUE(trainer_user_id, batch_id) constraint makes this a no-op if the
// assignment already exists.
export async function createTrainerBatchAssignment(trainerUserId, batchId) {
  const id = crypto.randomUUID();
  await db.run(
    `INSERT INTO trainer_batch_assignments (id, trainer_user_id, batch_id)
     VALUES (?, ?, ?)
     ON CONFLICT (trainer_user_id, batch_id) DO NOTHING`,
    [id, trainerUserId, batchId]
  );

  return rowToAssignment(await db.get("SELECT * FROM trainer_batch_assignments WHERE trainer_user_id = ? AND batch_id = ?", [trainerUserId, batchId]));
}
