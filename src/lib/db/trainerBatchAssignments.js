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
export function listBatchIdsForTrainer(trainerUserId) {
  return db
    .prepare(
      "SELECT batch_id FROM trainer_batch_assignments WHERE trainer_user_id = ? ORDER BY created_at ASC"
    )
    .all(trainerUserId)
    .map((row) => row.batch_id);
}

// Server-side ownership check: is this exact batch assigned to this exact
// trainer? Used to guard a single-batch detail lookup without having to
// materialize the trainer's whole batch list first.
export function isBatchAssignedToTrainer(trainerUserId, batchId) {
  const row = db
    .prepare(
      "SELECT 1 FROM trainer_batch_assignments WHERE trainer_user_id = ? AND batch_id = ?"
    )
    .get(trainerUserId, batchId);
  return Boolean(row);
}

// Foundation for a future admin "assign trainer to batch" action — not
// wired to any UI yet in Phase 9.1 (no admin panel exists). Included so
// the table has a tested write path ready for that later phase, and so
// this phase's own tests can seed a real assignment rather than needing
// raw SQL. Safe to call repeatedly: the UNIQUE(trainer_user_id, batch_id)
// constraint makes this a no-op if the assignment already exists.
export function createTrainerBatchAssignment(trainerUserId, batchId) {
  const id = crypto.randomUUID();
  db.prepare(
    `INSERT INTO trainer_batch_assignments (id, trainer_user_id, batch_id)
     VALUES (?, ?, ?)
     ON CONFLICT (trainer_user_id, batch_id) DO NOTHING`
  ).run(id, trainerUserId, batchId);

  return rowToAssignment(
    db
      .prepare(
        "SELECT * FROM trainer_batch_assignments WHERE trainer_user_id = ? AND batch_id = ?"
      )
      .get(trainerUserId, batchId)
  );
}
