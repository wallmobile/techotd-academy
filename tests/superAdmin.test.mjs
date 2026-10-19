import { test } from "node:test";
import assert from "node:assert/strict";
import { db } from "@/lib/db/client";
import { getSuperAdminContext, requireSuperAdminContext } from "@/lib/superAdmin/context";
import { getStaffPage, getSuperAdminOverview, createStaffAccount } from "@/lib/superAdmin/staff";
import { createStaffAction } from "@/lib/superAdmin/actions";
import { requireArea } from "@/lib/auth/guards";
import { roleHomeRoute } from "@/lib/auth/roles";
import { findUserByEmailInternal } from "@/lib/db/users";
import { makeUser, signIn, signOut } from "./helpers.mjs";

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

const userCount = () => db.prepare("SELECT COUNT(*) AS c FROM users").get().c;
const NON_SUPER = ["STUDENT", "TRAINER", "ADMIN", "COUNSELLOR", "ACCOUNTANT", "CONTENT_MANAGER", "PLACEMENT_MANAGER"];

test("super admin lands on /super-admin; every other role keeps its own home", () => {
  assert.equal(roleHomeRoute("SUPER_ADMIN"), "/super-admin");
  assert.equal(roleHomeRoute("ADMIN"), "/admin");
  assert.equal(roleHomeRoute("STUDENT"), "/student");
  assert.equal(roleHomeRoute("TRAINER"), "/trainer");
});

test("super admin context: only an active SUPER_ADMIN passes", async () => {
  await signOut();
  assert.equal(await getSuperAdminContext(), null, "no session");
  for (const role of NON_SUPER) {
    await signIn(await makeUser(role, role.toLowerCase()));
    assert.equal(await getSuperAdminContext(), null, `${role} must be denied`);
  }
  await signIn(await makeUser("SUPER_ADMIN", "sa"));
  assert.ok(await getSuperAdminContext());
});

test("page guard: anonymous -> /login; other roles are sent to their own area", async () => {
  await signOut();
  assert.equal(await redirectTarget(requireSuperAdminContext), "/login");
  assert.equal(await redirectTarget(() => requireArea("super-admin")), "/login");

  await signIn(await makeUser("STUDENT", "stu"));
  assert.equal(await redirectTarget(() => requireArea("super-admin")), "/student");
  await signIn(await makeUser("TRAINER", "trn"));
  assert.equal(await redirectTarget(() => requireArea("super-admin")), "/trainer");
  await signIn(await makeUser("ADMIN", "adm"));
  assert.equal(await redirectTarget(() => requireArea("super-admin")), "/admin");
  assert.equal(await redirectTarget(requireSuperAdminContext), "/admin");

  await signIn(await makeUser("SUPER_ADMIN", "sa"));
  assert.equal(await redirectTarget(() => requireArea("super-admin")), null);
  assert.ok(await requireSuperAdminContext());
});

test("domain reads return nothing for non-super-admins", async () => {
  for (const role of NON_SUPER) {
    await signIn(await makeUser(role, role.toLowerCase()));
    assert.equal(await getSuperAdminOverview(), null, `${role} overview`);
    assert.equal((await getStaffPage({ q: "", role: "", sort: "newest", page: 1 })).rows.length, 0, `${role} staff list`);
  }
});

test("staff list holds only staff roles; overview counts are real", async () => {
  await signIn(await makeUser("STUDENT", "listed-student"));
  const stranger = await makeUser("COUNSELLOR", "listed-counsellor");
  await signIn(await makeUser("SUPER_ADMIN", "sa"));

  const all = await getStaffPage({ q: "", role: "", sort: "newest", page: 1 });
  assert.ok(all.rows.some((u) => u.id === stranger.id));
  assert.ok(all.rows.every((u) => !["STUDENT", "TRAINER"].includes(u.role)), "no students/trainers");
  assert.ok(all.rows.every((u) => u.password_hash === undefined && u.passwordHash === undefined));

  // A non-staff role filter is ignored rather than leaking students.
  const bogus = await getStaffPage({ q: "", role: "STUDENT", sort: "newest", page: 1 });
  assert.ok(bogus.rows.every((u) => u.role !== "STUDENT"));

  const search = await getStaffPage({ q: "listed-counsellor", role: "", sort: "newest", page: 1 });
  assert.deepEqual(search.rows.map((u) => u.id), [stranger.id]);

  const overview = await getSuperAdminOverview();
  assert.equal(overview.staffByRole.length, 6);
  assert.ok(overview.adminAccounts >= 1);
});

test("create staff: creates the chosen role, hashed password, ACTIVE", async () => {
  await signIn(await makeUser("SUPER_ADMIN", "sa"));
  const email = "new.accountant@example.test";
  const before = userCount();
  const target = await redirectTarget(() =>
    createStaffAction(null, form({ name: "New Accountant", email, phone: "", password: "Password-123", role: "ACCOUNTANT" }))
  );
  assert.match(target, /^\/admin\/users\//);
  assert.equal(userCount(), before + 1);
  const row = findUserByEmailInternal(email);
  assert.equal(row.role, "ACCOUNTANT");
  assert.equal(row.status, "ACTIVE");
  assert.notEqual(row.passwordHash, "Password-123");
});

test("create staff: SUPER_ADMIN/STUDENT/TRAINER/garbage roles are rejected and nothing is written", async () => {
  await signIn(await makeUser("SUPER_ADMIN", "sa"));
  for (const role of ["SUPER_ADMIN", "STUDENT", "TRAINER", "NOPE", ""]) {
    const before = userCount();
    const email = `evil-${role || "blank"}@example.test`.toLowerCase();
    const result = await createStaffAction(null, form({ name: "Evil Person", email, phone: "", password: "Password-123", role }));
    assert.equal(result.status, "error", `role ${JSON.stringify(role)}`);
    assert.equal(userCount(), before);
    assert.equal(findUserByEmailInternal(email), null);
  }
  // Domain function enforces it independently of the form validator.
  assert.deepEqual(
    await createStaffAccount({ name: "X Y", email: "direct@example.test", phone: "", password: "Password-123", role: "SUPER_ADMIN" }),
    { ok: false, reason: "invalid_role" }
  );
});

test("create staff: non-super-admins are refused and nothing is written", async () => {
  for (const role of NON_SUPER) {
    await signIn(await makeUser(role, role.toLowerCase()));
    const before = userCount();
    const email = `by-${role}@example.test`.toLowerCase();
    const result = await createStaffAction(null, form({ name: "Sneaky Admin", email, phone: "", password: "Password-123", role: "ADMIN" }));
    assert.equal(result.status, "error", role);
    assert.equal(userCount(), before, `${role} must not create accounts`);
    assert.equal(findUserByEmailInternal(email), null);
  }
  await signOut();
  const result = await createStaffAction(null, form({ name: "Anon Person", email: "anon@example.test", phone: "", password: "Password-123", role: "ADMIN" }));
  assert.equal(result.status, "error");
  assert.equal(findUserByEmailInternal("anon@example.test"), null);
});

test("create staff: duplicate email and weak input are reported without creating", async () => {
  await signIn(await makeUser("SUPER_ADMIN", "sa"));
  const existing = await makeUser("COUNSELLOR", "dupe");
  const before = userCount();

  const dupe = await createStaffAction(null, form({ name: "Dupe Person", email: existing.email, phone: "", password: "Password-123", role: "ADMIN" }));
  assert.equal(dupe.status, "error");
  assert.ok(dupe.errors.email);

  const weak = await createStaffAction(null, form({ name: "A", email: "not-an-email", phone: "", password: "short", role: "ADMIN" }));
  assert.equal(weak.status, "error");
  assert.ok(weak.errors.name && weak.errors.email && weak.errors.password);
  assert.equal(userCount(), before);
  assert.equal("password" in (weak.values || {}), false, "password is never echoed back");
});
