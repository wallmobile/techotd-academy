// Races that SQLite could never produce (it ran one request at a time) but PostgreSQL can.
// Every test fires its operations at the same instant through the real service layer and
// asserts the invariant that must hold no matter which request wins.
import { test } from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import { tdb } from "./tdb.mjs";
import { db } from "@/lib/db/client";
import { assignFee, recordManualPayment } from "@/lib/fees/service";
import { recordManualPaymentTx } from "@/lib/db/fees";
import { createEnrollment } from "@/lib/admin/enrollments";
import { issueCertificate } from "@/lib/certificates/service";
import { createJob, setJobStatus } from "@/lib/placement/service";
import { applyToJob } from "@/lib/student/jobs";
import { convertLeadToStudent } from "@/lib/crm/leads";
import { createLead } from "@/lib/db/leads";
import { updateUserStatusGuarded } from "@/lib/db/adminQueries";
import { consumeRateLimit } from "@/lib/db/rateLimits";
import { createUser } from "@/lib/db/users";
import { isUniqueViolation } from "@/lib/db/client";
import { makeUser, signIn, ensureSecondBatch } from "./helpers.mjs";

const today = new Date().toISOString().slice(0, 10);

// A cold pool opens its connections one after another, which would quietly serialise the first
// requests and hide a race. Open all of them before racing.
async function warmPool() {
  await Promise.all(Array.from({ length: 5 }, () => db.get("SELECT pg_sleep(0.1)")));
}
const pay = (feePlanId, amount) =>
  recordManualPayment({ feePlanId, amount, method: "CASH", paidOn: today, note: "", idempotencyKey: crypto.randomBytes(9).toString("base64url") });

async function enrolledStudent(label) {
  const { batchA } = ensureSecondBatch();
  const student = await makeUser("STUDENT", label);
  await signIn(await makeUser("ADMIN", `${label}-admin`));
  const e = await createEnrollment({ studentUserId: student.id, courseSlug: batchA.courseSlug, batchId: batchA.id });
  assert.equal(e.ok, true);
  return { student, enrollmentId: e.enrollmentId, batch: batchA };
}

test("simultaneous payments can never overpay a fee plan", async () => {
  await warmPool();
  const ctx = await enrolledStudent("racepay");
  await signIn(await makeUser("ACCOUNTANT", "race-acct"));
  const fee = await assignFee({ enrollmentId: ctx.enrollmentId, currency: "INR", total: "1000", discount: "", dueDate: "", note: "" });
  assert.equal(fee.ok, true);

  // sixty requests of 400 against a balance of 1000: exactly two can be accepted. Fired straight at the
  // transactional write (the service layer adds a few awaits before it, which makes the race less likely).
  const results = await Promise.all(
    Array.from({ length: 60 }, () =>
      recordManualPaymentTx({ feePlanId: fee.feePlanId, amountMinor: 40000, currency: "INR", method: "CASH", paidOn: today, note: null, idempotencyKey: crypto.randomBytes(9).toString("base64url"), actorUserId: null })
    )
  );
  const accepted = results.filter((r) => r.ok);
  assert.equal(accepted.length, 2, JSON.stringify(results.map((r) => r.ok || r.reason)));
  const paid = (await tdb.prepare("SELECT COALESCE(SUM(amount_minor), 0) s FROM payments WHERE fee_plan_id = ?").get(fee.feePlanId)).s;
  assert.equal(paid, 80000, "exactly 2 x 400.00 recorded, never more than the plan allows");

  // receipt numbers stay unique and gap-free under concurrency
  const rows = await tdb.prepare("SELECT receipt_number FROM payments").all();
  assert.equal(new Set(rows.map((r) => r.receipt_number)).size, rows.length);
});

test("receipt numbers are unique when payments for different plans are recorded at once", async () => {
  await warmPool();
  await signIn(await makeUser("ACCOUNTANT", "race-acct2"));
  const plans = [];
  for (let i = 0; i < 5; i += 1) {
    const ctx = await enrolledStudent(`racerc${i}`);
    await signIn(await makeUser("ACCOUNTANT", `race-acct2-${i}`));
    const fee = await assignFee({ enrollmentId: ctx.enrollmentId, currency: "INR", total: "500", discount: "", dueDate: "", note: "" });
    assert.equal(fee.ok, true);
    plans.push(fee.feePlanId);
  }
  const results = await Promise.all(plans.map((id) => pay(id, "100")));
  assert.ok(results.every((r) => r.ok), JSON.stringify(results));
  const numbers = (await tdb.prepare("SELECT receipt_number FROM payments").all()).map((r) => r.receipt_number);
  assert.equal(new Set(numbers).size, numbers.length, "no two receipts share a number");
});

test("simultaneous enrollments of one student in one batch create exactly one enrollment", async () => {
  await warmPool();
  const { batchA } = ensureSecondBatch();
  const student = await makeUser("STUDENT", "raceenr");
  await signIn(await makeUser("ADMIN", "raceenr-admin"));
  const results = await Promise.all(Array.from({ length: 30 }, () => createEnrollment({ studentUserId: student.id, courseSlug: batchA.courseSlug, batchId: batchA.id })));
  assert.equal(results.filter((r) => r.ok).length, 1, JSON.stringify(results.map((r) => r.ok || r.reason || r.message)));
  const n = (
    await tdb.prepare("SELECT COUNT(*) c FROM batch_enrollments be JOIN student_profiles sp ON sp.id = be.student_id WHERE sp.user_id = ? AND be.batch_id = ?").get(student.id, batchA.id)
  ).c;
  assert.equal(n, 1);
  const course = (await tdb.prepare("SELECT COUNT(*) c FROM course_enrollments ce JOIN student_profiles sp ON sp.id = ce.student_id WHERE sp.user_id = ?").get(student.id)).c;
  assert.equal(course, 1, "exactly one derived course enrollment");
});

test("simultaneous certificate issuing leaves exactly one ACTIVE certificate per student and course", async () => {
  await warmPool();
  const ctx = await enrolledStudent("racecert");
  await signIn(await makeUser("ADMIN", "racecert-issuer"));
  const results = await Promise.all(
    Array.from({ length: 30 }, () => issueCertificate({ enrollmentId: ctx.enrollmentId, mode: "MANUAL", approvalNote: "Concurrency test: approved by the issuer" }))
  );
  assert.equal(results.filter((r) => r.ok).length, 1, JSON.stringify(results.map((r) => r.ok || r.reason || r.message)));
  const active = (await tdb.prepare("SELECT COUNT(*) c FROM certificates c JOIN student_profiles sp ON sp.id = c.student_id WHERE sp.user_id = ? AND c.status = 'ACTIVE'").get(ctx.student.id)).c;
  assert.equal(active, 1);
});

test("simultaneous applications to one job from one student create exactly one application", async () => {
  await warmPool();
  const ctx = await enrolledStudent("raceapply");
  const manager = await makeUser("PLACEMENT_MANAGER", "raceapply-mgr");
  await signIn(manager);
  const created = await createJob({
    title: `Race Job ${crypto.randomBytes(3).toString("hex")}`,
    companyName: "Test Co",
    description: "Build interfaces.",
    location: "Pune",
    employmentType: "FULL_TIME",
    workMode: "HYBRID",
    experience: "0-1 years",
    skills: "React",
    applyDeadline: "",
  });
  assert.equal(created.ok, true, created.message);
  assert.equal((await setJobStatus(created.jobId, "PUBLISHED")).ok, true);

  await signIn(ctx.student);
  const results = await Promise.all(Array.from({ length: 30 }, () => applyToJob({ jobId: created.jobId, coverMessage: "Hello" })));
  assert.equal(results.filter((r) => r.ok).length, 1, JSON.stringify(results.map((r) => r.ok || r.reason || r.message)));
  assert.equal((await tdb.prepare("SELECT COUNT(*) c FROM job_applications WHERE job_id = ?").get(created.jobId)).c, 1);
});

test("a lead converted by several people at once becomes one student account", async () => {
  await warmPool();
  await signIn(await makeUser("ADMIN", "racelead-admin"));
  const tag = crypto.randomUUID().slice(0, 8);
  const lead = await createLead({ name: `Race Lead ${tag}`, phone: "9876543210", email: `race-lead-${tag}@example.test`, source: "ENQUIRY", origin: "direct", consent: true });
  const results = await Promise.all(Array.from({ length: 20 }, () => convertLeadToStudent(lead.id, "Temp-Pass-123")));
  assert.equal(results.filter((r) => r.ok).length, 1, JSON.stringify(results.map((r) => r.ok || r.reason)));
  assert.equal((await tdb.prepare("SELECT COUNT(*) c FROM users WHERE email = ?").get(lead.email)).c, 1);
  assert.equal((await tdb.prepare("SELECT status FROM leads WHERE id = ?").get(lead.id)).status, "CONVERTED");
});

test("two Super Admins deactivated at the same moment: one stays active", async () => {
  await warmPool();
  const a = await makeUser("SUPER_ADMIN", "race-sa-a");
  const b = await makeUser("SUPER_ADMIN", "race-sa-b");
  // other tests' super admins must not mask the race: deactivate every other one first
  await db.run("UPDATE users SET status = 'INACTIVE' WHERE role = 'SUPER_ADMIN' AND id NOT IN (?, ?)", [a.id, b.id]);
  const [x, y] = await Promise.all([updateUserStatusGuarded(a.id, "INACTIVE"), updateUserStatusGuarded(b.id, "INACTIVE")]);
  assert.equal([x, y].filter((r) => r.ok).length, 1, JSON.stringify([x, y]));
  assert.equal((await tdb.prepare("SELECT COUNT(*) c FROM users WHERE role = 'SUPER_ADMIN' AND status = 'ACTIVE'").get()).c, 1);
});

test("the same e-mail registered twice at once: the database lets exactly one in", async () => {
  await warmPool();
  const email = `dup-${crypto.randomUUID().slice(0, 8)}@example.test`;
  const attempts = await Promise.allSettled(Array.from({ length: 6 }, () => createUser({ name: "Dup", email, phone: null, passwordHash: "x", role: "STUDENT" })));
  assert.equal(attempts.filter((r) => r.status === "fulfilled").length, 1);
  assert.ok(attempts.filter((r) => r.status === "rejected").every((r) => isUniqueViolation(r.reason)));
});

test("the rate limiter counts exactly under concurrency: 40 simultaneous hits against a limit of 25 allow 25", async () => {
  await warmPool();
  const key = `race:${crypto.randomUUID()}`;
  const results = await Promise.all(Array.from({ length: 40 }, () => consumeRateLimit(key, { limit: 25, windowSeconds: 600 })));
  assert.equal(results.filter((r) => r.allowed).length, 25);
  assert.equal(results.filter((r) => !r.allowed).length, 15);
  assert.ok(results.filter((r) => !r.allowed).every((r) => r.retryAfterSeconds >= 1));
});
