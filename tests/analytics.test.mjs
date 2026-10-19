import { test } from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import { db } from "@/lib/db/client";
import { parseRange, listDays, daysBetween } from "@/lib/analytics/range";
import { csvCell, toCsv } from "@/lib/analytics/csv";
import { getAnalytics, buildExport, toSeries } from "@/lib/analytics/service";
import { sectionsForRole, MAX_RANGE_DAYS } from "@/constants/analytics";
import { GET as exportRoute } from "@/app/(admin)/admin/analytics/export/route";
import { createLead } from "@/lib/db/leads";
import { createEnrollment, setEnrollmentStatus } from "@/lib/admin/enrollments";
import { assignFee, recordManualPayment, voidPayment, cancelFee } from "@/lib/fees/service";
import { confirmGatewayPayment } from "@/lib/fees/gateway";
import { issueCertificate } from "@/lib/certificates/service";
import { convertLeadToStudent, assignLead } from "@/lib/crm/leads";
import { makeUser, signIn, signOut, ensureSecondBatch } from "./helpers.mjs";

// A window in the past so nothing else the suite creates (all "now") can fall in it.
const WIN = { preset: "custom", from: "2019-03-01", to: "2019-03-31" };
const day = (d, t = "12:00:00") => `2019-03-${String(d).padStart(2, "0")} ${t}`;

async function as(role, label = role.toLowerCase()) {
  const u = await makeUser(role, label);
  await signIn(u);
  return u;
}

// ---------------------------------------------------------------- ranges
test("range presets, custom ranges and validation (UTC days, inclusive)", () => {
  const now = new Date("2026-10-13T08:30:00Z");
  assert.deepEqual(
    (({ from, to, days }) => ({ from, to, days }))(parseRange({ preset: "today" }, now)),
    { from: "2026-10-13", to: "2026-10-13", days: 1 }
  );
  assert.deepEqual((({ from, to, days }) => ({ from, to, days }))(parseRange({ preset: "last7" }, now)), { from: "2026-10-07", to: "2026-10-13", days: 7 });
  assert.deepEqual((({ from, to, days }) => ({ from, to, days }))(parseRange({ preset: "last30" }, now)), { from: "2026-09-14", to: "2026-10-13", days: 30 });
  assert.deepEqual((({ from, to }) => ({ from, to }))(parseRange({ preset: "month" }, now)), { from: "2026-10-01", to: "2026-10-13" });
  assert.equal(parseRange({}, now).preset, "last30", "default");
  assert.equal(parseRange({ preset: "bogus" }, now).preset, "last30");

  const c = parseRange({ preset: "custom", from: "2026-02-28", to: "2026-03-02" }, now);
  assert.equal(c.days, 3);
  assert.equal(c.fromTs, "2026-02-28 00:00:00");
  assert.equal(c.toTs, "2026-03-03 00:00:00", "exclusive upper bound is the next midnight");
  assert.equal(c.error, null);

  const bad = [
    { from: "2026-13-01", to: "2026-10-01" },
    { from: "2026-02-30", to: "2026-03-01" },
    { from: "yesterday", to: "today" },
    { from: "2026-10-05", to: "2026-10-01" },
    { from: "2020-01-01", to: "2026-10-01" },
    { from: "2026-10-01", to: "2026-12-31" },
    {},
  ];
  for (const b of bad) {
    const r = parseRange({ preset: "custom", ...b }, now);
    assert.ok(r.error, JSON.stringify(b));
    assert.equal(r.preset, "last30", "falls back safely");
  }
  assert.equal(daysBetween("2026-01-01", "2026-12-31"), 365);
  assert.equal(parseRange({ preset: "custom", from: "2025-10-13", to: "2026-10-13" }, now).days, 366);
  assert.ok(MAX_RANGE_DAYS === 366);
  assert.equal(listDays("2026-02-27", "2026-03-01").length, 3);
});

// ----------------------------------------------------------- aggregation
test("CRM aggregates: window boundaries, status/source splits, verified conversions vs hand-marked", async () => {
  const mk = (overrides) =>
    createLead({
      name: "Agg Lead",
      phone: "9876543210",
      email: `agg-${crypto.randomUUID().slice(0, 8)}@example.test`,
      source: "ENQUIRY",
      consent: true,
      ...overrides,
    });
  const l1 = mk({ source: "BOOK_DEMO" });
  const l2 = mk({});
  const l3 = mk({});
  const lOutBefore = mk({});
  const lOutAfter = mk({});
  const lLastSecond = mk({});
  db.prepare("UPDATE leads SET created_at = ? WHERE id = ?").run(day(1, "00:00:00"), l1.id); // first second: in
  db.prepare("UPDATE leads SET created_at = ?, status = 'QUALIFIED' WHERE id = ?").run(day(10), l2.id);
  db.prepare("UPDATE leads SET created_at = ?, status = 'CONVERTED' WHERE id = ?").run(day(15), l3.id); // hand-marked, no link
  db.prepare("UPDATE leads SET created_at = ? WHERE id = ?").run("2019-02-28 23:59:59", lOutBefore.id);
  db.prepare("UPDATE leads SET created_at = ? WHERE id = ?").run("2019-04-01 00:00:00", lOutAfter.id);
  db.prepare("UPDATE leads SET created_at = ? WHERE id = ?").run(day(31, "23:59:59"), lLastSecond.id); // last second: in

  const admin = await as("ADMIN", "agg-admin");
  // a real conversion inside the window
  const conv = mk({});
  db.prepare("UPDATE leads SET created_at = ? WHERE id = ?").run(day(5), conv.id);
  assert.equal((await convertLeadToStudent(conv.id, "Temp-Pass-123")).ok, true);
  db.prepare("UPDATE leads SET converted_at = ? WHERE id = ?").run(day(6), conv.id);

  const r = await getAnalytics(WIN);
  assert.equal(r.crm.total, 5, "l1, l2, l3, lLastSecond and conv are in; the two just-outside rows are out");
  assert.equal(r.crm.bySource.BOOK_DEMO, 1);
  assert.equal(r.crm.bySource.ENQUIRY, 4);
  assert.equal(r.crm.byStatus.QUALIFIED, 1);
  assert.equal(r.crm.byStatus.CONVERTED, 2, "hand-marked + linked");
  assert.equal(r.crm.verifiedConversions, 1, "only the linked conversion counts");
  assert.equal(r.crm.markedWithoutStudent, 1, "the hand-marked one is reported apart");
  assert.equal(r.dailyLeads["2019-03-31"], 1);
  assert.equal(r.dailyLeads["2019-03-01"], 1);
  assert.equal(r.dailyLeads["2019-04-01"], undefined);
  assert.equal(toSeries(r.range, r.dailyLeads).length, 31);
  assert.equal(toSeries(r.range, r.dailyLeads).reduce((s, p) => s + p.value, 0), r.crm.total);
  assert.ok(admin);
});

test("enrollment counts use batch enrollments once (no double count with course enrollments)", async () => {
  const { batchA, batchB } = ensureSecondBatch();
  const admin = await as("ADMIN", "enr-agg");
  const s1 = await makeUser("STUDENT", "agg1");
  const s2 = await makeUser("STUDENT", "agg2");
  const rows = [
    await createEnrollment({ studentUserId: s1.id, courseSlug: batchA.courseSlug, batchId: batchA.id }),
    await createEnrollment({ studentUserId: s1.id, courseSlug: batchB.courseSlug, batchId: batchB.id }), // same student, same course, 2nd batch
    await createEnrollment({ studentUserId: s2.id, courseSlug: batchA.courseSlug, batchId: batchA.id }),
  ];
  assert.ok(rows.every((r) => r.ok));
  await setEnrollmentStatus(rows[2].enrollmentId, "CANCELLED");
  db.prepare("UPDATE batch_enrollments SET created_at = ? WHERE id IN (?, ?, ?)").run(day(3), rows[0].enrollmentId, rows[1].enrollmentId, rows[2].enrollmentId);

  const before = db.prepare("SELECT COUNT(*) c FROM course_enrollments").get().c;
  assert.ok(before >= 1);
  const r = await getAnalytics(WIN);
  assert.equal(r.enrollment.created, 3, "three student+batch enrollments, not the course rows");
  assert.equal(r.enrollment.createdStudents, 2);
  assert.equal(r.dailyEnrollments["2019-03-03"], 3);
  const snap = db.prepare("SELECT status, COUNT(*) c FROM batch_enrollments GROUP BY status").all();
  for (const row of snap) assert.equal(r.enrollment.snapshot[row.status], row.c);
  assert.ok(admin);
});

test("finance: collected excludes voided and cancelled, splits manual vs gateway, groups per currency, outstanding is point-in-time", async () => {
  const { batchA } = ensureSecondBatch();
  await as("ADMIN", "fin-setup");
  const mkPlan = async (total, dueDate = "") => {
    const s = await makeUser("STUDENT", "finagg");
    await signIn(await makeUser("ADMIN", "fin-enroller"));
    const e = await createEnrollment({ studentUserId: s.id, courseSlug: batchA.courseSlug, batchId: batchA.id });
    await signIn(await makeUser("ACCOUNTANT", "fin-acct"));
    const fee = await assignFee({ enrollmentId: e.enrollmentId, currency: "INR", total, discount: "", dueDate, note: "" });
    assert.equal(fee.ok, true, fee.message);
    return fee.feePlanId;
  };
  const planA = await mkPlan("10000");
  const planB = await mkPlan("5000", "2019-03-20"); // overdue
  const planC = await mkPlan("700");
  const pay = async (planId, amount, paidOn) => {
    const r = await recordManualPayment({ feePlanId: planId, amount, method: "CASH", paidOn, note: "", idempotencyKey: crypto.randomBytes(9).toString("base64url") });
    assert.equal(r.ok, true, r.message);
    return r.paymentId;
  };
  await signIn(await makeUser("ACCOUNTANT", "fin-acct2"));
  const p1 = await pay(planA, "3000", "2019-03-10");
  const p2 = await pay(planA, "1000", "2019-03-12");
  const pVoided = await pay(planB, "2000", "2019-03-14");
  assert.equal((await voidPayment({ paymentId: pVoided, reason: "wrong student" })).ok, true);
  await pay(planB, "500", "2019-02-28"); // outside the window
  const planGateway = planC;
  assert.equal(confirmGatewayPayment({ provider: "fixture", eventId: "evt-a1", providerReference: "txn-a1", feePlanId: planGateway, amount: "200", currency: "INR", paidOn: "2019-03-15" }).ok, true);
  db.prepare("UPDATE fee_plans SET created_at = ? WHERE id IN (?, ?, ?)").run(day(2), planA, planB, planC);
  db.prepare("UPDATE payments SET voided_at = ? WHERE id = ?").run(day(14), pVoided);

  // a cancelled plan with no payments is excluded from assigned/collected
  const planX = await mkPlan("999");
  await cancelFee({ feePlanId: planX, reason: "withdrawn" });
  db.prepare("UPDATE fee_plans SET created_at = ? WHERE id = ?").run(day(2), planX);

  const r = await getAnalytics(WIN);
  const f = r.finance;
  const inr = (rows, key) => rows.find((x) => x.currency === "INR" && (key ? x.source === key : true));
  assert.equal(inr(f.feesAssigned).plans, 3);
  assert.equal(inr(f.feesAssigned).net, (10000 + 5000 + 700) * 100);
  assert.equal(f.feesCancelled, 1);
  assert.equal(inr(f.collected, "MANUAL").amount, (3000 + 1000) * 100, "voided and out-of-window payments excluded");
  assert.equal(inr(f.collected, "MANUAL").payments, 2);
  assert.equal(inr(f.collected, "GATEWAY").amount, 200 * 100, "gateway-verified is reported separately");
  assert.equal(inr(f.voided).amount, 2000 * 100);
  assert.equal(inr(f.voided).payments, 1);
  // outstanding = (10000-4000) + (5000-500) + (700-200) = 6000 + 4500 + 500, as of now
  assert.ok(inr(f.outstanding).balance >= (6000 + 4500 + 500) * 100);
  assert.ok(inr(f.outstanding).overdue_balance >= 4500 * 100);
  assert.equal(r.dailyCollected.filter((d) => d.d === "2019-03-10")[0].c, 300000);
  assert.ok(p1 && p2);

  // a different currency is reported separately, never summed into INR
  db.prepare("UPDATE fee_plans SET currency = 'USD' WHERE id = ?").run(planC);
  db.prepare("UPDATE payments SET currency = 'USD' WHERE fee_plan_id = ?").run(planC);
  const r2 = await getAnalytics(WIN);
  assert.equal(inr(r2.finance.collected, "MANUAL").amount, (3000 + 1000) * 100);
  assert.equal(r2.finance.collected.find((x) => x.currency === "USD").amount, 200 * 100);
  assert.equal(r2.finance.feesAssigned.find((x) => x.currency === "USD").net, 700 * 100);
});

test("certificates and placement: manual vs automatic issuance; SELECTED is not a placement", async () => {
  const { batchA } = ensureSecondBatch();
  const admin = await as("ADMIN", "cert-agg");
  const student = await makeUser("STUDENT", "certagg");
  const e = await createEnrollment({ studentUserId: student.id, courseSlug: batchA.courseSlug, batchId: batchA.id });
  const c = await issueCertificate({ enrollmentId: e.enrollmentId, mode: "MANUAL", approvalNote: "confirmed by the trainer offline" });
  assert.equal(c.ok, true);
  db.prepare("UPDATE certificates SET issued_at = ? WHERE id = ?").run(day(8), c.certificateId);
  const r = await getAnalytics(WIN);
  assert.equal(r.certificates.issued, 1);
  assert.equal(r.certificates.issuedManual, 1);
  assert.equal(r.certificates.revoked, 0);
  assert.ok(r.certificates.snapshot.ACTIVE >= 1);

  // placement
  const jobId = crypto.randomUUID();
  db.prepare(
    "INSERT INTO jobs (id, title, company_name, description, employment_type, work_mode, status, published_at) VALUES (?, 'T', 'C', 'D', 'FULL_TIME', 'ONSITE', 'PUBLISHED', ?)"
  ).run(jobId, day(4));
  const mkApp = (status, confirmedAt = null) => {
    const u = crypto.randomUUID();
    return { u, id: crypto.randomUUID(), status, confirmedAt };
  };
  const apps = [mkApp("APPLIED"), mkApp("SELECTED"), mkApp("SELECTED", day(20))];
  for (const a of apps) {
    const user = db.prepare("INSERT INTO users (id, name, email, password_hash, role) VALUES (?, 'P', ?, 'x', 'STUDENT')");
    user.run(a.u, `${a.u}@example.test`);
    db.prepare(
      "INSERT INTO job_applications (id, job_id, student_user_id, status, applied_at, placement_confirmed_at) VALUES (?, ?, ?, ?, ?, ?)"
    ).run(a.id, jobId, a.u, a.status, day(9), a.confirmedAt);
  }
  const p = (await getAnalytics(WIN)).placement;
  assert.equal(p.jobsPublished, 1);
  assert.equal(p.applications, 3);
  assert.equal(p.byStatus.SELECTED, 2);
  assert.equal(p.verifiedPlacements, 1, "two are Selected, only one is a confirmed placement");
  assert.ok(admin);
});

test("an empty period yields real zeros, never NaN or invented values", async () => {
  await as("ADMIN", "empty");
  const r = await getAnalytics({ preset: "custom", from: "2001-01-01", to: "2001-01-31" });
  assert.equal(r.crm.total, 0);
  assert.equal(r.overview.registrations, 0);
  assert.equal(r.enrollment.created, 0);
  assert.deepEqual(r.finance.feesAssigned, []);
  assert.deepEqual(r.finance.collected, []);
  assert.equal(r.certificates.issued, 0);
  assert.equal(r.placement.applications, 0);
  assert.equal(r.placement.verifiedPlacements, 0);
  const series = toSeries(r.range, r.dailyLeads);
  assert.equal(series.length, 31);
  assert.ok(series.every((p) => p.value === 0));
});

// ---------------------------------------------------------------- roles
test("each role sees only its sections; non-staff and unrelated staff are refused", async () => {
  const sections = async (role) => {
    await as(role, `rl-${role}`);
    const r = await getAnalytics({});
    return r ? r.sections.sort() : null;
  };
  assert.deepEqual(await sections("SUPER_ADMIN"), ["certificates", "crm", "enrollment", "finance", "overview", "placement"]);
  assert.deepEqual(await sections("ADMIN"), ["certificates", "crm", "enrollment", "finance", "overview", "placement"]);
  assert.deepEqual(await sections("ACCOUNTANT"), ["finance"]);
  assert.deepEqual(await sections("PLACEMENT_MANAGER"), ["placement"]);
  assert.deepEqual(await sections("COUNSELLOR"), ["crm"]);
  for (const role of ["STUDENT", "TRAINER", "CONTENT_MANAGER"]) assert.equal(await sections(role), null, role);
  await signOut();
  assert.equal(await getAnalytics({}), null);
  assert.deepEqual(sectionsForRole("ACCOUNTANT"), ["finance"]);

  // restricted roles don't get the other sections' DATA either (not just hidden)
  await as("ACCOUNTANT", "rl-acct2");
  const acct = await getAnalytics({});
  for (const k of ["crm", "enrollment", "certificates", "placement", "overview", "dailyLeads"]) assert.equal(acct[k], undefined, k);
  await as("PLACEMENT_MANAGER", "rl-plc2");
  const plc = await getAnalytics({});
  for (const k of ["crm", "enrollment", "certificates", "finance", "overview"]) assert.equal(plc[k], undefined, k);
});

test("a counsellor's CRM figures cover only their assigned leads and the unassigned queue", async () => {
  const mgr = await makeUser("ADMIN", "scope-mgr");
  const c1 = await makeUser("COUNSELLOR", "scope-c1");
  const c2 = await makeUser("COUNSELLOR", "scope-c2");
  const mk = () =>
    createLead({ name: "Scope", phone: "9876543210", email: `scope-${crypto.randomUUID().slice(0, 8)}@example.test`, source: "ENQUIRY", consent: true });
  const mine = mk();
  const theirs = mk();
  const queue = mk();
  for (const l of [mine, theirs, queue]) db.prepare("UPDATE leads SET created_at = ? WHERE id = ?").run("2018-06-15 10:00:00", l.id);
  await signIn(mgr);
  await assignLead(mine.id, c1.id);
  await assignLead(theirs.id, c2.id);
  const win = { preset: "custom", from: "2018-06-01", to: "2018-06-30" };

  await signIn(c1);
  const r1 = await getAnalytics(win);
  assert.equal(r1.crm.scoped, true);
  assert.equal(r1.crm.total, 2, "own + unassigned, not the other counsellor's");
  await signIn(mgr);
  assert.equal((await getAnalytics(win)).crm.total, 3);
  assert.equal((await getAnalytics(win)).crm.scoped, false);
});

// ------------------------------------------------------------------ CSV
test("CSV cells are quoted correctly and neutralize spreadsheet formulas", () => {
  assert.equal(csvCell("plain"), "plain");
  assert.equal(csvCell('say "hi", ok'), '"say ""hi"", ok"');
  assert.equal(csvCell("line1\nline2"), '"line1\nline2"');
  for (const evil of ["=SUM(A1:A9)", "+1+1", "-2+3", "@cmd", "\tTAB", "\rCR"]) {
    assert.ok(csvCell(evil).startsWith("'") || csvCell(evil).startsWith('"\''), evil);
  }
  assert.equal(csvCell('=HYPERLINK("http://x","y")'), `"'=HYPERLINK(""http://x"",""y"")"`);
  assert.equal(csvCell(-5), "-5", "real numbers stay numbers");
  assert.equal(csvCell(null), "");
  assert.equal(csvCell(NaN), "");
  const csv = toCsv(["A", "B"], [["=cmd", 1]]);
  assert.ok(csv.startsWith("﻿A,B\r\n"));
  assert.ok(csv.includes("'=cmd,1"));
});

test("export: admins only, aggregates only, bounded, and refuses invalid ranges", async () => {
  await as("ADMIN", "exp-admin");
  const summary = await buildExport({ type: "summary", input: WIN });
  assert.equal(summary.ok, true);
  assert.match(summary.filename, /^techotd-report-summary-2019-03-01_to_2019-03-31\.csv$/);
  assert.ok(summary.csv.startsWith("﻿Section,Metric,Value,Unit,Note"));
  assert.ok(summary.csv.includes("Leads created in period"));
  // no personal data or identifiers
  assert.ok(!/@example\.test|password|token|\b[0-9a-f]{8}-[0-9a-f]{4}-/.test(summary.csv));

  const daily = await buildExport({ type: "daily", input: WIN });
  assert.equal(daily.ok, true);
  assert.equal(daily.csv.trim().split("\r\n").length, 1 + 31);

  const long = await buildExport({ type: "daily", input: { preset: "custom", from: new Date(Date.now() - 300 * 86400000).toISOString().slice(0, 10), to: new Date().toISOString().slice(0, 10) } });
  assert.ok(long.csv.trim().split("\r\n").length - 1 <= 1000);

  for (const input of [{ preset: "custom", from: "2019-03-31", to: "2019-03-01" }, { preset: "custom", from: "garbage", to: "x" }]) {
    const bad = await buildExport({ type: "summary", input });
    assert.equal(bad.ok, false);
    assert.equal(bad.reason, "invalid_range");
  }
  assert.equal((await buildExport({ type: "everything", input: WIN })).reason, "invalid_type");

  // roles that can view some analytics still can't export
  for (const role of ["ACCOUNTANT", "COUNSELLOR", "PLACEMENT_MANAGER", "STUDENT", "TRAINER"]) {
    await as(role, `exp-${role}`);
    assert.equal((await buildExport({ type: "summary", input: WIN })).ok, false, role);
  }
  await signOut();
  assert.equal((await buildExport({ type: "summary", input: WIN })).ok, false);
});

test("the export endpoint enforces the same rules and sends safe headers", async () => {
  const call = (qs) => exportRoute(new Request(`http://localhost/admin/analytics/export?${qs}`));
  const qs = "type=summary&preset=custom&from=2019-03-01&to=2019-03-31";
  await signOut();
  assert.equal((await call(qs)).status, 403);
  await as("STUDENT", "exp-stu");
  assert.equal((await call(qs)).status, 403);
  await as("ACCOUNTANT", "exp-acct");
  assert.equal((await call(qs)).status, 403);
  await as("ADMIN", "exp-adm2");
  const ok = await call(qs);
  assert.equal(ok.status, 200);
  assert.match(ok.headers.get("content-type"), /text\/csv/);
  assert.match(ok.headers.get("content-disposition"), /attachment/);
  assert.match(ok.headers.get("cache-control"), /no-store/);
  assert.equal((await call("type=summary&preset=custom&from=bad&to=bad")).status, 400);
  assert.equal((await call("type=nope")).status, 400);
});

// ------------------------------------------------------------ performance
test("range aggregations use the date indexes (query plan)", () => {
  const plan = (sql) => db.prepare(`EXPLAIN QUERY PLAN ${sql}`).all({ fromTs: "2019-03-01 00:00:00", toTs: "2019-04-01 00:00:00", from: "2019-03-01", to: "2019-03-31" })
    .map((r) => r.detail)
    .join(" | ");
  assert.match(plan("SELECT COUNT(*) FROM leads WHERE created_at >= @fromTs AND created_at < @toTs"), /idx_leads_created_at/);
  assert.match(plan("SELECT COUNT(*) FROM payments WHERE paid_on >= @from AND paid_on <= @to"), /idx_payments_paid_on/);
  assert.match(plan("SELECT COUNT(*) FROM batch_enrollments WHERE created_at >= @fromTs AND created_at < @toTs"), /idx_batch_enrollments_created_at/);
  assert.match(plan("SELECT COUNT(*) FROM job_applications WHERE applied_at >= @fromTs AND applied_at < @toTs"), /idx_job_applications_applied_at/);
});
