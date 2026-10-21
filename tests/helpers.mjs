import crypto from "node:crypto";
import { __jar } from "./stubs/headers.mjs";
import { createUser } from "@/lib/db/users";
import { hashPassword } from "@/lib/auth/password";
import { startSession, endSession } from "@/lib/auth/session";
import { getOrCreateStudentProfile } from "@/lib/db/studentProfiles";
import { createCourseEnrollment } from "@/lib/db/courseEnrollments";
import { createBatchEnrollment } from "@/lib/db/batchEnrollments";
import { createTrainerBatchAssignment } from "@/lib/db/trainerBatchAssignments";
import { batches } from "@/data/batches";

export const PASSWORD = "Correct-Horse-9";
let passwordHashPromise;
// bcrypt cost 12 is slow; hash once and share across every test user.
export async function sharedPasswordHash() {
  passwordHashPromise ??= await hashPassword(PASSWORD);
  return passwordHashPromise;
}

export async function makeUser(role, label) {
  return await createUser({
    name: `${label} ${crypto.randomUUID().slice(0, 4)}`,
    email: `${label}-${crypto.randomUUID().slice(0, 8)}@example.test`.toLowerCase(),
    phone: null,
    passwordHash: await sharedPasswordHash(),
    role,
  });
}

export async function signIn(user, opts) {
  __jar().clear();
  await startSession(user.id, opts);
}

export async function signOut() {
  await endSession();
  __jar().clear();
}

export function cookieJar() {
  return __jar();
}

// The catalog has one batch per course, so "two trainers, same course,
// different batches" needs extra batches. Every call registers two FRESH
// batches (unique ids, same course) in the test process's copy of the
// catalog, so tests never share trainers/students through a batch.
let batchCounter = 0;
export function ensureSecondBatch() {
  const base = batches[0];
  const make = (suffix) => {
    batchCounter += 1;
    const batch = { ...base, id: `${base.id}-t${batchCounter}${suffix}` };
    batches.push(batch);
    return batch;
  };
  return { batchA: make("a"), batchB: make("b") };
}

export async function makeStudentInBatch(batchId, courseSlug, label = "student") {
  const user = await makeUser("STUDENT", label);
  const profile = await getOrCreateStudentProfile(user.id);
  await createCourseEnrollment(profile.id, courseSlug);
  await createBatchEnrollment(profile.id, batchId);
  return { user, profile };
}

export async function makeTrainerForBatch(batchId, label = "trainer") {
  const user = await makeUser("TRAINER", label);
  await createTrainerBatchAssignment(user.id, batchId);
  return user;
}
