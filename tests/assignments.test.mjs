import { test } from "node:test";
import assert from "node:assert/strict";
import { tdb } from "./tdb.mjs";
import { createAssignment } from "@/lib/db/assignments";
import { upsertSubmission, getSubmissionForStudentAssignment } from "@/lib/db/assignmentSubmissions";
import { db } from "@/lib/db/client";
import { submitAssignmentAction } from "@/lib/student/assignmentActions";
import { evaluateSubmissionAction } from "@/lib/trainer/evaluationActions";
import { getMyPendingReviewCount, getMyManagedAssignments } from "@/lib/trainer/assignments";
import { getTrainerDashboardData } from "@/lib/trainer/dashboard";
import { signIn, ensureSecondBatch, makeStudentInBatch, makeTrainerForBatch } from "./helpers.mjs";

function form(values) {
  const fd = new FormData();
  for (const [k, v] of Object.entries(values)) fd.set(k, v);
  return fd;
}

async function setup() {
  const { batchA } = ensureSecondBatch();
  const trainer = await makeTrainerForBatch(batchA.id);
  const { user, profile } = await makeStudentInBatch(batchA.id, batchA.courseSlug);
  const assignment = await createAssignment({
    courseSlug: batchA.courseSlug,
    batchId: batchA.id,
    title: "Essay",
    status: "PUBLISHED",
    createdBy: trainer.id,
  });
  return { trainer, user, profile, assignment };
}

test("first submission is stored as SUBMITTED with no evaluation", async () => {
  const { user, profile, assignment } = await setup();
  await signIn(user);
  const res = await submitAssignmentAction(null, form({ assignmentId: assignment.id, submissionText: "my first answer" }));
  assert.equal(res.status, "success");
  const sub = await getSubmissionForStudentAssignment(profile.id, assignment.id);
  assert.equal(sub.status, "SUBMITTED");
  assert.equal(sub.score, null);
  assert.equal(sub.feedback, null);
  assert.equal(sub.evaluatedAt, null);
});

test("resubmitting an evaluated submission clears score, feedback and evaluated_at", async () => {
  const { trainer, user, profile, assignment } = await setup();

  await signIn(user);
  await submitAssignmentAction(null, form({ assignmentId: assignment.id, submissionText: "v1" }));
  const first = await getSubmissionForStudentAssignment(profile.id, assignment.id);

  await signIn(trainer);
  const evalRes = await evaluateSubmissionAction(
    null,
    form({ submissionId: first.id, status: "REVIEWED", score: "88", feedback: "Nice" })
  );
  assert.equal(evalRes.status, "success");
  const evaluated = await getSubmissionForStudentAssignment(profile.id, assignment.id);
  assert.equal(evaluated.status, "REVIEWED");
  assert.equal(evaluated.score, 88);
  assert.ok(evaluated.evaluatedAt);
  assert.equal(await getMyPendingReviewCount(), 0);

  await signIn(user);
  const re = await submitAssignmentAction(null, form({ assignmentId: assignment.id, submissionText: "v2 revised" }));
  assert.equal(re.status, "success");
  const after = await getSubmissionForStudentAssignment(profile.id, assignment.id);
  assert.equal(after.id, first.id, "same row, no duplicate submission");
  assert.equal(after.status, "SUBMITTED");
  assert.equal(after.submissionText, "v2 revised");
  assert.equal(after.score, null);
  assert.equal(after.feedback, null);
  assert.equal(after.evaluatedAt, null);

  await signIn(trainer);
  assert.equal(await getMyPendingReviewCount(), 1, "resubmission is pending review again");
});

test("db-level upsert also clears a stale evaluation and keeps updated_at current", async () => {
  const { profile, assignment } = await setup();
  const first = await upsertSubmission({ assignmentId: assignment.id, studentId: profile.id, submissionText: "a" });
  await tdb.prepare(
    "UPDATE assignment_submissions SET status='RETURNED', score=10, feedback='x', evaluated_at=app_now(), updated_at='2000-01-01 00:00:00' WHERE id = ?"
  ).run(first.id);
  const sub = await upsertSubmission({ assignmentId: assignment.id, studentId: profile.id, submissionText: "b" });
  assert.deepEqual([sub.status, sub.score, sub.feedback, sub.evaluatedAt], ["SUBMITTED", null, null, null]);
  assert.notEqual(sub.updatedAt, "2000-01-01 00:00:00");
});

test("pending review count: dashboard and assignment list agree", async () => {
  const { trainer, user, assignment } = await setup();
  await signIn(user);
  await submitAssignmentAction(null, form({ assignmentId: assignment.id, submissionText: "answer" }));
  await signIn(trainer);
  const dash = await getTrainerDashboardData();
  const list = await getMyManagedAssignments();
  assert.equal(dash.stats.pendingAssignmentReviews, 1);
  assert.equal(list.find((a) => a.id === assignment.id).pendingReviewCount, 1);
});
