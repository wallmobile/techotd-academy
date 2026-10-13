import { test } from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import { db } from "@/lib/db/client";
import { notify, safeNotify, processDeliveries, backoffSeconds } from "@/lib/notifications/service";
import { sendEmail, getEmailConfig, buildEmailContent, isValidRecipient } from "@/lib/notifications/email";
import { sendWhatsApp, whatsAppStatus, isValidWhatsAppNumber, WHATSAPP_TEMPLATES } from "@/lib/notifications/whatsapp";
import { getMyFeed } from "@/lib/notifications/feed";
import { markReadFormAction, markAllReadFormAction, processQueueAction, retryFailedAction } from "@/lib/notifications/actions";
import { listNotificationsForUser, countUnreadForUser, markNotificationRead } from "@/lib/db/notifications";
import { getDeliveryForNotification, deliveryStatusCounts } from "@/lib/db/notificationDeliveries";
import { getMyNotifications } from "@/lib/student/notifications";
import { markNotificationReadAction } from "@/lib/student/notificationActions";
import { POST as cronProcess } from "@/app/api/notifications/process/route";
import { createEnrollment, setEnrollmentStatus } from "@/lib/admin/enrollments";
import { assignFee, recordManualPayment, voidPayment } from "@/lib/fees/service";
import { issueCertificate, revokeCertificate } from "@/lib/certificates/service";
import { createJob, setJobStatus, updateApplicationStatus, confirmPlacement } from "@/lib/placement/service";
import { applyToJob } from "@/lib/student/jobs";
import { assignLead } from "@/lib/crm/leads";
import { createLead } from "@/lib/db/leads";
import { getOrCreateStudentProfile } from "@/lib/db/studentProfiles";
import { markLessonComplete } from "@/lib/db/lessonProgress";
import { getCourseBySlug } from "@/data/courses";
import { getCourseCurriculum } from "@/lib/student/curriculum";
import { makeUser, signIn, signOut, ensureSecondBatch } from "./helpers.mjs";

const EMAIL_ENV = { EMAIL_PROVIDER: "resend", RESEND_API_KEY: "re_test_key_do_not_log", EMAIL_FROM: "Academy <no-reply@example.test>" };

// Run `fn` with the email provider env set (and a scripted global fetch).
async function withEmail(responder, fn) {
  const savedEnv = Object.fromEntries(Object.keys(EMAIL_ENV).map((k) => [k, process.env[k]]));
  const savedFetch = globalThis.fetch;
  const calls = [];
  Object.assign(process.env, EMAIL_ENV);
  globalThis.fetch = async (url, init) => {
    calls.push({ url, init, body: JSON.parse(init.body) });
    return responder(calls.length, init);
  };
  try {
    return await fn(calls);
  } finally {
    globalThis.fetch = savedFetch;
    for (const [k, v] of Object.entries(savedEnv)) {
      if (v === undefined) delete process.env[k];
      else process.env[k] = v;
    }
  }
}
const ok = (id = "msg_1") => ({ ok: true, status: 200, json: async () => ({ id }) });
const status = (code) => ({ ok: false, status: code, json: async () => ({ error: "secret provider detail" }) });

function form(values) {
  const fd = new FormData();
  for (const [k, v] of Object.entries(values)) fd.set(k, v);
  return fd;
}
const unread = (userId) => countUnreadForUser(userId);
const feedOf = (userId) => listNotificationsForUser(userId);
const key = () => `test:${crypto.randomUUID()}`;
const makeDue = (id) => db.prepare("UPDATE notification_deliveries SET next_attempt_at = datetime('now', '-1 second') WHERE id = ?").run(id);

// ------------------------------------------------------------- in-app basics
test("a notification is created, idempotent per event key, and scoped to its recipient", async () => {
  const a = await makeUser("STUDENT", "notifA");
  const b = await makeUser("STUDENT", "notifB");
  const k = key();
  const first = notify({ userId: a.id, type: "GENERAL", title: "Hello", message: "World", eventKey: k });
  assert.equal(first.created, true);
  const again = notify({ userId: a.id, type: "GENERAL", title: "Hello", message: "World", eventKey: k });
  assert.equal(again.created, false);
  assert.equal(again.notificationId, first.notificationId);
  assert.equal(feedOf(a.id).length, 1);
  // same key for another user is a different notification
  assert.equal(notify({ userId: b.id, type: "GENERAL", title: "Hello", message: "World", eventKey: k }).created, true);
  assert.throws(() => notify({ userId: a.id, type: "GENERAL", title: "x", message: "y" }), /eventKey/);
});

test("unread count, mark-as-read and mark-all-read are per user; viewing the feed never marks anything read", async () => {
  const a = await makeUser("STUDENT", "readA");
  const b = await makeUser("STUDENT", "readB");
  const n1 = notify({ userId: a.id, type: "GENERAL", title: "One", message: "m", eventKey: key() });
  notify({ userId: a.id, type: "GENERAL", title: "Two", message: "m", eventKey: key() });
  notify({ userId: b.id, type: "GENERAL", title: "Mine", message: "m", eventKey: key() });
  assert.equal(unread(a.id), 2);

  await signIn(a);
  const feed = await getMyFeed({ page: 1 });
  assert.equal(feed.notifications.length, 2);
  assert.equal(feed.unreadCount, 2);
  assert.equal(unread(a.id), 2, "rendering the feed did not mark anything read");
  assert.ok(feed.notifications.every((n) => n.userId === a.id), "only the signed-in user's rows");

  // another user's notification id is a no-op
  await signIn(b);
  await markReadFormAction(form({ notificationId: n1.notificationId }));
  assert.equal(unread(a.id), 2);
  assert.equal(markNotificationRead(b.id, n1.notificationId), null, "not even addressable via the db helper");

  await signIn(a);
  await markReadFormAction(form({ notificationId: n1.notificationId }));
  assert.equal(unread(a.id), 1);
  await markAllReadFormAction();
  assert.equal(unread(a.id), 0);
  assert.equal(unread(b.id), 1, "someone else's unread is untouched");

  await signOut();
  await markAllReadFormAction();
  assert.equal(unread(b.id), 1, "no session, no effect");
});

test("the feed is bounded and paginated", async () => {
  const u = await makeUser("STUDENT", "paged");
  for (let i = 0; i < 25; i += 1) notify({ userId: u.id, type: "GENERAL", title: `n${i}`, message: "m", eventKey: key() });
  await signIn(u);
  const p1 = await getMyFeed({ page: 1 });
  assert.equal(p1.notifications.length, 20);
  assert.equal(p1.totalPages, 2);
  assert.equal((await getMyFeed({ page: 2 })).notifications.length, 5);
  assert.equal((await getMyFeed({ page: 99 })).page, 2);
});

test("existing Student LMS notification behavior still works (list, unread, mark read by action)", async () => {
  const s = await makeUser("STUDENT", "lmsnotif");
  const n = notify({ userId: s.id, type: "COURSE", title: "Legacy", message: "m", eventKey: key() });
  await signIn(s);
  const mine = await getMyNotifications();
  assert.equal(mine.unreadCount, 1);
  assert.equal(mine.notifications[0].title, "Legacy");
  const res = await markNotificationReadAction(n.notificationId);
  assert.equal(res.ok, true);
  assert.equal(res.unreadCount, 0);
});

// ------------------------------------------------------------------- events
async function enrolledStudent(label) {
  const { batchA } = ensureSecondBatch();
  const student = await makeUser("STUDENT", label);
  const admin = await makeUser("ADMIN", "evt-admin");
  await signIn(admin);
  const res = await createEnrollment({ studentUserId: student.id, courseSlug: batchA.courseSlug, batchId: batchA.id });
  assert.equal(res.ok, true);
  return { student, admin, enrollmentId: res.enrollmentId, batch: batchA };
}
const titles = (userId) => feedOf(userId).map((n) => n.title);

test("enrollment events notify the student once; a rejected or repeated action stays silent", async () => {
  const { student, admin, enrollmentId, batch } = await enrolledStudent("evtEnr");
  assert.deepEqual(titles(student.id), ["You've been enrolled"]);
  assert.equal(feedOf(student.id)[0].type, "ENROLLMENT");
  assert.equal(feedOf(student.id)[0].link, "/student/batches");

  // a duplicate (rejected) enrollment does not notify
  await signIn(admin);
  assert.equal((await createEnrollment({ studentUserId: student.id, courseSlug: batch.courseSlug, batchId: batch.id })).ok, false);
  assert.equal(feedOf(student.id).length, 1);

  assert.equal((await setEnrollmentStatus(enrollmentId, "COMPLETED")).ok, true);
  assert.equal(feedOf(student.id).length, 2);
  // the same status again is a no-op, not a second notification
  assert.equal((await setEnrollmentStatus(enrollmentId, "COMPLETED")).ok, true);
  assert.equal(feedOf(student.id).length, 2);
  await setEnrollmentStatus(enrollmentId, "CANCELLED");
  assert.equal(feedOf(student.id).length, 3);
  // an invalid request notifies nobody
  assert.equal((await setEnrollmentStatus(enrollmentId, "BOGUS")).ok, false);
  assert.equal(feedOf(student.id).length, 3);
});

test("fee and payment events notify the right student with no amounts or references", async () => {
  const { student, enrollmentId } = await enrolledStudent("evtFee");
  const accountant = await makeUser("ACCOUNTANT", "evt-acct");
  await signIn(accountant);
  const fee = await assignFee({ enrollmentId, currency: "INR", total: "123456.78", discount: "", dueDate: "", note: "" });
  assert.equal(fee.ok, true);
  const before = feedOf(student.id).length;
  const pay = await recordManualPayment({ feePlanId: fee.feePlanId, amount: "7777.77", method: "CASH", paidOn: new Date().toISOString().slice(0, 10), note: "", idempotencyKey: "evt-key-12345678" });
  assert.equal(pay.ok, true);
  assert.equal(feedOf(student.id).length, before + 1);

  // overpayment (rejected) and a duplicate key send nothing
  await recordManualPayment({ feePlanId: fee.feePlanId, amount: "99999999", method: "CASH", paidOn: new Date().toISOString().slice(0, 10), note: "", idempotencyKey: "evt-key-87654321" });
  await recordManualPayment({ feePlanId: fee.feePlanId, amount: "7777.77", method: "CASH", paidOn: new Date().toISOString().slice(0, 10), note: "", idempotencyKey: "evt-key-12345678" });
  assert.equal(feedOf(student.id).length, before + 1);

  assert.equal((await voidPayment({ paymentId: pay.paymentId, reason: "entered twice" })).ok, true);
  assert.equal((await voidPayment({ paymentId: pay.paymentId, reason: "again" })).ok, false);
  const all = feedOf(student.id);
  assert.equal(all.length, before + 2);
  const text = JSON.stringify(all);
  for (const sensitive of ["123456", "7777", "123,456", "RCPT-", "entered twice", student.email]) assert.ok(!text.includes(sensitive), sensitive);
});

test("a failed financial transaction rolls back with no notification (no phantom 'payment recorded')", async () => {
  const { student, enrollmentId } = await enrolledStudent("evtRollback");
  await signIn(await makeUser("ACCOUNTANT", "evt-acct2"));
  const fee = await assignFee({ enrollmentId, currency: "INR", total: "500", discount: "", dueDate: "", note: "" });
  const before = feedOf(student.id).length;
  db.exec(`CREATE TRIGGER fail_pay_audit BEFORE INSERT ON audit_log WHEN NEW.action = 'PAYMENT_RECORDED'
           BEGIN SELECT RAISE(ABORT, 'simulated failure'); END;`);
  try {
    await assert.rejects(() =>
      recordManualPayment({ feePlanId: fee.feePlanId, amount: "100", method: "CASH", paidOn: new Date().toISOString().slice(0, 10), note: "", idempotencyKey: "rollback-key-1" })
    );
  } finally {
    db.exec("DROP TRIGGER fail_pay_audit");
  }
  assert.equal(feedOf(student.id).length, before);
});

test("certificate, placement and CRM events reach exactly the intended recipient", async () => {
  // certificates
  const { student, admin, enrollmentId, batch } = await enrolledStudent("evtCert");
  const profile = getOrCreateStudentProfile(student.id);
  const course = getCourseBySlug(batch.courseSlug);
  for (const l of getCourseCurriculum(course).flatLessons) markLessonComplete(profile.id, course.slug, l.moduleIndex, l.itemIndex);
  await signIn(admin);
  await setEnrollmentStatus(enrollmentId, "COMPLETED");
  const cert = await issueCertificate({ enrollmentId, mode: "AUTO" });
  assert.equal(cert.ok, true);
  assert.ok(titles(student.id).includes("Your certificate is ready"));
  const link = feedOf(student.id).find((n) => n.type === "CERTIFICATE").link;
  assert.equal(link, `/student/certificates/${cert.certificateId}`);
  await issueCertificate({ enrollmentId, mode: "AUTO" }); // duplicate -> rejected
  assert.equal(feedOf(student.id).filter((n) => n.type === "CERTIFICATE").length, 1);
  await revokeCertificate({ certificateId: cert.certificateId, reason: "Issued in error" });
  const certTexts = feedOf(student.id).filter((n) => n.type === "CERTIFICATE").map((n) => n.message).join(" ");
  assert.ok(!certTexts.includes("Issued in error"), "the staff reason is not in the notification");
  assert.equal(feedOf(student.id).filter((n) => n.type === "CERTIFICATE").length, 2);

  // placement
  const plc = await makeUser("PLACEMENT_MANAGER", "evt-plc");
  await signIn(plc);
  const job = await createJob({ title: "Evt Job", companyName: "Co", description: "d", employmentType: "FULL_TIME", workMode: "ONSITE", location: "", experience: "", skills: "", applyDeadline: "" });
  await setJobStatus(job.jobId, "PUBLISHED");
  await signIn(student);
  assert.equal((await applyToJob({ jobId: job.jobId, coverMessage: "" })).ok, true);
  const appId = db.prepare("SELECT id FROM job_applications WHERE job_id = ?").get(job.jobId).id;
  await signIn(plc);
  await updateApplicationStatus({ applicationId: appId, status: "SHORTLISTED" });
  await updateApplicationStatus({ applicationId: appId, status: "SHORTLISTED" }); // unchanged -> silent
  await updateApplicationStatus({ applicationId: appId, status: "SELECTED" }); // invalid skip -> silent
  const appNotes = feedOf(student.id).filter((n) => n.type === "PLACEMENT");
  assert.equal(appNotes.length, 1);
  assert.match(appNotes[0].message, /Evt Job/);
  await updateApplicationStatus({ applicationId: appId, status: "INTERVIEW" });
  await updateApplicationStatus({ applicationId: appId, status: "SELECTED" });
  await confirmPlacement({ applicationId: appId });
  await confirmPlacement({ applicationId: appId }); // already confirmed -> silent
  assert.equal(feedOf(student.id).filter((n) => n.title === "Placement confirmed").length, 1);
  assert.ok(!JSON.stringify(feedOf(student.id)).includes("staff"), "no internal notes in notifications");

  // CRM: assigning to someone else notifies them; self-claim / no-change / unassign do not
  const manager = await makeUser("ADMIN", "evt-mgr");
  const counsellor = await makeUser("COUNSELLOR", "evt-cns");
  const lead = createLead({ name: "Lead X", phone: "9876543210", email: `leadx-${crypto.randomUUID().slice(0, 6)}@example.test`, source: "ENQUIRY", consent: true });
  await signIn(manager);
  assert.equal((await assignLead(lead.id, counsellor.id)).ok, true);
  assert.equal(feedOf(counsellor.id).length, 1);
  assert.equal(feedOf(counsellor.id)[0].link, `/admin/leads/${lead.id}`);
  assert.ok(!JSON.stringify(feedOf(counsellor.id)).includes("Lead X"), "no lead personal data in the notification");
  await assignLead(lead.id, counsellor.id); // unchanged
  assert.equal(feedOf(counsellor.id).length, 1);
  await assignLead(lead.id, manager.id); // to self
  assert.equal(feedOf(manager.id).length, 0);
});

// --------------------------------------------------------------------- email
test("with no provider configured, in-app works and email is recorded as SKIPPED — never as sent", async () => {
  assert.equal(getEmailConfig(), null);
  const u = await makeUser("STUDENT", "noemail");
  const r = notify({ userId: u.id, type: "GENERAL", title: "T", message: "M", eventKey: key() });
  assert.equal(r.created, true);
  assert.equal(r.email, "SKIPPED");
  const d = getDeliveryForNotification(r.notificationId, "EMAIL");
  assert.equal(d.status, "SKIPPED");
  assert.equal(d.lastError, "provider_not_configured");
  assert.equal(d.attempts, 0);
  const summary = await processDeliveries({ limit: 10 });
  assert.equal(summary.processed, 0, "nothing is processed or sent without a provider");
  assert.equal(feedOf(u.id).length, 1);
});

test("with a provider configured, an email is queued, sent via the adapter and recorded as SENT (accepted, not delivered)", async () => {
  const u = await makeUser("STUDENT", "withemail");
  await withEmail(
    () => ok("provider-msg-42"),
    async (calls) => {
      const r = await safeNotify({ userId: u.id, type: "FEE", title: "Payment recorded", message: "A payment was recorded.", link: "/student/fees", eventKey: key() });
      assert.equal(r.email, "QUEUED");
      assert.equal(calls.length, 1);
      assert.equal(calls[0].url, "https://api.resend.com/emails");
      assert.equal(calls[0].init.headers.Authorization, `Bearer ${EMAIL_ENV.RESEND_API_KEY}`);
      assert.deepEqual(calls[0].body.to, [u.email]);
      assert.equal(calls[0].body.from, EMAIL_ENV.EMAIL_FROM);
      assert.equal(calls[0].body.subject, "Payment recorded");
      assert.ok(!JSON.stringify(calls[0].body).includes(EMAIL_ENV.RESEND_API_KEY), "the key is never in the message");
      const d = getDeliveryForNotification(r.notificationId, "EMAIL");
      assert.equal(d.status, "SENT");
      assert.equal(d.providerMessageId, "provider-msg-42");
      assert.equal(d.attempts, 1);
      // the same event again: no second notification, no second email
      await safeNotify({ userId: u.id, type: "FEE", title: "Payment recorded", message: "A payment was recorded.", eventKey: db.prepare("SELECT event_key k FROM notifications WHERE id = ?").get(r.notificationId).k });
      assert.equal(calls.length, 1);
    }
  );
});

test("email content is escaped and carries no secrets; only active users with a valid address are emailed", async () => {
  const content = buildEmailContent({ title: "<b>Hi</b>", message: "A <script>alert(1)</script> & \"quote\"", link: "/student/fees" });
  assert.ok(!content.html.includes("<script>"));
  assert.ok(content.html.includes("&lt;script&gt;"));
  assert.equal(content.subject, "<b>Hi</b>", "subject is plain text, not HTML");
  assert.equal(isValidRecipient("a@b.co"), true);
  for (const bad of ["", "no-at", "a@b", "a b@c.de", "x@y.z\nBcc: evil@e.com", null, undefined, 5]) assert.equal(isValidRecipient(bad), false, String(bad));

  const inactive = await makeUser("STUDENT", "inactiveEmail");
  db.prepare("UPDATE users SET status = 'INACTIVE' WHERE id = ?").run(inactive.id);
  await withEmail(
    () => ok(),
    async (calls) => {
      const r = notify({ userId: inactive.id, type: "GENERAL", title: "T", message: "M", eventKey: key() });
      assert.equal(r.email, "SKIPPED");
      assert.equal(getDeliveryForNotification(r.notificationId, "EMAIL").lastError, "inactive_user");
      await processDeliveries({ limit: 10 });
      assert.equal(calls.length, 0);
    }
  );
});

test("transient provider failures retry with backoff up to the limit, then FAIL; permanent failures fail at once", async () => {
  const u = await makeUser("STUDENT", "retry");
  await withEmail(
    () => status(503),
    async (calls) => {
      const r = notify({ userId: u.id, type: "GENERAL", title: "T", message: "M", eventKey: key() });
      const id = getDeliveryForNotification(r.notificationId, "EMAIL").id;

      await processDeliveries({ limit: 10 });
      let d = getDeliveryForNotification(r.notificationId, "EMAIL");
      assert.equal(d.status, "QUEUED");
      assert.equal(d.attempts, 1);
      assert.equal(d.lastError, "http_503");
      // not due yet -> not retried immediately
      assert.equal((await processDeliveries({ limit: 10 })).processed, 0);
      assert.equal(calls.length, 1);

      makeDue(id);
      await processDeliveries({ limit: 10 });
      d = getDeliveryForNotification(r.notificationId, "EMAIL");
      assert.equal(d.status, "QUEUED");
      assert.equal(d.attempts, 2);

      makeDue(id);
      await processDeliveries({ limit: 10 });
      d = getDeliveryForNotification(r.notificationId, "EMAIL");
      assert.equal(d.status, "FAILED", "attempts exhausted");
      assert.equal(d.attempts, 3);
      makeDue(id);
      assert.equal((await processDeliveries({ limit: 10 })).processed, 0, "a failed delivery never loops");
      assert.equal(calls.length, 3);
      assert.ok(backoffSeconds(1) < backoffSeconds(2) && backoffSeconds(2) < backoffSeconds(3));
    }
  );
  await withEmail(
    () => status(422),
    async (calls) => {
      const r = notify({ userId: u.id, type: "GENERAL", title: "T2", message: "M", eventKey: key() });
      await processDeliveries({ limit: 10 });
      const d = getDeliveryForNotification(r.notificationId, "EMAIL");
      assert.equal(d.status, "FAILED");
      assert.equal(d.attempts, 1, "permanent errors are not retried");
      assert.equal(d.lastError, "http_422");
      assert.equal(calls.length, 1);
      assert.ok(!JSON.stringify(d).includes("secret provider detail"), "provider response bodies are never stored");
    }
  );
});

test("network errors and timeouts are retryable; a throwing fetch can't break the business operation", async () => {
  const u = await makeUser("STUDENT", "neterr");
  const saved = globalThis.fetch;
  const savedEnv = Object.fromEntries(Object.keys(EMAIL_ENV).map((k) => [k, process.env[k]]));
  Object.assign(process.env, EMAIL_ENV);
  globalThis.fetch = async () => {
    throw new TypeError("connect ECONNREFUSED 10.0.0.1:443 with re_test_key_do_not_log");
  };
  const logged = [];
  const originalError = console.error;
  console.error = (...a) => logged.push(a.join(" "));
  try {
    const result = await sendEmail({ to: u.email, subject: "s", text: "t", html: "h" });
    assert.deepEqual(result, { ok: false, retryable: true, code: "network_error" });
    const r = await safeNotify({ userId: u.id, type: "GENERAL", title: "T", message: "M", eventKey: key() });
    assert.equal(r.email, "QUEUED", "the operation completed even though delivery failed");
    assert.equal(getDeliveryForNotification(r.notificationId, "EMAIL").status, "QUEUED");
  } finally {
    console.error = originalError;
    globalThis.fetch = saved;
    for (const [k, v] of Object.entries(savedEnv)) {
      if (v === undefined) delete process.env[k];
      else process.env[k] = v;
    }
  }
  assert.ok(!logged.join("\n").includes("re_test_key_do_not_log"), "no secrets in logs");
});

test("stale SENDING deliveries are recovered; two workers can't send the same delivery twice", async () => {
  const u = await makeUser("STUDENT", "stale");
  await withEmail(
    () => ok("m"),
    async (calls) => {
      const r = notify({ userId: u.id, type: "GENERAL", title: "T", message: "M", eventKey: key() });
      const id = getDeliveryForNotification(r.notificationId, "EMAIL").id;
      db.prepare("UPDATE notification_deliveries SET status = 'SENDING', attempts = 1, updated_at = datetime('now', '-1 hour') WHERE id = ?").run(id);
      await processDeliveries({ limit: 10 });
      assert.equal(getDeliveryForNotification(r.notificationId, "EMAIL").status, "SENT");
      assert.equal(calls.length, 1);

      // a delivery that is freshly SENDING (another worker has it) is left alone
      const r2 = notify({ userId: u.id, type: "GENERAL", title: "T2", message: "M", eventKey: key() });
      const id2 = getDeliveryForNotification(r2.notificationId, "EMAIL").id;
      db.prepare("UPDATE notification_deliveries SET status = 'SENDING', attempts = 1, updated_at = datetime('now') WHERE id = ?").run(id2);
      await processDeliveries({ limit: 10 });
      assert.equal(getDeliveryForNotification(r2.notificationId, "EMAIL").status, "SENDING");
      assert.equal(calls.length, 1);
    }
  );
});

// -------------------------------------------------------- operator & scheduler
test("only admins can process or retry the queue; the cron endpoint needs its secret", async () => {
  const u = await makeUser("STUDENT", "ops");
  await withEmail(
    () => status(500),
    async (calls) => {
      const r = notify({ userId: u.id, type: "GENERAL", title: "T", message: "M", eventKey: key() });
      const id = getDeliveryForNotification(r.notificationId, "EMAIL").id;
      db.prepare("UPDATE notification_deliveries SET status = 'FAILED', attempts = 3 WHERE id = ?").run(id);
      // a due, QUEUED delivery too: an unauthorized "process queue" must not send it
      const queued = notify({ userId: u.id, type: "GENERAL", title: "Queued", message: "M", eventKey: key() });
      assert.equal(getDeliveryForNotification(queued.notificationId, "EMAIL").status, "QUEUED");

      for (const role of [null, "STUDENT", "TRAINER", "COUNSELLOR", "ACCOUNTANT"]) {
        if (role) await signIn(await makeUser(role, "intruder"));
        else await signOut();
        await retryFailedAction();
        await processQueueAction();
      }
      assert.equal(getDeliveryForNotification(r.notificationId, "EMAIL").status, "FAILED", "unauthorized callers changed nothing");
      assert.equal(calls.length, 0, "no email was sent by an unauthorized caller");
      assert.equal(getDeliveryForNotification(queued.notificationId, "EMAIL").status, "QUEUED");

      // the cron endpoint: disabled without CRON_SECRET, 404 on a wrong secret, works with the right one
      const call = (secret) => cronProcess(new Request("http://localhost/api/notifications/process", { method: "POST", headers: secret ? { "x-cron-secret": secret } : {} }));
      delete process.env.CRON_SECRET;
      assert.equal((await call("anything")).status, 404);
      process.env.CRON_SECRET = "cron-secret-for-tests";
      try {
        assert.equal((await call(null)).status, 404);
        assert.equal((await call("wrong")).status, 404);
        const good = await call("cron-secret-for-tests");
        assert.equal(good.status, 200);
        assert.equal(typeof (await good.json()).processed, "number");
      } finally {
        delete process.env.CRON_SECRET;
      }

      await signIn(await makeUser("ADMIN", "ops-admin"));
      await retryFailedAction();
      assert.ok(calls.length >= 1, "an admin retry re-attempts failed deliveries");
      const after = getDeliveryForNotification(r.notificationId, "EMAIL");
      assert.equal(after.attempts, 1, "with a fresh, bounded attempt budget");
      assert.equal(after.status, "QUEUED");
    }
  );
  assert.ok(deliveryStatusCounts().FAILED >= 0);
});

// ------------------------------------------------------------------ whatsapp
test("WhatsApp is an honest boundary: nothing is ever sent, with the precise reason", async () => {
  assert.equal(whatsAppStatus().available, false);
  assert.equal(isValidWhatsAppNumber("+919876543210"), true);
  for (const bad of ["9876543210", "+0123", "+91 98765", "", null]) assert.equal(isValidWhatsAppNumber(bad), false, String(bad));
  assert.ok(WHATSAPP_TEMPLATES.enrollment_confirmed);

  assert.deepEqual(await sendWhatsApp({ to: "+919876543210", template: "nope", params: {} }), { ok: false, code: "unknown_template" });
  assert.deepEqual(await sendWhatsApp({ to: "+919876543210", template: "enrollment_confirmed", params: {} }), { ok: false, code: "unknown_template" });
  assert.deepEqual(await sendWhatsApp({ to: "12345", template: "enrollment_confirmed", params: { course: "X" } }), { ok: false, code: "invalid_recipient" });
  assert.deepEqual(await sendWhatsApp({ to: "+919876543210", template: "enrollment_confirmed", params: { course: "X" } }), { ok: false, code: "provider_not_configured" });

  // even with a provider "configured", no opt-in exists, so no message is allowed
  const saved = { p: process.env.WHATSAPP_PROVIDER, t: process.env.WHATSAPP_API_TOKEN, n: process.env.WHATSAPP_PHONE_NUMBER_ID };
  Object.assign(process.env, { WHATSAPP_PROVIDER: "x", WHATSAPP_API_TOKEN: "t", WHATSAPP_PHONE_NUMBER_ID: "1" });
  try {
    assert.deepEqual(await sendWhatsApp({ to: "+919876543210", template: "enrollment_confirmed", params: { course: "X" } }), { ok: false, code: "no_consent" });
    assert.equal(whatsAppStatus().available, false);
  } finally {
    for (const [k, v] of [["WHATSAPP_PROVIDER", saved.p], ["WHATSAPP_API_TOKEN", saved.t], ["WHATSAPP_PHONE_NUMBER_ID", saved.n]]) {
      if (v === undefined) delete process.env[k];
      else process.env[k] = v;
    }
  }
});

// ---------------------------------------------------------------------- logs
test("a failing notification never throws into the caller and logs only a short error code", async () => {
  const logged = [];
  const original = console.error;
  console.error = (...a) => logged.push(a.join(" "));
  try {
    const res = await safeNotify({
      userId: "no-such-user-id",
      type: "FEE",
      title: "Payment of 9999 recorded for alice@example.test",
      message: "Sensitive message body 9999",
      eventKey: key(),
    });
    assert.equal(res, null);
  } finally {
    console.error = original;
  }
  assert.equal(logged.length, 1);
  assert.ok(!/9999|alice@example|Sensitive/.test(logged[0]), logged[0]);
  assert.match(logged[0], /\[notifications\]/);
});
