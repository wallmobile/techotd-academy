import { test } from "node:test";
import assert from "node:assert/strict";
import { tdb } from "./tdb.mjs";
import { db } from "@/lib/db/client";
import { changeStaffPassword } from "@/lib/auth/changePassword";
import { changeStaffPasswordAction } from "@/lib/admin/accountActions";
import { verifyPassword } from "@/lib/auth/password";
import { createSession, getUserBySessionToken } from "@/lib/db/sessions";
import { findUserByIdInternal } from "@/lib/db/users";
import { LIMITS } from "@/lib/rateLimit";
import { SESSION_COOKIE_NAME } from "@/lib/auth/session";
import { setRequestHeaders } from "./stubs/headers.mjs";
import { makeUser, signIn, signOut, cookieJar, PASSWORD } from "./helpers.mjs";

const NEW = "Fresh-Staff-Pass-42";
const values = (o = {}) => ({ currentPassword: PASSWORD, password: NEW, confirmPassword: NEW, ...o });
const hashOf = async (id) => (await findUserByIdInternal(id)).passwordHash;
const STAFF = ["SUPER_ADMIN", "ADMIN", "COUNSELLOR", "ACCOUNTANT", "CONTENT_MANAGER", "PLACEMENT_MANAGER"];

function form(v) {
  const fd = new FormData();
  for (const [k, val] of Object.entries(v)) fd.set(k, val);
  return fd;
}

test("every staff role can change its own password: new one works, old one doesn't, ALL other sessions are revoked, a fresh one starts", async () => {
  for (const role of STAFF) {
    const user = await makeUser(role, `pw-${role.toLowerCase()}`);
    const bystander = await makeUser(role, `pw-by-${role.toLowerCase()}`);
    await signIn(user);
    const other = await createSession(user.id);
    const other2 = await createSession(user.id, { remember: true });
    const bystanderSession = await createSession(bystander.id);
    const before = await hashOf(user.id);

    const result = await changeStaffPassword(values());
    assert.deepEqual(result, { ok: true }, role);
    assert.notEqual(await hashOf(user.id), before);
    assert.equal(await verifyPassword(NEW, await hashOf(user.id)), true);
    assert.equal(await verifyPassword(PASSWORD, await hashOf(user.id)), false);
    assert.equal(await getUserBySessionToken(other.token), null, "another device is signed out");
    assert.equal(await getUserBySessionToken(other2.token), null);
    assert.ok(await getUserBySessionToken(bystanderSession.token), "a different account is untouched");
    assert.equal((await tdb.prepare("SELECT COUNT(*) c FROM sessions WHERE user_id = ?").get(user.id)).c, 1, "exactly one fresh session for this browser");
    const fresh = cookieJar().get(SESSION_COOKIE_NAME);
    assert.equal((await getUserBySessionToken(fresh))?.id, user.id, "this browser stays signed in");
    const audit = await tdb.prepare("SELECT action, detail FROM audit_log WHERE entity_id = ? AND action = 'account.password_changed'").all(user.id);
    assert.equal(audit.length, 1);
    assert.ok(!audit[0].detail.includes(NEW) && !audit[0].detail.includes(PASSWORD), "no password data in the audit row");
  }
});

test("wrong current password, weak / mismatched / unchanged new password: refused and nothing changes", async () => {
  const user = await makeUser("ADMIN", "pw-bad");
  await signIn(user);
  const sessionBefore = await createSession(user.id);
  const before = await hashOf(user.id);

  const wrong = await changeStaffPassword(values({ currentPassword: "not-my-password" }));
  assert.deepEqual([wrong.ok, wrong.reason, wrong.errors.currentPassword], [false, "wrong_current", "That current password is incorrect."]);
  const cases = [
    [values({ currentPassword: "" }), "currentPassword"],
    [values({ password: "short", confirmPassword: "short" }), "password"],
    [values({ confirmPassword: "Different-Pass-99" }), "confirmPassword"],
    [values({ password: PASSWORD, confirmPassword: PASSWORD }), "password"],
    [values({ password: "", confirmPassword: "" }), "password"],
  ];
  for (const [input, field] of cases) {
    const r = await changeStaffPassword(input);
    assert.equal(r.ok, false);
    assert.ok(r.errors[field], `${field}: ${JSON.stringify(r.errors)}`);
  }
  assert.equal(await hashOf(user.id), before, "password unchanged");
  assert.ok(await getUserBySessionToken(sessionBefore.token), "sessions are only revoked on success");
});

test("students, trainers and anonymous callers cannot use the staff password change", async () => {
  for (const role of ["STUDENT", "TRAINER"]) {
    const user = await makeUser(role, `pw-no-${role.toLowerCase()}`);
    await signIn(user);
    const before = await hashOf(user.id);
    const r = await changeStaffPassword(values());
    assert.deepEqual([r.ok, r.reason], [false, "forbidden"], role);
    assert.equal(await hashOf(user.id), before);
  }
  await signOut();
  assert.equal((await changeStaffPassword(values())).reason, "forbidden");
});

test("current-password guessing is rate limited per account, even with the right password afterwards", async () => {
  const user = await makeUser("ACCOUNTANT", "pw-rate");
  const other = await makeUser("ACCOUNTANT", "pw-rate-other");
  await signIn(user);
  const before = await hashOf(user.id);
  for (let i = 0; i < LIMITS.changePassword.limit; i += 1) {
    assert.equal((await changeStaffPassword(values({ currentPassword: `wrong-${i}` }))).reason, "wrong_current");
  }
  const locked = await changeStaffPassword(values());
  assert.equal(locked.reason, "rate_limited", "the correct password is refused while locked");
  assert.equal(await hashOf(user.id), before);
  await signIn(other);
  assert.equal((await changeStaffPassword(values())).ok, true, "another account is unaffected");
});

test("the server action never echoes passwords and reports errors per field", async () => {
  const user = await makeUser("COUNSELLOR", "pw-action");
  await signIn(user);
  setRequestHeaders({ "x-forwarded-for": "192.0.2.201" });
  const bad = await changeStaffPasswordAction(null, form(values({ currentPassword: "nope" })));
  assert.equal(bad.status, "error");
  assert.ok(bad.errors.currentPassword);
  assert.ok(!JSON.stringify(bad).includes("nope") && !JSON.stringify(bad).includes(NEW), "no password in the returned state");
  const mismatch = await changeStaffPasswordAction(null, form(values({ confirmPassword: "x" })));
  assert.ok(mismatch.errors.confirmPassword);
  const ok = await changeStaffPasswordAction(null, form(values()));
  assert.equal(ok.status, "success");
  assert.ok(!JSON.stringify(ok).includes(NEW));
  // no student-style forged id field is ever read: the target is always the session user
  const victim = await makeUser("ADMIN", "pw-victim");
  const victimHash = await hashOf(victim.id);
  await changeStaffPasswordAction(null, form({ ...values({ currentPassword: NEW, password: "Another-Pass-77", confirmPassword: "Another-Pass-77" }), userId: victim.id }));
  assert.equal(await hashOf(victim.id), victimHash, "a forged userId changes nothing");
});

test("creating a staff account is audited (actor and role, never the password)", async () => {
  const { createStaffAccount } = await import("@/lib/superAdmin/staff");
  const sa = await makeUser("SUPER_ADMIN", "audit-sa");
  await signIn(sa);
  const created = await createStaffAccount({ name: "Audited Staff", email: `audited-${Date.now()}@example.test`, phone: "", password: "Audit-Staff-Pass-1", role: "ACCOUNTANT" });
  assert.equal(created.ok, true);
  const rows = await tdb.prepare("SELECT actor_user_id, action, detail FROM audit_log WHERE entity_id = ?").all(created.user.id);
  assert.equal(rows.length, 1);
  assert.deepEqual([rows[0].actor_user_id, rows[0].action, JSON.parse(rows[0].detail)], [sa.id, "staff.created", { role: "ACCOUNTANT" }]);
  assert.ok(!rows[0].detail.includes("Audit-Staff-Pass-1"));
  // a refused attempt writes nothing
  const admin = await makeUser("ADMIN", "audit-admin");
  await signIn(admin);
  const refused = await createStaffAccount({ name: "Nope", email: `nope-${Date.now()}@example.test`, phone: "", password: "Audit-Staff-Pass-1", role: "ADMIN" });
  assert.equal(refused.ok, false);
  assert.equal((await tdb.prepare("SELECT COUNT(*) c FROM audit_log WHERE action = 'staff.created'").get()).c, 1);
});
