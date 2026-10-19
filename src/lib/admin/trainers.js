// Admin trainer management (Phase 10.1): listing, detail, creation and
// trainer-batch assignment. Reuses users + trainer_batch_assignments; the
// batch catalog stays file-based (src/data/batches.js), so "the batch
// exists" means "it is in that catalog". Every function re-derives the
// caller from the session.

import { getAdminContext } from "@/lib/admin/context";
import { PAGE_SIZE, paginate } from "@/lib/admin/listParams";
import {
  listTrainersPage,
  getUserRow,
  listTrainerBatchRows,
  countAttendanceRecordsForBatches,
  countAssignmentsForTrainer,
} from "@/lib/db/adminQueries";
import { createUser, findUserByEmailInternal } from "@/lib/db/users";
import { isBatchAssignedToTrainer } from "@/lib/db/trainerBatchAssignments";
import { countActiveBatchEnrollmentsForBatchIds, listEnrolledStudentsForBatchIds } from "@/lib/db/batchEnrollments";
import { listSessionsForBatchIds } from "@/lib/db/classSessions";
import { hashPassword } from "@/lib/auth/password";
import { listBatches, getBatch, getCourse } from "@/lib/catalog";
import { assignTrainer } from "@/lib/db/catalog";

const EMPTY_PAGE = { rows: [], page: 1, totalPages: 1, pageSize: PAGE_SIZE, total: 0 };

export async function getTrainersPage({ q, sort, page }) {
  if (!(await getAdminContext())) return EMPTY_PAGE;
  const probe = paginate(listTrainersPage({ q, sort, limit: 1, offset: 0 }).total, page);
  const { rows, total } = listTrainersPage({ q, sort, limit: PAGE_SIZE, offset: (probe.page - 1) * PAGE_SIZE });
  return { rows, ...paginate(total, probe.page) };
}

function describeBatch(batch) {
  const course = getCourse(batch.courseSlug);
  return { batch, course, label: `${course?.title ?? batch.courseSlug} — ${batch.mode} (${batch.startDate})` };
}

// Null for "doesn't exist" and "not a TRAINER user" identically.
export async function getTrainerDetailForAdmin(userId) {
  if (!(await getAdminContext())) return null;
  const user = getUserRow(userId);
  if (!user || user.role !== "TRAINER") return null;

  const rows = listTrainerBatchRows(user.id);
  const batchIds = rows.map((r) => r.batchId);
  const assigned = rows.map((r) => {
    const batch = getBatch(r.batchId);
    // A stored assignment whose batch has left the catalog is still shown
    // (by id) rather than silently hidden, so an admin can see it.
    return { batchId: r.batchId, assignedAt: r.assignedAt, ...(batch ? describeBatch(batch) : { batch: null, course: null, label: r.batchId }) };
  });
  const counts = countActiveBatchEnrollmentsForBatchIds(batchIds);
  for (const a of assigned) a.studentCount = counts[a.batchId] || 0;

  const assignable = listBatches()
    .filter((b) => b.status !== "Archived" && !batchIds.includes(b.id)).map((b) => ({ id: b.id, label: describeBatch(b).label }));

  return {
    user,
    assigned,
    assignable,
    summary: {
      assignedBatches: assigned.length,
      students: new Set(listEnrolledStudentsForBatchIds(batchIds).map((s) => s.userId)).size,
      classes: listSessionsForBatchIds(batchIds).length,
      attendanceRecords: countAttendanceRecordsForBatches(batchIds),
      assignments: countAssignmentsForTrainer(user.id, batchIds),
    },
  };
}

// Creates a TRAINER account. The role is fixed here — it is not a
// parameter, so no form field can create any other role. Email must be
// pre-validated by the caller; duplicates (including a race) are rejected.
export async function createTrainerAccount({ name, email, phone, password }) {
  const ctx = await getAdminContext();
  if (!ctx) return { ok: false, reason: "forbidden" };

  if (findUserByEmailInternal(email)) return { ok: false, reason: "duplicate_email" };

  const passwordHash = await hashPassword(password);
  try {
    const user = createUser({ name, email, phone: phone || null, passwordHash, role: "TRAINER" });
    return { ok: true, user };
  } catch (error) {
    if (String(error.message).includes("UNIQUE")) return { ok: false, reason: "duplicate_email" };
    throw error;
  }
}

// Assigns an existing trainer to an existing catalog batch. The trainer is
// looked up (and must have role TRAINER); the batch must exist in the
// catalog; a duplicate is reported rather than silently ignored.
export async function assignTrainerToBatch(trainerUserId, batchId) {
  const ctx = await getAdminContext();
  if (!ctx) return { ok: false, reason: "forbidden" };

  const trainer = getUserRow(trainerUserId);
  if (!trainer || trainer.role !== "TRAINER") return { ok: false, reason: "trainer_not_found" };

  const batch = getBatch(batchId);
  if (!batch || !getCourse(batch.courseSlug)) return { ok: false, reason: "batch_not_found" };
  if (batch.status === "Archived") return { ok: false, reason: "batch_not_found" };

  if (isBatchAssignedToTrainer(trainer.id, batch.id)) return { ok: false, reason: "already_assigned" };

  assignTrainer(ctx.user.id, trainer.id, batch.id);
  return { ok: true, trainerId: trainer.id, batchId: batch.id };
}
