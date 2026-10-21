import { test } from "node:test";
import assert from "node:assert/strict";
import { tdb } from "./tdb.mjs";
import crypto from "node:crypto";
import { db } from "@/lib/db/client";
import { getAdminContext, requireAdminContext } from "@/lib/admin/context";
import { requireArea } from "@/lib/auth/guards";
import { getCurrentUser } from "@/lib/auth/currentUser";
import { getUsersPage, getUserDetail, setUserStatus } from "@/lib/admin/users";
import { getStudentsPage, getStudentDetailForAdmin } from "@/lib/admin/students";
import { getTrainersPage, getTrainerDetailForAdmin, assignTrainerToBatch } from "@/lib/admin/trainers";
import { getAdminDashboardData } from "@/lib/admin/dashboard";
import { parseListParams } from "@/lib/admin/listParams";
import { createTrainerAction, assignTrainerBatchAction, setUserStatusAction } from "@/lib/admin/actions";
import { verifyPassword } from "@/lib/auth/password";
import { createSession, getUserBySessionToken } from "@/lib/db/sessions";
import { findUserByEmailInternal } from "@/lib/db/users";
import { isBatchAssignedToTrainer } from "@/lib/db/trainerBatchAssignments";
import { batches } from "@/data/batches";
import { makeUser, signIn, signOut, makeStudentInBatch } from "./helpers.mjs";

function form(values) {
  const fd = new FormData();
  for (const [k, v] of Object.entries(values)) fd.set(k, v);
  return fd;
}

async function redirectTarget(fn) {
  try {
    await fn();
  } catch (error) {
    if (error.location) return error.location;
    throw error;
  }
  return null;
}

const userCount = async () => (await tdb.prepare("SELECT COUNT(*) AS c FROM users").get()).c;
const BATCH = batches[0];

// ---------------------------------------------------------------- authorization
test("admin context: ADMIN and SUPER_ADMIN allowed; everyone else denied", async () => {
  await signOut();
  assert.equal(await getAdminContext(), null, "no session");

  for (const role of ["STUDENT", "TRAINER", "COUNSELLOR", "ACCOUNTANT", "CONTENT_MANAGER", "PLACEMENT_MANAGER"]) {
    await signIn(await makeUser(role, role.toLowerCase()));
    assert.equal(await getAdminContext(), null, `${role} must be denied`);
  }
  await signIn(await makeUser("ADMIN", "adm"));
  assert.equal((await getAdminContext()).isSuperAdmin, false);
  await signIn(await makeUser("SUPER_ADMIN", "sa"));
  assert.equal((await getAdminContext()).isSuperAdmin, true);
});

test("page guard (direct URL access): students/trainers/other staff/anonymous are redirected", async () => {
  await signOut();
  assert.equal(await redirectTarget(requireAdminContext), "/login");
  await signIn(await makeUser("STUDENT", "stu"));
  assert.equal(await redirectTarget(requireAdminContext), "/student");
  await signIn(await makeUser("TRAINER", "trn"));
  assert.equal(await redirectTarget(requireAdminContext), "/trainer");
  // other staff: admitted to the /admin shell by the layout, sent back there from management pages
  await signIn(await makeUser("COUNSELLOR", "cns"));
  assert.equal(await redirectTarget(async () => await requireArea("admin")), null);
  assert.equal(await redirectTarget(requireAdminContext), "/admin");
  await signIn(await makeUser("ADMIN", "adm"));
  assert.equal(await redirectTarget(requireAdminContext), null);
  await signIn(await makeUser("SUPER_ADMIN", "sa"));
  assert.equal(await redirectTarget(requireAdminContext), null);
});

test("domain reads return nothing for non-admins", async () => {
  const stu = await makeUser("STUDENT", "victim");
  for (const role of ["STUDENT", "TRAINER", "COUNSELLOR"]) {
    await signIn(await makeUser(role, "intruder"));
    assert.equal((await getUsersPage({ q: "", role: "", sort: "newest", page: 1 })).total, 0);
    assert.equal((await getStudentsPage({ q: "", sort: "newest", page: 1 })).total, 0);
    assert.equal((await getTrainersPage({ q: "", sort: "newest", page: 1 })).total, 0);
    assert.equal(await getUserDetail(stu.id), null);
    assert.equal(await getStudentDetailForAdmin(stu.id), null);
    assert.equal(await getAdminDashboardData(), null);
  }
});

test("admin server actions refuse non-admins and write nothing", async () => {
  const trainer = await makeUser("TRAINER", "target");
  const victim = await makeUser("STUDENT", "victim");
  for (const role of ["STUDENT", "TRAINER", "COUNSELLOR"]) {
    await signIn(await makeUser(role, "intruder"));
    const before = await userCount();

    const created = await createTrainerAction(
      null,
      form({ name: "Evil Trainer", email: `evil-${role}@example.test`, password: "Password-123", role: "SUPER_ADMIN" })
    );
    assert.equal(created.status, "error");
    assert.equal(await userCount(), before);
    assert.equal(await findUserByEmailInternal(`evil-${role}@example.test`), null);

    const assigned = await assignTrainerBatchAction(null, form({ trainerId: trainer.id, batchId: BATCH.id }));
    assert.equal(assigned.status, "error");
    assert.equal(await isBatchAssignedToTrainer(trainer.id, BATCH.id), false);

    const status = await setUserStatusAction(null, form({ userId: victim.id, status: "SUSPENDED" }));
    assert.equal(status.status, "error");
    assert.equal((await tdb.prepare("SELECT status FROM users WHERE id = ?").get(victim.id)).status, "ACTIVE");
  }
  await signOut();
  assert.equal((await createTrainerAction(null, form({ name: "X Y", email: "anon@example.test", password: "Password-123" }))).status, "error");
});

// ---------------------------------------------------------------------- listing
test("user listing: search, role filter, sort and pagination", async () => {
  await signIn(await makeUser("ADMIN", "lister"));
  const tag = `zq${crypto.randomUUID().slice(0, 6)}`;
  for (let i = 0; i < 23; i += 1) {
    const u = await makeUser(i % 2 === 0 ? "STUDENT" : "TRAINER", `${tag}-${String(i).padStart(2, "0")}`);
    await tdb.prepare("UPDATE users SET created_at = ? WHERE id = ?").run(`2020-01-01 00:00:${String(i).padStart(2, "0")}`, u.id);
  }

  const all = await getUsersPage({ q: tag, role: "", sort: "newest", page: 1 });
  assert.equal(all.total, 23);
  assert.equal(all.rows.length, 20);
  assert.equal(all.totalPages, 2);
  const page2 = await getUsersPage({ q: tag, role: "", sort: "newest", page: 2 });
  assert.equal(page2.rows.length, 3);
  assert.equal(new Set([...all.rows, ...page2.rows].map((r) => r.id)).size, 23, "pages don't overlap");
  // an out-of-range page is clamped, never an error / empty slice
  assert.equal((await getUsersPage({ q: tag, role: "", sort: "newest", page: 999 })).page, 2);

  const students = await getUsersPage({ q: tag, role: "STUDENT", sort: "newest", page: 1 });
  assert.equal(students.total, 12);
  assert.ok(students.rows.every((r) => r.role === "STUDENT"));

  const newest = await getUsersPage({ q: tag, role: "", sort: "newest", page: 1 });
  const oldest = await getUsersPage({ q: tag, role: "", sort: "oldest", page: 1 });
  assert.ok(newest.rows[0].createdAt > oldest.rows[0].createdAt);
  const byName = await getUsersPage({ q: tag, role: "", sort: "name", page: 1 });
  const names = byName.rows.map((r) => r.name.toLowerCase());
  assert.deepEqual(names, [...names].sort());

  // search matches email too, and LIKE wildcards are treated literally
  const user = all.rows[0];
  assert.ok((await getUsersPage({ q: user.email, role: "", sort: "newest", page: 1 })).total >= 1);
  assert.equal((await getUsersPage({ q: "%", role: "", sort: "newest", page: 1 })).total, 0);
  assert.equal((await getUsersPage({ q: "' OR 1=1 --", role: "", sort: "newest", page: 1 })).total, 0);
});

test("list params are sanitized", () => {
  assert.deepEqual(parseListParams({ q: "  hi  ", role: "HACKER", sort: "drop table", page: "-4" }, { allowRole: true }), {
    q: "hi",
    role: "",
    sort: "newest",
    page: 1,
  });
  assert.equal(parseListParams({ role: "TRAINER" }, { allowRole: true }).role, "TRAINER");
  assert.equal(parseListParams({ role: "TRAINER" }).role, "", "role filter ignored where not offered");
  assert.equal(parseListParams({ page: "abc" }).page, 1);
});

test("dashboard figures come from real rows", async () => {
  await signIn(await makeUser("ADMIN", "dash"));
  const before = await getAdminDashboardData();
  await makeUser("STUDENT", "dashstu");
  await makeUser("TRAINER", "dashtrn");
  await makeUser("ACCOUNTANT", "dashacc");
  const after = await getAdminDashboardData();
  assert.equal(after.stats.totalUsers, before.stats.totalUsers + 3);
  assert.equal(after.stats.students, before.stats.students + 1);
  assert.equal(after.stats.trainers, before.stats.trainers + 1);
  assert.equal(after.stats.staff, before.stats.staff + 1);
  assert.equal(after.stats.totalUsers, await userCount());
  assert.equal(after.roleDistribution.reduce((s, r) => s + r.count, 0), await userCount());
  assert.equal(after.system.databaseOk, true);
  assert.ok(after.recentUsers.length <= 5);
});

// -------------------------------------------------------------- trainer creation
test("create trainer: valid input creates a TRAINER with a bcrypt hash; role field is ignored", async () => {
  await signIn(await makeUser("ADMIN", "creator"));
  const email = `new-${crypto.randomUUID().slice(0, 6)}@example.test`;
  const secret = "S3cret-Trainer-Pw";
  let target;
  try {
    await createTrainerAction(null, form({ name: "Tina Trainer", email, phone: "9876543210", password: secret, role: "SUPER_ADMIN" }));
  } catch (error) {
    target = error.location;
  }
  const created = await findUserByEmailInternal(email);
  assert.ok(created);
  assert.equal(target, `/admin/trainers/${created.id}`);
  assert.equal(created.role, "TRAINER");
  assert.equal(created.status, "ACTIVE");
  assert.notEqual(created.passwordHash, secret);
  assert.match(created.passwordHash, /^\$2[aby]\$/);
  assert.equal(await verifyPassword(secret, created.passwordHash), true);
  // plaintext appears nowhere in the users table
  const dump = JSON.stringify(await tdb.prepare("SELECT * FROM users WHERE id = ?").get(created.id));
  assert.ok(!dump.includes(secret));
});

test("create trainer: duplicate email and weak/invalid input are rejected", async () => {
  await signIn(await makeUser("ADMIN", "creator"));
  const existing = await makeUser("STUDENT", "taken");
  const before = await userCount();

  const dup = await createTrainerAction(null, form({ name: "Dup Dup", email: existing.email.toUpperCase(), password: "Password-123" }));
  assert.equal(dup.status, "error");
  assert.ok(dup.errors.email);
  assert.equal(dup.values.password, undefined, "password is never echoed back");

  const weak = await createTrainerAction(null, form({ name: "Weak Pw", email: "weak@example.test", password: "short" }));
  assert.ok(weak.errors.password);
  const badEmail = await createTrainerAction(null, form({ name: "Bad Email", email: "nope", password: "Password-123" }));
  assert.ok(badEmail.errors.email);
  const badName = await createTrainerAction(null, form({ name: "", email: "x@example.test", password: "Password-123" }));
  assert.ok(badName.errors.name);
  const badPhone = await createTrainerAction(null, form({ name: "Bad Phone", email: "bp@example.test", phone: "abc", password: "Password-123" }));
  assert.ok(badPhone.errors.phone);
  assert.equal(await userCount(), before, "nothing was created");
});

// ------------------------------------------------------------ trainer assignment
test("trainer-batch assignment: works, rejects duplicates, bad batch and non-trainer targets", async () => {
  await signIn(await makeUser("ADMIN", "assigner"));
  const trainer = await makeUser("TRAINER", "assignee");

  const ok = await assignTrainerBatchAction(null, form({ trainerId: trainer.id, batchId: BATCH.id }));
  assert.equal(ok.status, "success");
  assert.equal(await isBatchAssignedToTrainer(trainer.id, BATCH.id), true);

  const dup = await assignTrainerBatchAction(null, form({ trainerId: trainer.id, batchId: BATCH.id }));
  assert.equal(dup.status, "error");
  assert.equal((await tdb.prepare("SELECT COUNT(*) AS c FROM trainer_batch_assignments WHERE trainer_user_id = ?").get(trainer.id)).c, 1);

  assert.equal((await assignTrainerToBatch(trainer.id, "no-such-batch")).reason, "batch_not_found");
  assert.equal((await assignTrainerToBatch("no-such-user", BATCH.id)).reason, "trainer_not_found");
  const student = await makeUser("STUDENT", "notatrainer");
  assert.equal((await assignTrainerToBatch(student.id, BATCH.id)).reason, "trainer_not_found");
  assert.equal(await isBatchAssignedToTrainer(student.id, BATCH.id), false);

  const detail = await getTrainerDetailForAdmin(trainer.id);
  assert.equal(detail.summary.assignedBatches, 1);
  assert.ok(!detail.assignable.some((b) => b.id === BATCH.id), "already-assigned batch isn't offered again");
  assert.equal(await getTrainerDetailForAdmin(student.id), null, "a student id is not a trainer");
});

// --------------------------------------------------------------- student detail
test("student detail exposes only that student and never secrets", async () => {
  await signIn(await makeUser("ADMIN", "viewer"));
  const a = await makeStudentInBatch(BATCH.id, BATCH.courseSlug, "stuA");
  const b = await makeStudentInBatch(BATCH.id, BATCH.courseSlug, "stuB");
  const token = (await createSession(a.user.id)).token;
  await tdb.prepare("INSERT INTO password_reset_tokens (id, user_id, token_hash, expires_at) VALUES (?, ?, ?, ?)").run(
    crypto.randomUUID(),
    a.user.id,
    "resethash-should-not-leak",
    new Date(Date.now() + 1000000).toISOString()
  );

  const detail = await getStudentDetailForAdmin(a.user.id);
  assert.equal(detail.user.id, a.user.id);
  assert.equal(detail.courses.length, 1);
  assert.equal(detail.batches.length, 1);
  const dump = JSON.stringify(detail);
  assert.ok(!dump.includes(b.user.email), "another student's data is absent");
  for (const secret of ["password_hash", "passwordHash", "$2b$", "$2a$", token, "resethash-should-not-leak", "token_hash", "tokenHash"]) {
    assert.ok(!dump.includes(secret), `leaked: ${secret}`);
  }
  const userDump = JSON.stringify(await getUserDetail(a.user.id));
  assert.ok(!userDump.includes("passwordHash") && !userDump.includes("$2b$") && !userDump.includes(token));

  // a trainer's id is not a student
  const trainer = await makeUser("TRAINER", "nostu");
  assert.equal(await getStudentDetailForAdmin(trainer.id), null);
  assert.equal(await getStudentDetailForAdmin("missing"), null);

  // a student with no LMS profile yet still renders, without creating one on read
  const fresh = await makeUser("STUDENT", "fresh");
  const freshDetail = await getStudentDetailForAdmin(fresh.id);
  assert.equal(freshDetail.profile, null);
  assert.equal((await tdb.prepare("SELECT COUNT(*) AS c FROM student_profiles WHERE user_id = ?").get(fresh.id)).c, 0);
});

// ----------------------------------------------------------------- account status
test("account status: deactivation blocks login state, revokes sessions and respects hierarchy", async () => {
  const admin = await makeUser("ADMIN", "boss");
  const superAdmin = await makeUser("SUPER_ADMIN", "root");
  const student = await makeUser("STUDENT", "target");
  const otherAdmin = await makeUser("ADMIN", "peer");
  const studentSession = await createSession(student.id);

  await signIn(admin);
  assert.equal((await setUserStatus(admin.id, "INACTIVE")).ok, false, "can't deactivate yourself");
  assert.equal((await setUserStatus(otherAdmin.id, "INACTIVE")).ok, false, "an ADMIN can't touch another admin");
  assert.equal((await setUserStatus(superAdmin.id, "INACTIVE")).ok, false, "...or a super admin");
  assert.equal((await setUserStatus(student.id, "BOGUS")).ok, false);

  assert.equal((await setUserStatus(student.id, "INACTIVE")).ok, true);
  assert.equal(await getUserBySessionToken(studentSession.token), null, "sessions revoked");
  await signIn(student);
  assert.equal(await getCurrentUser(), null, "an inactive account can't be a current user");

  await signIn(admin);
  assert.equal((await setUserStatus(student.id, "ACTIVE")).ok, true);

  await signIn(superAdmin);
  assert.equal((await setUserStatus(otherAdmin.id, "SUSPENDED")).ok, true, "a SUPER_ADMIN can manage admins");
  assert.equal((await setUserStatus(superAdmin.id, "INACTIVE")).ok, false, "still can't deactivate yourself");
});
