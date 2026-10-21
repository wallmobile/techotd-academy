import { test } from "node:test";
import assert from "node:assert/strict";
import { createAssignment } from "@/lib/db/assignments";
import { getSubmissionForStudentAssignment } from "@/lib/db/assignmentSubmissions";
import { submitAssignmentAction } from "@/lib/student/assignmentActions";
import { evaluateSubmissionAction } from "@/lib/trainer/evaluationActions";
import { getSubmissionsForAssignment } from "@/lib/trainer/submissions";
import {
  getMyManagedAssignments,
  getAssignmentDetailForTrainer,
  createManagedAssignment,
  updateManagedAssignment,
} from "@/lib/trainer/assignments";
import { getMyStudents, getStudentDetailForTrainer } from "@/lib/trainer/students";
import { getMyAssignedBatches } from "@/lib/trainer/batches";
import { requireTrainerBatchOwnership } from "@/lib/trainer/context";
import { getTrainerDashboardData } from "@/lib/trainer/dashboard";
import { signIn, ensureSecondBatch, makeStudentInBatch, makeTrainerForBatch } from "./helpers.mjs";

function form(values) {
  const fd = new FormData();
  for (const [k, v] of Object.entries(values)) fd.set(k, v);
  return fd;
}

// Trainer A -> Batch A -> Student A ; Trainer B -> Batch B -> Student B.
// Both batches teach the SAME course, which is exactly the shape that
// leaked before Phase 9.4.
async function world() {
  const { batchA, batchB } = ensureSecondBatch();
  const course = batchA.courseSlug;
  const trainerA = await makeTrainerForBatch(batchA.id, "trainerA");
  const trainerB = await makeTrainerForBatch(batchB.id, "trainerB");
  const studentA = await makeStudentInBatch(batchA.id, course, "studentA");
  const studentB = await makeStudentInBatch(batchB.id, course, "studentB");

  const wideA = await createAssignment({ courseSlug: course, batchId: null, title: "Wide A", status: "PUBLISHED", createdBy: trainerA.id });
  const wideB = await createAssignment({ courseSlug: course, batchId: null, title: "Wide B", status: "PUBLISHED", createdBy: trainerB.id });
  const batchOnlyB = await createAssignment({
    courseSlug: course,
    batchId: batchB.id,
    title: "Batch B only",
    status: "PUBLISHED",
    createdBy: trainerB.id,
  });

  // Both students submit to both course-wide assignments.
  for (const s of [studentA, studentB]) {
    await signIn(s.user);
    for (const a of [wideA, wideB]) {
      const r = await submitAssignmentAction(null, form({ assignmentId: a.id, submissionText: `answer by ${s.user.name}` }));
      assert.equal(r.status, "success");
    }
  }
  return { batchA, batchB, trainerA, trainerB, studentA, studentB, wideA, wideB, batchOnlyB };
}

test("Trainer A cannot access Trainer B's batch", async () => {
  const w = await world();
  await signIn(w.trainerA);
  assert.ok(await requireTrainerBatchOwnership(w.batchA.id));
  assert.equal(await requireTrainerBatchOwnership(w.batchB.id), null);
  const mine = await getMyAssignedBatches();
  assert.deepEqual(mine.map((b) => b.batch.id), [w.batchA.id]);
});

test("Trainer A cannot access Trainer B's student", async () => {
  const w = await world();
  await signIn(w.trainerA);
  assert.ok(await getStudentDetailForTrainer(w.studentA.profile.id));
  assert.equal(await getStudentDetailForTrainer(w.studentB.profile.id), null);
  const ids = (await getMyStudents()).map((s) => s.studentProfileId);
  assert.deepEqual(ids, [w.studentA.profile.id]);
});

test("Trainer A sees only own students' submissions, even on a shared-course assignment", async () => {
  const w = await world();
  await signIn(w.trainerA);
  const own = await getSubmissionsForAssignment(w.wideA.id);
  assert.deepEqual(own.submissions.map((s) => s.studentId), [w.studentA.profile.id]);
  // Trainer B's course-wide and batch-scoped assignments are not A's to open.
  assert.equal(await getSubmissionsForAssignment(w.wideB.id), null);
  assert.equal(await getAssignmentDetailForTrainer(w.batchOnlyB.id), null);
  const listed = (await getMyManagedAssignments()).map((a) => a.id);
  assert.ok(listed.includes(w.wideA.id));
  assert.ok(!listed.includes(w.wideB.id) && !listed.includes(w.batchOnlyB.id));
});

test("Trainer A cannot evaluate Trainer B's student's submission", async () => {
  const w = await world();
  const onB = await getSubmissionForStudentAssignment(w.studentB.profile.id, w.wideB.id);
  const bOnA = await getSubmissionForStudentAssignment(w.studentB.profile.id, w.wideA.id);

  await signIn(w.trainerA);
  // (1) a submission on B's assignment
  let res = await evaluateSubmissionAction(null, form({ submissionId: onB.id, status: "REVIEWED", score: "1", feedback: "x" }));
  assert.equal(res.status, "error");
  // (2) the harder case: Student B's submission on A's OWN course-wide assignment
  res = await evaluateSubmissionAction(null, form({ submissionId: bOnA.id, status: "REVIEWED", score: "1", feedback: "x" }));
  assert.equal(res.status, "error");
  for (const s of [onB, bOnA]) {
    const after = await getSubmissionForStudentAssignment(w.studentB.profile.id, s.assignmentId);
    assert.equal(after.status, "SUBMITTED");
    assert.equal(after.score, null);
  }
  // Trainer A CAN evaluate their own student.
  const ownSub = await getSubmissionForStudentAssignment(w.studentA.profile.id, w.wideA.id);
  res = await evaluateSubmissionAction(null, form({ submissionId: ownSub.id, status: "REVIEWED", score: "90", feedback: "ok" }));
  assert.equal(res.status, "success");
});

test("pending review counts are per-trainer", async () => {
  const w = await world();
  // In scope for A: studentA -> wideA only. For B: studentB -> wideB only.
  await signIn(w.trainerA);
  assert.equal((await getTrainerDashboardData()).stats.pendingAssignmentReviews, 1);
  await signIn(w.trainerB);
  assert.equal((await getTrainerDashboardData()).stats.pendingAssignmentReviews, 1);

  // Evaluating A's student's work moves only A's count.
  await signIn(w.trainerA);
  const subA = await getSubmissionForStudentAssignment(w.studentA.profile.id, w.wideA.id);
  await evaluateSubmissionAction(null, form({ submissionId: subA.id, status: "REVIEWED", score: "", feedback: "" }));
  assert.equal((await getTrainerDashboardData()).stats.pendingAssignmentReviews, 0);
  await signIn(w.trainerB);
  assert.equal((await getTrainerDashboardData()).stats.pendingAssignmentReviews, 1);
});

test("Trainer A cannot edit B's assignment or create one in B's batch", async () => {
  const w = await world();
  await signIn(w.trainerA);
  const edit = await updateManagedAssignment(w.wideB.id, {
    title: "hijack",
    description: "",
    dueAt: null,
    status: "CLOSED",
    batchId: null,
  });
  assert.equal(edit.ok, false);
  const create = await createManagedAssignment({
    courseSlug: w.batchA.courseSlug,
    batchId: w.batchB.id,
    title: "x",
    description: "",
    dueAt: null,
    status: "DRAFT",
  });
  assert.equal(create.ok, false);
  const ok = await createManagedAssignment({
    courseSlug: w.batchA.courseSlug,
    batchId: null,
    title: "mine",
    description: "",
    dueAt: null,
    status: "DRAFT",
  });
  assert.equal(ok.ok, true);
  assert.equal(ok.assignment.createdBy, w.trainerA.id, "author comes from the session, not the client");
});
