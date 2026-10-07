import { test } from "node:test";
import assert from "node:assert/strict";
import { createAssignment } from "@/lib/db/assignments";
import { createClassSession } from "@/lib/db/classSessions";
import { getStudentDashboardData } from "@/lib/student/dashboard";
import { getMyAssignments, getAssignmentDetailForStudent } from "@/lib/student/assignments";
import { getTrainerDashboardData } from "@/lib/trainer/dashboard";
import { getMySchedule } from "@/lib/trainer/schedule";
import {
  getAttendanceSessionOptions,
  getAttendanceRosterForSession,
  saveAttendanceForSession,
} from "@/lib/trainer/attendance";
import { getMyManagedAssignments } from "@/lib/trainer/assignments";
import { signIn, ensureSecondBatch, makeStudentInBatch, makeTrainerForBatch } from "./helpers.mjs";

test("smoke: student dashboard + assignments for an enrolled student", async () => {
  const { batchA } = ensureSecondBatch();
  const trainer = await makeTrainerForBatch(batchA.id);
  const { user } = await makeStudentInBatch(batchA.id, batchA.courseSlug);
  const a = createAssignment({
    courseSlug: batchA.courseSlug,
    batchId: batchA.id,
    title: "Smoke",
    status: "PUBLISHED",
    createdBy: trainer.id,
  });
  createAssignment({
    courseSlug: batchA.courseSlug,
    batchId: batchA.id,
    title: "Hidden draft",
    status: "DRAFT",
    createdBy: trainer.id,
  });

  await signIn(user);
  assert.ok(await getStudentDashboardData());
  const mine = await getMyAssignments();
  assert.deepEqual(mine.map((x) => x.id), [a.id], "drafts stay hidden from students");
  assert.ok(await getAssignmentDetailForStudent(a.id));
});

test("smoke: trainer dashboard, schedule, attendance and assignments (and attendance isolation)", async () => {
  const { batchA, batchB } = ensureSecondBatch();
  const trainer = await makeTrainerForBatch(batchA.id);
  const otherTrainer = await makeTrainerForBatch(batchB.id);
  const { profile } = await makeStudentInBatch(batchA.id, batchA.courseSlug);
  createAssignment({
    courseSlug: batchA.courseSlug,
    batchId: batchA.id,
    title: "T",
    status: "PUBLISHED",
    createdBy: trainer.id,
  });
  const session = createClassSession({
    batchId: batchA.id,
    title: "Intro",
    sessionDate: "2030-01-01",
    startTime: "10:00",
    endTime: "11:00",
  });

  await signIn(trainer);
  const dash = await getTrainerDashboardData();
  assert.equal(dash.stats.assignedBatchesCount, 1);
  assert.equal(dash.stats.activeStudentCount, 1);
  assert.equal((await getMySchedule()).upcoming.length, 1);
  assert.equal((await getMyManagedAssignments()).length, 1);
  assert.equal((await getAttendanceSessionOptions()).length, 1);
  const roster = await getAttendanceRosterForSession(session.id);
  assert.equal(roster.roster.length, 1);
  const saved = await saveAttendanceForSession(session.id, [{ studentProfileId: profile.id, status: "PRESENT" }]);
  assert.equal(saved.ok, true);

  // Another trainer (same course, different batch) cannot read or write it.
  await signIn(otherTrainer);
  assert.equal(await getAttendanceRosterForSession(session.id), null);
  const denied = await saveAttendanceForSession(session.id, [{ studentProfileId: profile.id, status: "ABSENT" }]);
  assert.equal(denied.ok, false);
});
