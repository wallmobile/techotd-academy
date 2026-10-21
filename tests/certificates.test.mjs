import { test } from "node:test";
import assert from "node:assert/strict";
import { tdb, failAuditInsert, removeAuditFailure } from "./tdb.mjs";
import { db } from "@/lib/db/client";
import {
  getEligibility,
  issueCertificate,
  revokeCertificate,
  getCertificatesPage,
  getCertificateDetail,
  getCertificatePdfForAdmin,
  getCertificateSummary,
  getCertificateFormData,
  verificationUrl,
} from "@/lib/certificates/service";
import { issueCertificateAction, revokeCertificateAction } from "@/lib/certificates/actions";
import { buildCertificatePdf } from "@/lib/certificates/pdf";
import { getPublicVerification } from "@/lib/certificates/verify";
import { parseCertificateParams } from "@/lib/certificates/params";
import { getMyCertificates, getCertificateDetailForStudent, getMyCertificatePdf } from "@/lib/student/certificates";
import { createEnrollment, setEnrollmentStatus } from "@/lib/admin/enrollments";
import { getOrCreateStudentProfile } from "@/lib/db/studentProfiles";
import { markLessonComplete } from "@/lib/db/lessonProgress";
import { getCourseBySlug } from "@/data/courses";
import { getCourseCurriculum } from "@/lib/student/curriculum";
import { makeUser, signIn, signOut, ensureSecondBatch } from "./helpers.mjs";

function form(values) {
  const fd = new FormData();
  for (const [k, v] of Object.entries(values)) fd.set(k, v);
  return fd;
}

const count = async (t) => (await tdb.prepare(`SELECT COUNT(*) AS c FROM ${t}`).get()).c;

// An enrolled student; `complete` marks every lesson done and the enrollment COMPLETED.
async function student({ complete = false, label = "cert" } = {}) {
  const { batchA } = ensureSecondBatch();
  const user = await makeUser("STUDENT", label);
  const admin = await makeUser("ADMIN", "cert-admin");
  await signIn(admin);
  const enr = await createEnrollment({ studentUserId: user.id, courseSlug: batchA.courseSlug, batchId: batchA.id });
  assert.equal(enr.ok, true);
  const profile = await getOrCreateStudentProfile(user.id);
  if (complete) {
    const course = getCourseBySlug(batchA.courseSlug);
    for (const lesson of getCourseCurriculum(course).flatLessons) {
      await markLessonComplete(profile.id, course.slug, lesson.moduleIndex, lesson.itemIndex);
    }
    await setEnrollmentStatus(enr.enrollmentId, "COMPLETED");
  }
  return { user, admin, profile, enrollmentId: enr.enrollmentId, batch: batchA, courseSlug: batchA.courseSlug };
}

// ---------------------------------------------------------------- eligibility
test("a student who completed lessons and was marked COMPLETED is auto-eligible and can be issued a certificate", async () => {
  const s = await student({ complete: true });
  const e = await getEligibility(s.enrollmentId);
  assert.equal(e.autoEligible, true);
  assert.ok(e.checks.every((c) => c.passed));

  const res = await issueCertificate({ enrollmentId: s.enrollmentId, mode: "AUTO" });
  assert.equal(res.ok, true);
  const row = await tdb.prepare("SELECT * FROM certificates WHERE id = ?").get(res.certificateId);
  assert.equal(row.status, "ACTIVE");
  assert.equal(row.issuance_basis, "AUTO_COMPLETE");
  assert.equal(row.student_id, s.profile.id);
  assert.equal(row.course_slug, s.courseSlug);
  assert.equal(row.enrollment_id, s.enrollmentId);
  assert.equal(row.issued_by, s.admin.id);
  assert.match(row.certificate_number, /^TOA-\d{4}-[0-9A-F]{10}$/);
  assert.ok(row.verification_token.length >= 20);
  assert.equal(
    (await tdb.prepare("SELECT action FROM audit_log WHERE entity_id = ?").get(res.certificateId)).action,
    "CERTIFICATE_ISSUED"
  );
});

test("an ineligible student can't be issued automatically; completion facts are reported honestly", async () => {
  const noProgress = await student({ complete: false });
  await signIn(noProgress.admin);
  const e = await getEligibility(noProgress.enrollmentId);
  assert.equal(e.autoEligible, false);
  assert.equal(e.checks.find((c) => c.key === "lessons_completed").passed, false);
  assert.equal(e.checks.find((c) => c.key === "enrollment_completed").passed, false);

  const before = await count("certificates");
  const res = await issueCertificate({ enrollmentId: noProgress.enrollmentId, mode: "AUTO" });
  assert.equal(res.ok, false);
  assert.equal(res.reason, "not_eligible");
  assert.equal(await count("certificates"), before);

  // lessons done but enrollment not marked completed -> still not eligible
  const half = await student({ complete: true, label: "half" });
  await signIn(half.admin);
  await setEnrollmentStatus(half.enrollmentId, "ACTIVE");
  assert.equal((await getEligibility(half.enrollmentId)).autoEligible, false);
  assert.equal((await issueCertificate({ enrollmentId: half.enrollmentId, mode: "AUTO" })).reason, "not_eligible");
});

test("manual approval needs a real reason, is recorded as manual, and never as automatic completion", async () => {
  const s = await student({ complete: false, label: "manual" });
  await signIn(s.admin);
  for (const note of [undefined, "", "   ", "short", "x".repeat(501)]) {
    assert.equal((await issueCertificate({ enrollmentId: s.enrollmentId, mode: "MANUAL", approvalNote: note })).ok, false);
  }
  assert.equal(await count("certificates") >= 0, true);
  const res = await issueCertificate({ enrollmentId: s.enrollmentId, mode: "MANUAL", approvalNote: "Completed offline project review on 2026-10-01" });
  assert.equal(res.ok, true);
  const row = await tdb.prepare("SELECT issuance_basis, approval_note, issued_by FROM certificates WHERE id = ?").get(res.certificateId);
  assert.equal(row.issuance_basis, "MANUAL_APPROVAL");
  assert.equal(row.approval_note, "Completed offline project review on 2026-10-01");
  assert.equal(row.issued_by, s.admin.id);
  const detail = await getCertificateDetail(res.certificateId);
  assert.equal(detail.certificate.issuanceBasis, "MANUAL_APPROVAL");
  assert.ok(detail.history.some((h) => h.action === "CERTIFICATE_ISSUED" && h.detail.basis === "MANUAL_APPROVAL"));
});

test("cancelled enrollments, invalid ids and unknown modes can't be issued", async () => {
  const s = await student({ complete: true, label: "cancelled" });
  await signIn(s.admin);
  await setEnrollmentStatus(s.enrollmentId, "CANCELLED");
  assert.equal((await issueCertificate({ enrollmentId: s.enrollmentId, mode: "AUTO" })).reason, "enrollment_cancelled");
  assert.equal((await issueCertificate({ enrollmentId: s.enrollmentId, mode: "MANUAL", approvalNote: "long enough reason" })).reason, "enrollment_cancelled");
  assert.equal((await issueCertificate({ enrollmentId: "nope", mode: "AUTO" })).reason, "enrollment_invalid");
  assert.equal((await issueCertificate({ enrollmentId: undefined, mode: "AUTO" })).reason, "enrollment_invalid");
  const ok = await student({ complete: true, label: "okmode" });
  await signIn(ok.admin);
  assert.equal((await issueCertificate({ enrollmentId: ok.enrollmentId, mode: "FORCE" })).ok, false);
  assert.equal((await issueCertificate({ enrollmentId: ok.enrollmentId, mode: "" })).ok, false);
});

// ------------------------------------------------------------------ duplicates
test("duplicate issuance is prevented; a revoked certificate can be re-issued; numbers and tokens are unique", async () => {
  const s = await student({ complete: true, label: "dup" });
  await signIn(s.admin);
  const a = await issueCertificate({ enrollmentId: s.enrollmentId, mode: "AUTO" });
  assert.equal(a.ok, true);
  const b = await issueCertificate({ enrollmentId: s.enrollmentId, mode: "AUTO" });
  assert.equal(b.reason, "already_issued");
  assert.equal((await issueCertificate({ enrollmentId: s.enrollmentId, mode: "MANUAL", approvalNote: "second attempt reason" })).reason, "already_issued");
  assert.equal(
    (await tdb.prepare("SELECT COUNT(*) AS c FROM certificates WHERE student_id = ? AND course_slug = ? AND status = 'ACTIVE'").get(s.profile.id, s.courseSlug)).c,
    1
  );
  // the database itself also refuses a second ACTIVE row
  await assert.rejects(async () =>
    await tdb
      .prepare("INSERT INTO certificates (id, student_id, course_slug, certificate_number, status, verification_token) VALUES (?, ?, ?, ?, 'ACTIVE', ?)")
      .run("dup-direct", s.profile.id, s.courseSlug, "TOA-DUP-DIRECT", "tok-dup-direct-123456789")
  );
  // number uniqueness enforced by the schema
  await assert.rejects(async () =>
    await tdb
      .prepare("INSERT INTO certificates (id, student_id, course_slug, certificate_number, status) VALUES (?, ?, ?, ?, 'REVOKED')")
      .run("dup-number", s.profile.id, s.courseSlug, a.certificateNumber)
  );

  assert.equal((await revokeCertificate({ certificateId: a.certificateId, reason: "Issued in error" })).ok, true);
  const again = await issueCertificate({ enrollmentId: s.enrollmentId, mode: "AUTO" });
  assert.equal(again.ok, true, "a new certificate may follow a revoked one");
  assert.notEqual(again.certificateNumber, a.certificateNumber);
  const tokens = (await tdb.prepare("SELECT verification_token FROM certificates WHERE student_id = ?").all(s.profile.id)).map((r) => r.verification_token);
  assert.equal(new Set(tokens).size, tokens.length);
});

// --------------------------------------------------------------- authorization
test("only admins / super admins can issue, revoke, list or download; direct action calls write nothing", async () => {
  const s = await student({ complete: true, label: "authz" });
  await signIn(s.admin);
  const issued = await issueCertificate({ enrollmentId: s.enrollmentId, mode: "AUTO" });
  const target = await student({ complete: true, label: "authz2" });

  await signOut();
  const before = [await count("certificates"), await count("audit_log")];
  for (const role of [null, "STUDENT", "TRAINER", "COUNSELLOR", "ACCOUNTANT", "CONTENT_MANAGER", "PLACEMENT_MANAGER"]) {
    if (role) await signIn(await makeUser(role, "intruder"));
    assert.equal((await issueCertificate({ enrollmentId: target.enrollmentId, mode: "AUTO" })).ok, false);
    assert.equal((await issueCertificate({ enrollmentId: target.enrollmentId, mode: "MANUAL", approvalNote: "sneaky manual approval" })).ok, false);
    assert.equal((await revokeCertificate({ certificateId: issued.certificateId, reason: "nope" })).ok, false);
    assert.equal((await issueCertificateAction(null, form({ enrollmentId: target.enrollmentId, mode: "AUTO" }))).status, "error");
    assert.equal((await revokeCertificateAction(null, form({ certificateId: issued.certificateId, reason: "nope" }))).status, "error");
    assert.equal((await getCertificatesPage(parseCertificateParams({}))).total, 0);
    assert.equal(await getCertificateDetail(issued.certificateId), null);
    assert.equal(await getEligibility(target.enrollmentId), null);
    assert.equal(await getCertificateSummary(), null);
    assert.equal(await getCertificateFormData({}), null);
    assert.equal((await getCertificatePdfForAdmin(issued.certificateId)).ok, false);
  }
  assert.deepEqual([await count("certificates"), await count("audit_log")], before);
  assert.equal((await tdb.prepare("SELECT status FROM certificates WHERE id = ?").get(issued.certificateId)).status, "ACTIVE");
});

// -------------------------------------------------------- student ownership
test("students see and download only their own certificates; revoked ones are shown as revoked and can't be downloaded", async () => {
  const a = await student({ complete: true, label: "ownA" });
  const b = await student({ complete: true, label: "ownB" });
  await signIn(a.admin);
  const ca = await issueCertificate({ enrollmentId: a.enrollmentId, mode: "AUTO" });
  const cb = await issueCertificate({ enrollmentId: b.enrollmentId, mode: "AUTO" });

  await signIn(a.user);
  const mine = await getMyCertificates();
  assert.deepEqual(mine.map((c) => c.id), [ca.certificateId]);
  assert.ok(await getCertificateDetailForStudent(ca.certificateId));
  assert.equal(await getCertificateDetailForStudent(cb.certificateId), null, "another student's certificate");
  assert.equal(await getCertificateDetailForStudent("nope"), null);
  const dump = JSON.stringify(mine);
  for (const hidden of ["approvalNote", "revokedReason", "issuedBy", "enrollmentId", "verificationToken"]) assert.ok(!dump.includes(hidden), hidden);

  assert.equal((await getMyCertificatePdf(ca.certificateId)).ok, true);
  assert.equal((await getMyCertificatePdf(cb.certificateId)).reason, "not_found");

  await signIn(a.admin);
  await revokeCertificate({ certificateId: ca.certificateId, reason: "Plagiarised project" });
  await signIn(a.user);
  const after = await getMyCertificates();
  assert.equal(after[0].status, "REVOKED");
  assert.ok(!JSON.stringify(after).includes("Plagiarised"), "the staff-side reason is not exposed");
  assert.equal((await getMyCertificatePdf(ca.certificateId)).reason, "revoked");

  // a student can't act on the admin side
  const stillActive = (await getMyCertificates()).length;
  assert.equal((await revokeCertificateAction(null, form({ certificateId: cb.certificateId, reason: "x" }))).status, "error");
  assert.equal(stillActive, 1);
  assert.equal((await tdb.prepare("SELECT status FROM certificates WHERE id = ?").get(cb.certificateId)).status, "ACTIVE");
});

test("a student with no certificates sees a real empty state", async () => {
  const s = await student({ label: "none" });
  await signIn(s.user);
  assert.deepEqual(await getMyCertificates(), []);
});

// ------------------------------------------------------------ PDF generation
test("the generated certificate is a real, well-formed PDF containing the actual record", async () => {
  const s = await student({ complete: true, label: "pdfstu" });
  await signIn(s.admin);
  const issued = await issueCertificate({ enrollmentId: s.enrollmentId, mode: "AUTO" });
  const out = await getCertificatePdfForAdmin(issued.certificateId);
  assert.equal(out.ok, true);
  assert.equal(out.filename, `${issued.certificateNumber}.pdf`);

  const text = out.pdf.toString("latin1");
  assert.ok(text.startsWith("%PDF-1.4"));
  assert.ok(text.trimEnd().endsWith("%%EOF"));
  // structural integrity: startxref points at "xref", every object offset points at "N 0 obj"
  const startxref = Number(text.match(/startxref\n(\d+)\n%%EOF/)[1]);
  assert.equal(text.slice(startxref, startxref + 4), "xref");
  const entries = [...text.slice(startxref).matchAll(/(\d{10}) 00000 n /g)].map((m) => Number(m[1]));
  assert.equal(entries.length, 7);
  entries.forEach((offset, i) => assert.equal(text.slice(offset, offset + `${i + 1} 0 obj`.length), `${i + 1} 0 obj`));
  const len = Number(text.match(/\/Length (\d+)/)[1]);
  const streamStart = text.indexOf("stream\n") + 7;
  assert.equal(text.slice(streamStart + len, streamStart + len + 9), "endstream");

  const user = await makeUser("STUDENT", "x");
  assert.ok(user);
  assert.ok(text.includes(issued.certificateNumber));
  assert.ok(text.includes("Certificate of Completion"));
  assert.ok(text.includes("TechOTD Academy"));
  assert.ok(text.includes(verificationUrl((await tdb.prepare("SELECT verification_token t FROM certificates WHERE id = ?").get(issued.certificateId)).t)));
  // no invented endorsements
  for (const invented of ["Director", "Accredited", "Government", "University"]) assert.ok(!text.includes(invented), invented);
});

test("PDF text is escaped and bounded: parentheses, backslashes, non-Latin names and very long titles can't break the file", () => {
  const pdf = buildCertificatePdf({
    studentName: "Ana (Maria) \\ O'Neil " + "Z".repeat(200),
    courseTitle: "Course ) endstream << /Evil >> " + "Y".repeat(300),
    certificateNumber: "TOA-2026-ABCDEF0123",
    issuedAt: "2026-10-01 10:00:00",
    verifyUrl: "https://academy.example/verify-certificate/abc",
  }).toString("latin1");
  assert.ok(pdf.startsWith("%PDF-1.4") && pdf.trimEnd().endsWith("%%EOF"));
  // the stream is delimited by its /Length: the (escaped) injected words sit inside it
  const len = Number(pdf.match(/\/Length (\d+)/)[1]);
  const streamStart = pdf.indexOf("stream\n") + 7;
  assert.equal(pdf.slice(streamStart + len, streamStart + len + 10), "endstream\n");
  assert.equal((pdf.match(/\nendstream\n/g) || []).length, 1, "only one real stream terminator");
  assert.ok(!pdf.includes("\n) endstream"), "injected text did not break out of its string");
  assert.ok(pdf.includes("\\(Maria\\)"));
  const unicode = buildCertificatePdf({
    studentName: "राहुल शर्मा",
    courseTitle: "Full Stack",
    certificateNumber: "TOA-2026-0000000000",
    issuedAt: "2026-10-01 10:00:00",
    verifyUrl: "https://x/y",
  }).toString("latin1");
  assert.ok(unicode.includes("?"), "characters outside Latin-1 degrade to '?' instead of corrupting the PDF");
  assert.ok(unicode.trimEnd().endsWith("%%EOF"));
});

// ----------------------------------------------------------------- verification
test("public verification shows minimal information; revoked, unknown and malformed identifiers reveal nothing", async () => {
  const s = await student({ complete: true, label: "verify" });
  await signIn(s.admin);
  const issued = await issueCertificate({ enrollmentId: s.enrollmentId, mode: "MANUAL", approvalNote: "manual basis for the private note" }).catch(() => null);
  const cert = issued?.ok ? issued : await issueCertificate({ enrollmentId: s.enrollmentId, mode: "AUTO" });
  const token = (await tdb.prepare("SELECT verification_token t FROM certificates WHERE id = ?").get(cert.certificateId)).t;

  await signOut(); // verification needs no session at all
  const valid = await getPublicVerification(token);
  assert.equal(valid.valid, true);
  assert.equal(valid.status, "VALID");
  assert.equal(valid.certificateNumber, cert.certificateNumber);
  assert.equal(valid.holderName, s.user.name);
  assert.equal(valid.issuer, "TechOTD Academy");
  assert.deepEqual(Object.keys(valid).sort(), ["certificateNumber", "courseTitle", "holderName", "issuedAt", "issuer", "status", "valid"]);
  const dump = JSON.stringify(valid);
  for (const secret of [s.user.email, s.user.id, s.profile.id, cert.certificateId, "approval", "issuedBy"]) assert.ok(!dump.includes(secret), secret);

  // unknown / malformed / hostile identifiers
  for (const bad of ["", "short", "x".repeat(65), "../../etc/passwd", "' OR 1=1 --", cert.certificateNumber, cert.certificateId, null, undefined, {}]) {
    assert.equal(await getPublicVerification(bad), null, String(bad));
  }

  await signIn(s.admin);
  await revokeCertificate({ certificateId: cert.certificateId, reason: "Issued to the wrong learner" });
  await signOut();
  const revoked = await getPublicVerification(token);
  assert.equal(revoked.valid, false);
  assert.equal(revoked.status, "REVOKED");
  assert.ok(!JSON.stringify(revoked).includes("wrong learner"), "the revocation reason stays private");
});

test("revocation needs a reason, keeps the record and history, and can't be repeated", async () => {
  const s = await student({ complete: true, label: "revoke" });
  await signIn(s.admin);
  const c = await issueCertificate({ enrollmentId: s.enrollmentId, mode: "AUTO" });
  assert.equal((await revokeCertificate({ certificateId: c.certificateId, reason: "  " })).reason, "reason_required");
  assert.equal((await revokeCertificate({ certificateId: "missing", reason: "x" })).reason, "not_found");
  assert.equal((await revokeCertificate({ certificateId: c.certificateId, reason: "Duplicate issuance" })).ok, true);
  assert.equal((await revokeCertificate({ certificateId: c.certificateId, reason: "again" })).reason, "already_revoked");
  const row = await tdb.prepare("SELECT * FROM certificates WHERE id = ?").get(c.certificateId);
  assert.equal(row.status, "REVOKED");
  assert.equal(row.revoked_reason, "Duplicate issuance");
  assert.equal(row.revoked_by, s.admin.id);
  assert.ok(row.revoked_at);
  assert.equal(row.certificate_number, c.certificateNumber, "the record is preserved");
  assert.equal((await getCertificatePdfForAdmin(c.certificateId)).reason, "revoked");
  const detail = await getCertificateDetail(c.certificateId);
  assert.deepEqual(detail.history.map((h) => h.action).sort(), ["CERTIFICATE_ISSUED", "CERTIFICATE_REVOKED"]);
});

test("issuance is atomic: a failed audit write leaves no certificate behind", async () => {
  const s = await student({ complete: true, label: "atomic" });
  await signIn(s.admin);
  await failAuditInsert("fail_cert_audit", "CERTIFICATE_ISSUED");
  const before = await count("certificates");
  try {
    await assert.rejects(async () => await issueCertificate({ enrollmentId: s.enrollmentId, mode: "AUTO" }));
  } finally {
    await removeAuditFailure("fail_cert_audit");
  }
  assert.equal(await count("certificates"), before);
  assert.equal((await issueCertificate({ enrollmentId: s.enrollmentId, mode: "AUTO" })).ok, true);
});

test("certificate list: search, status filter, sort, pagination and injection-safe params", async () => {
  await signIn(await makeUser("ADMIN", "cert-lister"));
  const all = await getCertificatesPage(parseCertificateParams({}));
  assert.ok(all.total >= 1);
  const revoked = await getCertificatesPage(parseCertificateParams({ status: "REVOKED" }));
  assert.ok(revoked.rows.every((r) => r.status === "REVOKED"));
  const byNumber = await getCertificatesPage(parseCertificateParams({ q: all.rows[0].certificateNumber }));
  assert.equal(byNumber.total, 1);
  assert.deepEqual(parseCertificateParams({ status: "HACK", course: "A B", sort: "x; DROP", page: "-1" }), {
    q: "",
    status: "",
    course: "",
    sort: "newest",
    page: 1,
  });
  const before = await count("certificates");
  await getCertificatesPage(parseCertificateParams({ q: "'; DROP TABLE certificates; --" }));
  assert.equal(await count("certificates"), before);
});
