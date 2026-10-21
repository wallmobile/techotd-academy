// Workflows F (fees / payments / audit) and G (certificates) in real Chrome.
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { startStack } from "./stack.mjs";
import { Session, openDb, bodyText } from "./helpers.mjs";

let stack;
const sessions = new Map();
async function as(key) {
  if (!sessions.has(key)) {
    const s = await new Session(stack, key).open();
    await s.login(key);
    sessions.set(key, s);
  }
  return sessions.get(key);
}
const state = {};
const rupees = (n) => `₹${n.toLocaleString("en-IN", { minimumFractionDigits: 2 })}`;

before(async () => {
  stack = await startStack({ port: 3241 });
  // Arrange: enrol the student through the real admin UI.
  const admin = await as("admin");
  await admin.goto(`/admin/enrollments/new?student=${stack.data.users.student.id}`);
  await admin.page.selectOption('select[name="course"]', stack.data.course);
  await admin.page.selectOption('select[name="batch"]', stack.data.batch);
  await admin.page.getByRole("button", { name: /enroll student/i }).click();
  await admin.page.waitForURL(/\/admin\/enrollments\/[0-9a-f-]{36}$/);
  state.enrollmentId = new URL(admin.page.url()).pathname.split("/").pop();
});
after(async () => {
  for (const s of sessions.values()) await s.close();
  await stack?.stop();
});

const db = (opts) => openDb(stack, opts);

// ------------------------------------------------------------------ F: fees

test("F1 assign fee: invalid amounts are rejected with messages; a valid plan shows correct derived totals", async () => {
  const acc = await as("accountant");
  await acc.goto(`/admin/fees/new?enrollment=${state.enrollmentId}`);
  const submit = () => acc.page.getByRole("button", { name: /assign fee/i }).click();

  await acc.page.getByLabel("Total fee").fill("abc");
  await submit();
  await acc.page.waitForTimeout(600);
  assert.match(await bodyText(acc.page), /valid|amount|number/i);

  await acc.page.getByLabel("Total fee").fill("1000");
  await acc.page.getByLabel(/Discount/).fill("1500");
  await submit();
  await acc.page.waitForTimeout(600);
  assert.match(await bodyText(acc.page), /discount|exceed|greater/i);
  let d = db();
  assert.equal((await d.prepare("SELECT COUNT(*) c FROM fee_plans").get()).c, 0, "nothing stored for invalid input");
  d.close();

  await acc.page.getByLabel("Total fee").fill("12000");
  await acc.page.getByLabel(/Discount/).fill("2000");
  await submit();
  await acc.page.waitForURL(/\/admin\/fees\/[0-9a-f-]{36}$/);
  state.feeUrl = new URL(acc.page.url()).pathname;
  const text = await bodyText(acc.page);
  assert.match(text, /NET PAYABLE ₹10,000\.00/i);
  assert.match(text, /OUTSTANDING ₹10,000\.00/i);
  d = db();
  const plan = await d.prepare("SELECT total_minor, discount_minor, currency FROM fee_plans").get();
  assert.deepEqual({ ...plan }, { total_minor: 1200000, discount_minor: 200000, currency: "INR" }, "stored as integer minor units");
  d.close();
  acc.assertClean("assign fee");
});

test("F2 assigning a second fee to the same enrollment is refused", async () => {
  const acc = await as("accountant");
  await acc.goto(`/admin/fees/new?enrollment=${state.enrollmentId}`);
  const text = await bodyText(acc.page);
  const form = await acc.page.getByLabel("Total fee").count();
  if (form) {
    await acc.page.getByLabel("Total fee").fill("500");
    await acc.page.getByRole("button", { name: /assign fee/i }).click();
    await acc.page.waitForTimeout(800);
  }
  assert.ok(/already|exists|has a fee/i.test(await bodyText(acc.page)) || form === 0 || /fees\/[0-9a-f-]{36}$/.test(acc.page.url()), text.slice(0, 200));
  const d = db();
  assert.equal((await d.prepare("SELECT COUNT(*) c FROM fee_plans").get()).c, 1);
  d.close();
});

test("F3 record payment: validation, partial payment totals, overpayment refused, duplicate click records once", async () => {
  const acc = await as("accountant");
  await acc.goto(state.feeUrl);
  const record = () => acc.page.getByRole("button", { name: /record payment/i }).click();

  await record();
  await acc.page.waitForTimeout(500);
  assert.match(await bodyText(acc.page), /amount|method|required|select/i);

  await acc.page.getByLabel("Amount received").fill("99999");
  await acc.page.getByLabel("Method").selectOption("CASH");
  await record();
  await acc.page.waitForTimeout(800);
  assert.match(await bodyText(acc.page), /exceed|more than|outstanding|overpay/i);
  let d = db();
  assert.equal((await d.prepare("SELECT COUNT(*) c FROM payments").get()).c, 0);
  d.close();

  await acc.page.getByLabel("Amount received").fill("4000");
  await acc.page.getByLabel("Method").selectOption("UPI");
  await acc.page.getByLabel(/Reference/).fill("UPI-REF-123");
  // double-click: two submissions racing from one form
  const btn = acc.page.getByRole("button", { name: /record payment/i });
  await Promise.allSettled([btn.click({ timeout: 3000 }), btn.click({ timeout: 3000, force: true })]);
  await acc.page.waitForTimeout(1500);
  d = db();
  const pays = await d.prepare("SELECT amount_minor, source, status, receipt_number FROM payments").all();
  d.close();
  assert.equal(pays.length, 1, `double-submit recorded once, got ${pays.length}`);
  assert.equal(pays[0].amount_minor, 400000);
  assert.equal(pays[0].source, "MANUAL", "never claimed as a gateway payment");
  const text = await bodyText(acc.page);
  assert.match(text, /PAID ₹4,000\.00/i);
  assert.match(text, /OUTSTANDING ₹6,000\.00/i);
  assert.match(text, /Recorded manually/i);
  state.receiptNumber = pays[0].receipt_number;
});

test("F4 receipt page shows the receipt number and amount and never implies a gateway verification", async () => {
  const acc = await as("accountant");
  await acc.goto(state.feeUrl);
  await acc.page.getByRole("link", { name: /view receipt/i }).first().click();
  await acc.page.waitForURL(/\/receipt\//);
  const text = await bodyText(acc.page);
  assert.ok(text.includes(state.receiptNumber));
  assert.match(text, /4,000\.00/);
  assert.ok(!/gateway.verified|paid online|razorpay|stripe/i.test(text.replace(/not (a )?gateway/gi, "")), "no false gateway claim");
  acc.assertClean("receipt");
});

test("F5 void: reason required; voiding restores the outstanding balance and writes audit rows", async () => {
  const acc = await as("accountant");
  await acc.goto(state.feeUrl);
  await acc.page.getByRole("button", { name: /^void$/i }).click();
  await acc.page.waitForTimeout(500);
  assert.match(await bodyText(acc.page), /reason/i);
  let d = db();
  assert.equal((await d.prepare("SELECT COUNT(*) c FROM payments WHERE voided_at IS NOT NULL").get()).c, 0);
  d.close();

  await acc.page.getByLabel("Void reason").fill("Entered against the wrong student");
  await acc.page.getByRole("button", { name: /^void$/i }).click();
  await acc.page.waitForTimeout(1200);
  const text = await bodyText(acc.page);
  assert.match(text, /PAID ₹0\.00/i);
  assert.match(text, /OUTSTANDING ₹10,000\.00/i);
  assert.match(text, /voided/i);
  d = db();
  const p = await d.prepare("SELECT status, voided_at, void_reason FROM payments").get();
  assert.ok(p.voided_at && /wrong student/.test(p.void_reason));
  const actions = (await d.prepare("SELECT action FROM audit_log ORDER BY created_at, seq").all()).map((r) => r.action);
  assert.ok(actions.some((a) => /fee.*(created|assigned)/i.test(a)), actions.join(","));
  assert.ok(actions.some((a) => /payment.*record/i.test(a)), actions.join(","));
  assert.ok(actions.some((a) => /payment.*void/i.test(a)), actions.join(","));
  d.close();
  // re-void is impossible (button gone) and a fresh payment still works with a NEW receipt number
  assert.equal(await acc.page.getByRole("button", { name: /^void$/i }).count(), 0);
  await acc.page.getByLabel("Amount received").fill("1500");
  await acc.page.getByLabel("Method").selectOption("CASH");
  await acc.page.getByRole("button", { name: /record payment/i }).click();
  await acc.page.waitForTimeout(1200);
  const t2 = await bodyText(acc.page);
  assert.match(t2, /PAID ₹1,500\.00/i);
  assert.match(t2, /OUTSTANDING ₹8,500\.00/i);
  d = db();
  const rows = await d.prepare("SELECT receipt_number FROM payments").all();
  assert.equal(new Set(rows.map((r) => r.receipt_number)).size, 2, "receipt numbers are unique");
  const sum = (await d.prepare("SELECT SUM(amount_minor) s FROM payments WHERE voided_at IS NULL").get()).s;
  assert.equal(sum, 150000);
  d.close();
});

test("F6 notifications about fees carry no amounts or reasons", async () => {
  const d = db();
  const rows = await d.prepare("SELECT title, message FROM notifications WHERE user_id = ?").all(stack.data.users.student.id);
  d.close();
  assert.ok(rows.length >= 2, "student was notified");
  for (const r of rows) assert.ok(!/₹|\d{3,}|wrong student|UPI/i.test(`${r.title} ${r.message}`), `leak in "${r.message}"`);
});

test("F7 student sees own fee + receipt; another student and non-finance staff cannot reach them", async () => {
  const student = await as("student");
  await student.goto("/student/fees");
  const text = await bodyText(student.page);
  assert.match(text, /10,000\.00/);
  assert.match(text, /8,500\.00/);
  const link = student.page.locator('a[href*="/student/fees/receipt/"]').first();
  const href = await link.getAttribute("href");
  await link.click();
  await student.page.waitForURL(/\/receipt\//);
  assert.match(await bodyText(student.page), /1,500\.00/);

  const other = await as("student2");
  const r = await other.goto(href);
  await other.page.waitForTimeout(500);
  const t = await bodyText(other.page);
  assert.ok(r.status() === 404 || !/1,500\.00|RCPT-/.test(t), "another student cannot read the receipt by token");

  const place = await as("placement");
  await place.goto(state.feeUrl);
  await place.page.waitForURL((u) => u.pathname !== state.feeUrl, { timeout: 5000 }).catch(() => {});
  assert.notEqual(new URL(place.page.url()).pathname, state.feeUrl);
});

test("F8 fee cancellation is blocked once a live payment exists", async () => {
  const acc = await as("accountant");
  await acc.goto(state.feeUrl);
  assert.equal(await acc.page.getByRole("button", { name: /cancel fee/i }).count(), 0);
});

// ------------------------------------------------------------- G: certificates

test("G1 a not-yet-eligible enrollment needs a recorded manual approval; blank approval is refused", async () => {
  const admin = await as("admin");
  await admin.goto(`/admin/certificates/new?enrollment=${state.enrollmentId}`);
  assert.match(await bodyText(admin.page), /Not automatically eligible/i);
  await admin.page.getByRole("button", { name: /issue with manual approval/i }).click();
  await admin.page.waitForTimeout(600);
  assert.match(await bodyText(admin.page), /reason|required|approval/i);
  const d = db();
  assert.equal((await d.prepare("SELECT COUNT(*) c FROM certificates").get()).c, 0);
  d.close();
});

test("G2 manual approval issues one ACTIVE certificate with an unguessable token; issuing twice is refused", async () => {
  const admin = await as("admin");
  await admin.goto(`/admin/certificates/new?enrollment=${state.enrollmentId}`);
  await admin.page.getByLabel(/Reason for manual approval/i).fill("Completed offline project evaluation");
  await admin.page.getByRole("button", { name: /issue with manual approval/i }).click();
  await admin.page.waitForURL(/\/admin\/certificates\/[0-9a-f-]{36}$/, { timeout: 10000 });
  state.certUrl = new URL(admin.page.url()).pathname;
  const d = db();
  const c = await d.prepare("SELECT certificate_number, verification_token, status, issuance_basis, approval_note FROM certificates").get();
  d.close();
  assert.equal(c.status, "ACTIVE");
  assert.equal(c.issuance_basis, "MANUAL_APPROVAL");
  assert.match(c.approval_note, /offline project/);
  assert.ok(c.verification_token.length >= 24, "token has real entropy");
  assert.ok(!c.verification_token.includes(c.certificate_number));
  state.token = c.verification_token;
  state.certNumber = c.certificate_number;

  await admin.goto(`/admin/certificates/new?enrollment=${state.enrollmentId}`);
  const again = await bodyText(admin.page);
  assert.ok(/already/i.test(again) || (await admin.page.getByRole("button", { name: /issue/i }).count()) === 0, "second issue not offered");
  admin.assertClean("certificate issue");
});

test("G3 the certificate PDF downloads as a real PDF for the owner and staff, not for another student", async () => {
  const student = await as("student");
  await student.goto("/student/certificates");
  assert.match(await bodyText(student.page), new RegExp(state.certNumber));
  const detail = student.page.locator('main a[href^="/student/certificates/"]').first();
  await detail.click();
  await student.page.waitForURL((u) => /^\/student\/certificates\/[0-9a-f-]{36}$/.test(u.pathname));
  const dl = student.page.locator('a[href$="/download"]').first();
  const href = await dl.getAttribute("href");
  const res = await student.context.request.get(stack.base + href);
  assert.equal(res.status(), 200);
  assert.match(res.headers()["content-type"], /application\/pdf/);
  const body = await res.body();
  assert.equal(body.subarray(0, 5).toString(), "%PDF-");
  assert.ok(body.includes(Buffer.from(state.certNumber)), "certificate number embedded in the PDF");

  const other = await as("student2");
  const denied = await other.context.request.get(stack.base + href, { maxRedirects: 0 });
  assert.notEqual(denied.status(), 200, "another student cannot download it");
  assert.ok(!(denied.headers()["content-type"] || "").includes("pdf"));

  const admin = await as("admin");
  const staff = await admin.context.request.get(stack.base + state.certUrl + "/download");
  assert.equal(staff.status(), 200);
});

test("G4 public verification works without login, shows only safe fields, and is not indexed", async () => {
  const anon = await new Session(stack, "anon").open();
  try {
    await anon.goto(`/verify-certificate/${state.token}`);
    const text = await bodyText(anon.page);
    assert.match(text, /valid|verified|authentic/i);
    assert.ok(text.includes(state.certNumber));
    assert.ok(!/@e2e\.test|9876543210|₹/.test(text), "no email, phone or fee data on the public page");
    const robots = await anon.page.locator('meta[name="robots"]').getAttribute("content");
    assert.match(robots, /noindex/);

    const r = await anon.goto("/verify-certificate/" + "A".repeat(43));
    assert.equal(r.status(), 404, "unknown token is a clean 404");
    anon.assertClean("verify certificate");
  } finally {
    await anon.close();
  }
});

test("G5 revocation requires a reason, invalidates verification and the student download, and keeps the record", async () => {
  const admin = await as("admin");
  await admin.goto(state.certUrl);
  await admin.page.getByRole("button", { name: /revoke/i }).click();
  await admin.page.waitForTimeout(500);
  const d = db();
  assert.equal((await d.prepare("SELECT status FROM certificates").get()).status, "ACTIVE", "blank reason does not revoke");
  d.close();

  await admin.page.getByLabel(/reason/i).fill("Issued in error");
  await admin.page.getByRole("button", { name: /revoke/i }).click();
  await admin.page.waitForTimeout(1200);
  const d2 = db();
  const c = await d2.prepare("SELECT status, revoked_reason FROM certificates").get();
  d2.close();
  assert.equal(c.status, "REVOKED");
  assert.match(c.revoked_reason, /Issued in error/);

  const anon = await new Session(stack, "anon").open();
  try {
    await anon.goto(`/verify-certificate/${state.token}`);
    const text = await bodyText(anon.page);
    assert.match(text, /revoked|no longer valid|not valid/i);
    assert.ok(!/Issued in error/.test(text), "internal reason is not published");
  } finally {
    await anon.close();
  }
  const student = await as("student");
  await student.goto("/student/certificates");
  const detailLink = student.page.locator('main a[href^="/student/certificates/"]').first();
  if (await detailLink.count()) {
    await detailLink.click();
    await student.page.waitForLoadState("load");
  }
  assert.equal(await student.page.locator('a[href$="/download"]').count(), 0, "revoked certificate is not offered for download");
  const res = await student.context.request.get(stack.base + state.certUrl.replace("/admin/", "/student/") + "/download", { maxRedirects: 0 });
  assert.ok(!(res.headers()["content-type"] || "").includes("pdf"), "revoked certificate PDF is not served to the student");
});
