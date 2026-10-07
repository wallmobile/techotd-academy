import { test } from "node:test";
import assert from "node:assert/strict";
import { resetPasswordAction } from "@/lib/auth/actions";
import { verifyPassword } from "@/lib/auth/password";
import { createPasswordResetTokenForEmail, getValidPasswordResetToken } from "@/lib/db/passwordResetTokens";
import { createSession, getUserBySessionToken } from "@/lib/db/sessions";
import { findUserByEmailInternal } from "@/lib/db/users";
import { makeUser } from "./helpers.mjs";

function form(values) {
  const fd = new FormData();
  for (const [k, v] of Object.entries(values)) fd.set(k, v);
  return fd;
}

const NEW_PASSWORD = "Brand-New-Pass-77";

test("password reset updates the password, consumes the token and revokes ALL sessions", async () => {
  const user = await makeUser("STUDENT", "reset");
  const s1 = createSession(user.id, { remember: true });
  const s2 = createSession(user.id);
  assert.ok(getUserBySessionToken(s1.token) && getUserBySessionToken(s2.token));

  const other = await makeUser("STUDENT", "bystander");
  const otherSession = createSession(other.id);

  const { token } = createPasswordResetTokenForEmail(user.email);
  assert.ok(getValidPasswordResetToken(token));

  const res = await resetPasswordAction(null, form({ token, password: NEW_PASSWORD, confirmPassword: NEW_PASSWORD }));
  assert.equal(res.status, "success");

  const updated = findUserByEmailInternal(user.email);
  assert.equal(await verifyPassword(NEW_PASSWORD, updated.passwordHash), true);
  // old sessions are dead; another user's session is untouched
  assert.equal(getUserBySessionToken(s1.token), null);
  assert.equal(getUserBySessionToken(s2.token), null);
  assert.ok(getUserBySessionToken(otherSession.token));
  // token consumed: replaying it fails and changes nothing
  assert.equal(getValidPasswordResetToken(token), null);
  const replay = await resetPasswordAction(
    null,
    form({ token, password: "Another-Pass-123", confirmPassword: "Another-Pass-123" })
  );
  assert.equal(replay.status, "error");
  assert.equal(await verifyPassword(NEW_PASSWORD, findUserByEmailInternal(user.email).passwordHash), true);
});

test("an invalid reset token changes nothing and revokes nothing", async () => {
  const user = await makeUser("STUDENT", "reset2");
  const session = createSession(user.id);
  const res = await resetPasswordAction(
    null,
    form({ token: "not-a-real-token", password: NEW_PASSWORD, confirmPassword: NEW_PASSWORD })
  );
  assert.equal(res.status, "error");
  assert.ok(getUserBySessionToken(session.token));
});

test("the reset response never contains a session token, reset token or password", async () => {
  const user = await makeUser("STUDENT", "reset3");
  const session = createSession(user.id);
  const { token } = createPasswordResetTokenForEmail(user.email);
  const res = await resetPasswordAction(null, form({ token, password: NEW_PASSWORD, confirmPassword: NEW_PASSWORD }));
  const body = JSON.stringify(res);
  assert.ok(!body.includes(session.token) && !body.includes(NEW_PASSWORD) && !body.includes(token));
});
