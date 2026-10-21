import { test } from "node:test";
import assert from "node:assert/strict";
import { NextRequest } from "next/server.js";
import { proxy } from "@/proxy";
import { requireArea } from "@/lib/auth/guards";
import { makeUser, signIn, signOut } from "./helpers.mjs";

async function redirectTarget(fn) {
  try {
    await fn();
  } catch (error) {
    if (error.location) return error.location;
    throw error;
  }
  return null;
}

test("proxy redirects an unauthenticated request for a protected route to /login", () => {
  for (const p of ["/student", "/trainer/assignments", "/admin"]) {
    const res = proxy(new NextRequest(`http://localhost:3000${p}`));
    assert.equal(res.status, 307);
    assert.equal(new URL(res.headers.get("location")).pathname, "/login");
  }
});

test("proxy lets public routes and cookie-bearing requests through", () => {
  assert.equal(proxy(new NextRequest("http://localhost:3000/courses")).headers.get("location"), null);
  const withCookie = new NextRequest("http://localhost:3000/student", { headers: { cookie: "techotd_session=x" } });
  assert.equal(proxy(withCookie).headers.get("location"), null);
});

test("guard: no session -> /login", async () => {
  await signOut();
  assert.equal(await redirectTarget(async () => await requireArea("student")), "/login");
});

test("guard: a student cannot enter the trainer area", async () => {
  await signIn(await makeUser("STUDENT", "stu"));
  assert.equal(await redirectTarget(async () => await requireArea("trainer")), "/student");
});

test("guard: a trainer cannot enter the admin area (or the student area)", async () => {
  await signIn(await makeUser("TRAINER", "trn"));
  assert.equal(await redirectTarget(async () => await requireArea("admin")), "/trainer");
  assert.equal(await redirectTarget(async () => await requireArea("student")), "/trainer");
});

test("guard: each role is admitted to its own area", async () => {
  await signIn(await makeUser("STUDENT", "stu"));
  assert.equal(await redirectTarget(async () => await requireArea("student")), null);
  await signIn(await makeUser("TRAINER", "trn"));
  assert.equal(await redirectTarget(async () => await requireArea("trainer")), null);
  await signIn(await makeUser("ADMIN", "adm"));
  assert.equal(await redirectTarget(async () => await requireArea("admin")), null);
});
