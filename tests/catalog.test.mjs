import { test } from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import Database from "better-sqlite3";
import { db } from "@/lib/db/client";
import { listCourses, getCourse, listBatches, getBatch, getRelatedCourses, formatBatchDate } from "@/lib/catalog";
import { courses as staticCourses } from "@/data/courses";
import { batches as staticBatches } from "@/data/batches";
import {
  createCourse,
  updateCourse,
  setCourseStatus,
  getCoursesPage,
  getCourseDetailForAdmin,
} from "@/lib/admin/courses";
import {
  createBatch,
  updateBatch,
  setBatchStatus,
  assignTrainerToBatchAdmin,
  removeTrainerFromBatch,
  getBatchesPage,
  getBatchDetailForAdmin,
} from "@/lib/admin/batches";
import { createCourseAction, updateCourseAction, createBatchAction, assignTrainerAction } from "@/lib/admin/catalogActions";
import { parseCourseParams, parseBatchParams } from "@/lib/admin/catalogParams";
import { validateCourseInput, validateBatchInput, validateCourseSlug, parseList, slugify, isValidIsoDate } from "@/lib/validateCatalog";
import { createEnrollment, setEnrollmentStatus, getEnrollmentFormData, getEnrollmentDetail } from "@/lib/admin/enrollments";
import { assignFee } from "@/lib/fees/service";
import { submitLead } from "@/lib/crm/submit";
import { catalogRecommendations } from "@/lib/ai/recommend";
import { listBatchIdsForTrainer } from "@/lib/db/trainerBatchAssignments";
import { getMyBatchEnrollments } from "@/lib/student/batches";
import sitemap from "@/app/sitemap";
import { makeUser, signIn, signOut } from "./helpers.mjs";

const uid = () => crypto.randomUUID().slice(0, 8);
const as = async (role, label) => {
  const user = await makeUser(role, label);
  await signIn(user);
  return user;
};

function courseInput(overrides = {}) {
  const id = uid();
  return {
    slug: `course-${id}`,
    title: `Catalog Test Course ${id}`,
    shortDescription: "A short summary for the catalog test.",
    description: "A longer description that comfortably exceeds the minimum length.",
    categorySlug: "programming",
    level: "Beginner",
    duration: "3 Months",
    durationBand: "Medium (2–4 Months)",
    modes: ["Live Online", "Classroom"],
    technologies: "Rust, Cargo",
    prerequisites: "Basic computer literacy",
    outcomes: "Build a CLI tool\nWrite tests",
    status: "UNPUBLISHED",
    ...overrides,
  };
}

function batchInput(courseSlug, overrides = {}) {
  return { courseSlug, mode: "Live Online", schedule: `Mon – Fri • ${uid()}`, startsOn: "2027-01-11", endsOn: "2027-03-30", status: "Upcoming", location: "", ...overrides };
}

async function newPublishedCourse(overrides = {}) {
  const input = courseInput({ status: "PUBLISHED", ...overrides });
  const r = await createCourse(input);
  assert.equal(r.ok, true, JSON.stringify(r));
  return input;
}

const audit = (type, id) => db.prepare("SELECT action, detail FROM audit_log WHERE entity_type = ? AND entity_id = ? ORDER BY created_at, rowid").all(type, id);

// ------------------------------------------------------------ catalog merge

test("without any admin edits the catalog is exactly the code-defined data", () => {
  const before = db.prepare("SELECT COUNT(*) c FROM catalog_courses").get().c;
  for (const base of staticCourses) {
    const merged = getCourse(base.slug);
    assert.equal(merged.title, base.title);
    assert.equal(merged.levelLabel, base.levelLabel);
    assert.equal(merged.status, "PUBLISHED");
    assert.equal(merged.isCustom, false);
  }
  for (const b of staticBatches) {
    const merged = getBatch(b.id);
    assert.equal(merged.startDate, b.startDate, "formatted start date identical to the code value");
    assert.equal(merged.status, b.status);
  }
  assert.equal(formatBatchDate("2026-11-07"), "07 Nov 2026");
  assert.equal(db.prepare("SELECT COUNT(*) c FROM catalog_courses").get().c, before, "reading never writes");
  assert.equal(getCourse("no-such-course"), undefined);
  assert.equal(getBatch("no-such-batch"), null);
  assert.equal(getCourse({ toString: () => "x" }), undefined, "non-string ids are rejected");
});

// ----------------------------------------------------------------- courses

test("validation: pure helpers reject bad input and normalise text", () => {
  assert.deepEqual(parseList("a, B\nb,  c ", { separators: /[\n,]/ }), ["a", "B", "c"], "deduplicated case-insensitively");
  assert.equal(slugify("Rust & C++ Systems!"), "rust-and-c-systems");
  assert.equal(validateCourseSlug("Bad Slug").error !== null, true);
  assert.equal(validateCourseSlug("ok-slug-2").error, null);
  assert.equal(validateCourseSlug("-leading").error !== null, true);
  assert.equal(validateCourseSlug("a".repeat(61)).error !== null, true);
  for (const good of ["2027-01-31", "2028-02-29"]) assert.equal(isValidIsoDate(good), true, good);
  for (const bad of ["2027-02-30", "2027-13-01", "27-01-01", "", "2027-1-1", "1999-01-01", "2101-01-01", null]) assert.equal(isValidIsoDate(bad), false, String(bad));

  const { errors } = validateCourseInput({ title: "x", shortDescription: "short", description: "tiny", categorySlug: "nope", level: "Expert", duration: "", durationBand: "x", modes: ["Teleport"], technologies: "", prerequisites: "", outcomes: "" });
  for (const key of ["title", "shortDescription", "description", "categorySlug", "level", "duration", "durationBand", "modes"]) assert.ok(errors[key], `${key} rejected`);
  const long = validateCourseInput(courseInput({ title: "t".repeat(101), outcomes: "x".repeat(121) }));
  assert.ok(long.errors.title && long.errors.outcomes, "over-long values are rejected, not truncated");
  const ctl = validateCourseInput(courseInput({ title: "Tab\tand\u0000null  spaces" }));
  assert.equal(ctl.value.title, "Tab and null spaces");
});

test("only ADMIN and SUPER_ADMIN can read or change the catalog; every other role and anonymous callers are refused", async () => {
  const slug = `auth-${uid()}`;
  const probe = async (role) => {
    await (role ? as(role, `auth-${role.toLowerCase()}`) : signOut());
    const create = await createCourse(courseInput({ slug }));
    const edit = await updateCourse("full-stack-development", courseInput());
    const status = await setCourseStatus("full-stack-development", "UNPUBLISHED");
    const batch = await createBatch(batchInput("full-stack-development"));
    const upd = await updateBatch(staticBatches[0].id, batchInput("full-stack-development"));
    const bstatus = await setBatchStatus(staticBatches[0].id, "Closed");
    const assign = await assignTrainerToBatchAdmin(staticBatches[0].id, "whatever");
    const remove = await removeTrainerFromBatch(staticBatches[0].id, "whatever");
    const reads = [(await getCoursesPage()).total, (await getBatchesPage()).total, await getCourseDetailForAdmin("full-stack-development"), await getBatchDetailForAdmin(staticBatches[0].id)];
    return { writes: [create, edit, status, batch, upd, bstatus, assign, remove], reads };
  };
  for (const role of [null, "STUDENT", "TRAINER", "COUNSELLOR", "ACCOUNTANT", "PLACEMENT_MANAGER", "CONTENT_MANAGER"]) {
    const { writes, reads } = await probe(role);
    for (const w of writes) assert.deepEqual([w.ok, w.reason], [false, "forbidden"], `${role}`);
    assert.deepEqual(reads, [0, 0, null, null], `${role} reads nothing`);
  }
  assert.equal(getCourse(slug), undefined, "nothing was created");
  assert.equal(getCourse("full-stack-development").status, "PUBLISHED");
  assert.equal(db.prepare("SELECT COUNT(*) c FROM audit_log WHERE entity_id = ?").get(slug).c, 0);
});

test("create course: success, audit row, status default, duplicates, validation and forged fields", async () => {
  await as("ADMIN", "course-admin");
  const input = courseInput();
  const r = await createCourse(input);
  assert.deepEqual({ ok: r.ok, slug: r.slug, status: r.status }, { ok: true, slug: input.slug, status: "UNPUBLISHED" });
  const course = getCourse(input.slug);
  assert.equal(course.title, input.title);
  assert.deepEqual(course.technologies, ["Rust", "Cargo"]);
  assert.deepEqual(course.outcomes, ["Build a CLI tool", "Write tests"]);
  assert.equal(course.isCustom, true);
  assert.equal(course.initials.length > 0, true);
  assert.deepEqual([course.modules, course.projects, course.faqs], [[], [], []], "syllabus content defaults to empty, not undefined");
  assert.equal(audit("course", input.slug)[0].action, "course.created");

  // duplicate slug (custom + code-defined) and duplicate title (case-insensitive)
  assert.equal((await createCourse(courseInput({ slug: input.slug }))).errors.slug.includes("already exists"), true);
  assert.ok((await createCourse(courseInput({ slug: "full-stack-development" }))).errors.slug);
  assert.ok((await createCourse(courseInput({ title: input.title.toUpperCase() }))).errors.title);
  // invalid slug / unknown category / status falls back to the safe default
  assert.ok((await createCourse(courseInput({ slug: "Not A Slug" }))).errors.slug);
  assert.ok((await createCourse(courseInput({ categorySlug: "hacking" }))).errors.categorySlug);
  const forged = courseInput({ status: "SUPER_PUBLISHED" });
  await createCourse(forged);
  assert.equal(getCourse(forged.slug).status, "UNPUBLISHED");
  const rows = db.prepare("SELECT COUNT(*) c FROM catalog_courses WHERE slug IN (?, ?)").get("Not A Slug", "x").c;
  assert.equal(rows, 0);
});

test("server actions echo the submitted values on error (no secrets) and redirect on success", async () => {
  await as("ADMIN", "course-action");
  const fd = (v) => {
    const f = new FormData();
    for (const [k, val] of Object.entries(v)) {
      if (Array.isArray(val)) val.forEach((x) => f.append(k, x));
      else f.set(k, val);
    }
    return f;
  };
  const bad = await createCourseAction(null, fd(courseInput({ title: "x" })));
  assert.equal(bad.status, "error");
  assert.ok(bad.errors.title);
  assert.equal(bad.values.shortDescription, "A short summary for the catalog test.");
  assert.deepEqual(bad.values.modes, ["Live Online", "Classroom"]);

  const good = courseInput();
  let target = null;
  try {
    await createCourseAction(null, fd(good));
  } catch (error) {
    target = error.location;
  }
  assert.equal(target, `/admin/courses/${good.slug}`);

  const saved = await updateCourseAction(null, fd({ ...good, title: `${good.title} v2` }));
  assert.deepEqual([saved.status, saved.message], ["success", "Course saved."]);
  const same = await updateCourseAction(null, fd({ ...good, title: `${good.title} v2` }));
  assert.equal(same.message, "No changes to save.");

  const batchErr = await createBatchAction(null, fd(batchInput(good.slug, { startsOn: "2027-02-30" })));
  assert.equal(batchErr.status, "error");
  assert.ok(batchErr.errors.startsOn);
  assert.equal(batchErr.values.schedule.startsWith("Mon"), true);
});

test("edit course: code-defined and custom courses; only real differences are stored; slug is immutable", async () => {
  await as("ADMIN", "course-edit");
  const base = getCourse("react-development");
  const edit = courseInput({
    slug: "react-development",
    title: "React.js Development (Updated)",
    shortDescription: base.shortDescription,
    description: base.description,
    categorySlug: base.categorySlug,
    level: base.level,
    duration: base.duration,
    durationBand: base.durationBand,
    modes: base.modes,
    technologies: base.technologies.join(", "),
    prerequisites: base.prerequisites.join("\n"),
    outcomes: base.outcomes.join("\n"),
  });
  const r = await updateCourse("react-development", edit);
  assert.deepEqual([r.ok, r.changed], [true, ["title"]]);
  const merged = getCourse("react-development");
  assert.equal(merged.title, "React.js Development (Updated)");
  assert.equal(merged.levelLabel, base.levelLabel, "an untouched field keeps its original presentation");
  assert.deepEqual(merged.modules, base.modules, "syllabus content is untouched");
  assert.equal(merged.status, "PUBLISHED");
  assert.equal(JSON.parse(audit("course", "react-development").at(-1).detail).changed[0], "title");
  assert.equal((await updateCourse("react-development", edit)).unchanged, true);
  // restore for other tests in this file
  await updateCourse("react-development", { ...edit, title: base.title });

  // custom course: edit, then try to smuggle a different slug through the form
  const created = courseInput();
  await createCourse(created);
  const r2 = await updateCourse(created.slug, { ...created, slug: "full-stack-development", title: "Renamed Custom", level: "Advanced" });
  assert.equal(r2.ok, true);
  assert.equal(getCourse(created.slug).title, "Renamed Custom");
  assert.equal(getCourse(created.slug).level, "Advanced");
  assert.equal(getCourse("full-stack-development").title, "Full Stack Development", "the forged slug changed nothing else");
  assert.deepEqual(await updateCourse("missing-course", created), { ...(await updateCourse("missing-course", created)) });
  assert.equal((await updateCourse("missing-course", created)).reason, "not_found");
  assert.ok((await updateCourse(created.slug, { ...created, title: "Full Stack Development" })).errors.title, "title can't collide with another course");
});

test("publication: unpublished courses leave every public surface but stay resolvable for existing records", async () => {
  await as("ADMIN", "course-vis");
  const input = await newPublishedCourse();
  const slug = input.slug;
  assert.ok(listCourses({ publishedOnly: true }).some((c) => c.slug === slug));
  assert.ok(sitemap().some((e) => e.url.endsWith(`/courses/${slug}`)), "published => in sitemap");
  assert.ok(catalogRecommendations({ interests: "Rust Cargo" }).scored.some((x) => x.course.slug === slug), "recommendable");

  const batch = await createBatch(batchInput(slug, { status: "Open" }));
  assert.ok(listBatches({ publicOnly: true }).some((b) => b.id === batch.batchId));
  const student = await makeUser("STUDENT", "vis-student");
  const enrol = await createEnrollment({ studentUserId: student.id, courseSlug: slug, batchId: batch.batchId });
  assert.equal(enrol.ok, true);

  const off = await setCourseStatus(slug, "UNPUBLISHED");
  assert.deepEqual([off.ok, off.activeEnrollments], [true, 1]);
  assert.equal(getCourse(slug, { publishedOnly: true }), undefined, "hidden from public lookups");
  assert.ok(!listCourses({ publishedOnly: true }).some((c) => c.slug === slug));
  assert.ok(listCourses().some((c) => c.slug === slug), "still listed for admins");
  assert.ok(!sitemap().some((e) => e.url.endsWith(`/courses/${slug}`)), "not in the sitemap");
  assert.ok(!listBatches({ publicOnly: true }).some((b) => b.id === batch.batchId), "its batches leave the public list");
  assert.ok(!catalogRecommendations({ interests: "Rust Cargo" }).scored.some((x) => x.course.slug === slug), "not recommended");
  assert.ok(!getRelatedCourses(getCourse("full-stack-development"), 50).some((c) => c.slug === slug));
  assert.equal((await submitLead({ name: "Visitor", phone: "9876543210", email: `v-${uid()}@example.test`, consent: true, interestedCourse: slug }, "enquiry")).ok, false, "enquiries about an unpublished course are refused");

  // existing history still resolves
  assert.equal((await getEnrollmentDetail(enrol.enrollmentId)).courseTitle, input.title);
  assert.equal(getCourse(slug).title, input.title);
  // ...but new enrollments are refused, and the form no longer offers it
  const other = await makeUser("STUDENT", "vis-student2");
  assert.equal((await createEnrollment({ studentUserId: other.id, courseSlug: slug, batchId: batch.batchId })).reason, "course_unpublished");
  const formData = await getEnrollmentFormData({});
  assert.ok(!formData.courses.some((c) => c.value === slug));

  assert.equal((await setCourseStatus(slug, "UNPUBLISHED")).unchanged, true);
  assert.equal((await setCourseStatus(slug, "BOGUS")).reason, "status_invalid");
  assert.equal((await setCourseStatus("nope", "PUBLISHED")).reason, "not_found");
  assert.equal((await setCourseStatus(slug, "PUBLISHED")).ok, true);
  assert.ok(listCourses({ publishedOnly: true }).some((c) => c.slug === slug), "republished");
  assert.deepEqual(audit("course", slug).map((a) => a.action), ["course.created", "course.unpublished", "course.published"]);
});

test("unpublishing a code-defined course keeps its enrollments, fees and student view intact", async () => {
  await as("ADMIN", "course-hist");
  const slug = "python-development";
  const batch = staticBatches.find((b) => b.courseSlug === slug);
  const student = await makeUser("STUDENT", "hist-student");
  const enrol = await createEnrollment({ studentUserId: student.id, courseSlug: slug, batchId: batch.id });
  assert.equal(enrol.ok, true);
  const fee = await assignFee({ enrollmentId: enrol.enrollmentId, currency: "INR", total: "5000", discount: "0" });
  assert.equal(fee.ok, true);

  assert.equal((await setCourseStatus(slug, "UNPUBLISHED")).ok, true);
  try {
    assert.equal(getCourse(slug).title, "Python Development");
    const enrollment = db.prepare("SELECT status FROM batch_enrollments WHERE batch_id = ?").get(batch.id);
    assert.equal(enrollment.status, "ACTIVE");
    assert.equal(db.prepare("SELECT COUNT(*) c FROM fee_plans WHERE course_slug = ?").get(slug).c, 1);
    await signIn(student);
    const mine = await getMyBatchEnrollments();
    assert.equal(mine.length, 1);
    assert.equal(mine[0].course.slug, slug, "the student still sees their course");
  } finally {
    await signOut();
    await as("ADMIN", "course-hist-restore");
    await setCourseStatus(slug, "PUBLISHED");
  }
});

// ----------------------------------------------------------------- batches

test("create batch: generated ids, validation, duplicate prevention, course/mode relationship", async () => {
  await as("ADMIN", "batch-admin");
  const { slug } = await newPublishedCourse({ modes: ["Live Online"] });

  const first = await createBatch(batchInput(slug));
  assert.deepEqual([first.ok, first.batchId], [true, `${slug}-01`]);
  const second = await createBatch(batchInput(slug, { startsOn: "2027-02-01" }));
  assert.equal(second.batchId, `${slug}-02`);
  const b = getBatch(first.batchId);
  assert.deepEqual([b.courseSlug, b.mode, b.startDate, b.endDate, b.status, b.location], [slug, "Live Online", "11 Jan 2027", "30 Mar 2027", "Upcoming", "Online"]);
  assert.equal(audit("batch", first.batchId)[0].action, "batch.created");

  // a code-defined course continues its numbering: full-stack-development-01 exists
  const code = await createBatch(batchInput("full-stack-development", { mode: "Classroom" }));
  assert.equal(code.batchId, "full-stack-development-02");

  const sched = batchInput(slug, { schedule: "Sat • 10:00 AM" });
  assert.equal((await createBatch(sched)).ok, true);
  assert.ok((await createBatch({ ...sched, schedule: "sat • 10:00 am" })).errors.schedule, "same course+mode+start+schedule is a duplicate");

  const cases = [
    [{ courseSlug: "nope" }, "courseSlug"],
    [{ mode: "Teleport" }, "mode"],
    [{ mode: "Classroom" }, "mode"], // course only offers Live Online
    [{ startsOn: "" }, "startsOn"],
    [{ startsOn: "2027-02-30" }, "startsOn"],
    [{ endsOn: "2026-12-31" }, "endsOn"],
    [{ endsOn: "garbage" }, "endsOn"],
    [{ status: "Gone" }, "status"],
    [{ status: "Archived" }, "status"],
    [{ schedule: "x" }, "schedule"],
    [{ location: "l".repeat(121) }, "location"],
  ];
  for (const [override, field] of cases) {
    const r = await createBatch(batchInput(slug, { schedule: `Distinct ${uid()}`, ...override }));
    assert.equal(r.ok, false, JSON.stringify(override));
    assert.ok(r.errors?.[field], `${JSON.stringify(override)} -> ${field}`);
  }
  assert.equal(listBatches({ courseSlug: slug }).length, 3, "invalid submissions created nothing");
});

test("edit batch: course is immutable, edits are audited, code-defined batches can be edited, no-ops are reported", async () => {
  await as("ADMIN", "batch-edit");
  const { slug } = await newPublishedCourse();
  const made = await createBatch(batchInput(slug));
  const id = made.batchId;
  const current = getBatch(id);

  const r = await updateBatch(id, { ...batchInput(slug), courseSlug: "full-stack-development", schedule: "Tue – Thu • 9:00 PM", status: "Open", mode: current.mode });
  assert.deepEqual([r.ok, r.changed.sort()], [true, ["schedule", "status"]]);
  assert.equal(getBatch(id).courseSlug, slug, "a forged courseSlug is ignored");
  assert.equal(getBatch(id).schedule, "Tue – Thu • 9:00 PM");
  assert.equal(JSON.parse(audit("batch", id).at(-1).detail).changed.length, 2);
  assert.equal((await updateBatch(id, { ...batchInput(slug), schedule: "Tue – Thu • 9:00 PM", status: "Open" })).unchanged, true);
  assert.equal((await updateBatch("missing-batch", batchInput(slug))).reason, "not_found");
  assert.ok((await updateBatch(id, { ...batchInput(slug), schedule: "Tue – Thu • 9:00 PM", status: "Open", endsOn: "2026-01-01" })).errors.endsOn);

  // code-defined batch
  const base = staticBatches.find((b) => b.courseSlug === "cloud-devops");
  const baseEdit = { mode: base.mode, schedule: base.schedule, startsOn: base.startsOn, endsOn: "2027-02-28", status: base.status, location: base.location };
  assert.equal((await updateBatch(base.id, baseEdit)).ok, true);
  assert.equal(getBatch(base.id).endDate, "28 Feb 2027");
  assert.equal(getBatch(base.id).startDate, base.startDate);
  assert.equal(getBatch(base.id).origin, "BASE");
});

test("batch lifecycle: closed/completed batches stop taking enrollments and leave the public list; enrollment history is preserved", async () => {
  await as("ADMIN", "batch-life");
  const { slug } = await newPublishedCourse();
  const { batchId } = await createBatch(batchInput(slug, { status: "Open" }));
  const student = await makeUser("STUDENT", "life-student");
  const enrol = await createEnrollment({ studentUserId: student.id, courseSlug: slug, batchId });
  assert.equal(enrol.ok, true);
  const rowBefore = db.prepare("SELECT * FROM batch_enrollments WHERE id = ?").get(enrol.enrollmentId);

  assert.equal((await setBatchStatus(batchId, "Closed")).ok, true);
  assert.ok(!listBatches({ publicOnly: true }).some((b) => b.id === batchId));
  const other = await makeUser("STUDENT", "life-student2");
  assert.equal((await createEnrollment({ studentUserId: other.id, courseSlug: slug, batchId })).reason, "batch_closed");
  const form = await getEnrollmentFormData({});
  assert.ok(!form.batches.some((b) => b.value === batchId));
  assert.deepEqual(db.prepare("SELECT * FROM batch_enrollments WHERE id = ?").get(enrol.enrollmentId), rowBefore, "the enrollment row is untouched");

  // archiving is blocked while an enrollment is ACTIVE, allowed once it isn't
  assert.equal((await setBatchStatus(batchId, "Archived")).reason, "archive_blocked");
  assert.equal(getBatch(batchId).status, "Closed");
  assert.equal((await updateBatch(batchId, { ...batchInput(slug), mode: "Live Online", schedule: getBatch(batchId).schedule, startsOn: getBatch(batchId).startsOn, endsOn: getBatch(batchId).endsOn, status: "Archived" })).reason, "archive_blocked");
  assert.equal((await setEnrollmentStatus(enrol.enrollmentId, "COMPLETED")).ok, true);
  assert.equal((await setBatchStatus(batchId, "Archived")).ok, true);
  assert.equal(db.prepare("SELECT status FROM batch_enrollments WHERE id = ?").get(enrol.enrollmentId).status, "COMPLETED", "history kept");
  assert.equal((await getEnrollmentDetail(enrol.enrollmentId)).courseSlug, slug);
  assert.equal((await setBatchStatus(batchId, "Archived")).unchanged, true);
  assert.equal((await setBatchStatus(batchId, "Weird")).reason, "status_invalid");
});

test("an enrollment in an admin-created batch flows through fees and student views like any other", async () => {
  await as("ADMIN", "batch-flow");
  const { slug, title } = await newPublishedCourse();
  const { batchId } = await createBatch(batchInput(slug, { status: "Open" }));
  const student = await makeUser("STUDENT", "flow-student");
  const enrol = await createEnrollment({ studentUserId: student.id, courseSlug: slug, batchId });
  assert.equal(enrol.ok, true);
  assert.equal((await createEnrollment({ studentUserId: student.id, courseSlug: slug, batchId })).reason, "duplicate");
  const fee = await assignFee({ enrollmentId: enrol.enrollmentId, currency: "INR", total: "1000", discount: "0" });
  assert.equal(fee.ok, true);
  assert.equal(db.prepare("SELECT course_slug, batch_id FROM fee_plans WHERE enrollment_id = ?").get(enrol.enrollmentId).batch_id, batchId);
  await signIn(student);
  const mine = await getMyBatchEnrollments();
  assert.equal(mine[0].batch.id, batchId);
  assert.equal(mine[0].course.title, title);
});

test("trainer assignment: validated against real active trainers, idempotent, audited, reversible, isolated", async () => {
  await as("ADMIN", "trainer-admin");
  const { slug } = await newPublishedCourse();
  const { batchId } = await createBatch(batchInput(slug));
  const trainer = await makeUser("TRAINER", "assign-trainer");
  const other = await makeUser("TRAINER", "assign-other");
  const student = await makeUser("STUDENT", "assign-student");
  const inactive = await makeUser("TRAINER", "assign-inactive");
  db.prepare("UPDATE users SET status = 'INACTIVE' WHERE id = ?").run(inactive.id);

  assert.equal((await assignTrainerToBatchAdmin(batchId, student.id)).reason, "trainer_invalid", "not a trainer");
  assert.equal((await assignTrainerToBatchAdmin(batchId, inactive.id)).reason, "trainer_invalid", "inactive trainer");
  assert.equal((await assignTrainerToBatchAdmin(batchId, "no-such-user")).reason, "trainer_invalid");
  assert.equal((await assignTrainerToBatchAdmin("no-such-batch", trainer.id)).reason, "not_found");
  assert.equal(listBatchIdsForTrainer(student.id).length, 0);

  assert.equal((await assignTrainerToBatchAdmin(batchId, trainer.id)).ok, true);
  assert.equal((await assignTrainerToBatchAdmin(batchId, trainer.id)).reason, "already_assigned");
  assert.deepEqual(listBatchIdsForTrainer(trainer.id), [batchId]);
  assert.deepEqual(listBatchIdsForTrainer(other.id), [], "another trainer gains nothing");
  const detail = await getBatchDetailForAdmin(batchId);
  assert.deepEqual(detail.trainers.map((t) => t.id), [trainer.id]);
  assert.ok(!detail.assignableTrainers.some((t) => t.id === trainer.id));
  assert.ok(detail.assignableTrainers.some((t) => t.id === other.id));
  assert.ok(!detail.assignableTrainers.some((t) => t.id === inactive.id));

  assert.equal((await removeTrainerFromBatch(batchId, other.id)).reason, "not_assigned");
  assert.equal((await removeTrainerFromBatch(batchId, trainer.id)).ok, true);
  assert.deepEqual(listBatchIdsForTrainer(trainer.id), []);
  assert.deepEqual(audit("batch", batchId).map((a) => a.action), ["batch.created", "batch.trainer_assigned", "batch.trainer_removed"]);

  await setBatchStatus(batchId, "Archived");
  assert.equal((await assignTrainerToBatchAdmin(batchId, trainer.id)).reason, "batch_archived");
  const fd = new FormData();
  fd.set("batchId", batchId);
  fd.set("trainerId", trainer.id);
  assert.equal((await assignTrainerAction(null, fd)).status, "error");
});

// ----------------------------------------------------------------- lists

test("admin lists: search, filters, sorting and pagination are real and bounded", async () => {
  await as("ADMIN", "lists-admin");
  const marker = `Zq${uid()}`;
  for (let i = 0; i < 22; i += 1) {
    await createCourse(courseInput({ title: `${marker} Course ${String(i).padStart(2, "0")}`, slug: `${marker.toLowerCase()}-${i}`, status: i % 2 ? "PUBLISHED" : "UNPUBLISHED" }));
  }
  const all = await getCoursesPage({ q: marker });
  assert.deepEqual([all.total, all.rows.length, all.totalPages], [22, 20, 2]);
  assert.equal((await getCoursesPage({ q: marker, page: 2 })).rows.length, 2);
  assert.equal((await getCoursesPage({ q: marker, page: 99 })).page, 2, "out-of-range pages clamp");
  assert.equal((await getCoursesPage({ q: marker, status: "PUBLISHED" })).total, 11);
  assert.equal((await getCoursesPage({ q: marker, level: "Advanced" })).total, 0);
  assert.equal((await getCoursesPage({ q: "zzz-no-match" })).rows.length, 0);
  assert.equal((await getCoursesPage({ q: marker, sort: "az" })).rows[0].title.endsWith("00"), true);
  assert.ok((await getCoursesPage({ category: "full-stack-development" })).rows.every((c) => c.category === "Full Stack Development"));
  const row = (await getCoursesPage({ q: "Full Stack Development" })).rows.find((r) => r.slug === "full-stack-development");
  assert.ok(row.batchCount >= 1);

  const bs = await getBatchesPage({});
  assert.ok(bs.total >= staticBatches.length);
  assert.ok((await getBatchesPage({ course: "cloud-devops" })).rows.every((b) => b.courseSlug === "cloud-devops"));
  assert.ok((await getBatchesPage({ mode: "Classroom" })).rows.every((b) => b.mode === "Classroom"));
  const asc = (await getBatchesPage({ sort: "start-asc" })).rows.map((b) => b.startsOn);
  assert.deepEqual(asc, [...asc].sort());
});

test("list params are whitelisted", () => {
  assert.deepEqual(parseCourseParams({ q: " x ", category: "nope", level: "Expert", status: "WHATEVER", sort: "drop table", page: "-4" }), { q: "x", category: "", level: "", status: "", sort: "az", page: 1 });
  assert.equal(parseCourseParams({ category: "programming", level: "Beginner", status: "PUBLISHED", sort: "newest", page: "3" }).page, 3);
  assert.deepEqual(parseBatchParams({ course: "A B;--", status: "Nope", mode: "Teleport", sort: "x", page: "abc" }), { q: "", course: "", status: "", mode: "", sort: "start", page: 1 });
  assert.equal(parseBatchParams({ course: "cloud-devops", status: "Open", mode: "Classroom" }).course, "cloud-devops");
  assert.equal(parseCourseParams({ q: "y".repeat(500) }).q.length, 100);
});

// ----------------------------------------------------------------- migration

test("opening a database created before the catalog tables existed adds them in place and keeps all data", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "techotd-cat-"));
  const file = path.join(dir, "legacy.db");
  try {
    const legacy = new Database(file);
    // The real schema as it was before this phase: everything except the catalog tables.
    const schema = fs.readFileSync(path.resolve(import.meta.dirname, "..", "src", "lib", "db", "schema.sql"), "utf8");
    legacy.exec(schema.split("Admin-managed catalog overlay (Phase 10.11)")[0]);
    legacy.pragma("foreign_keys = OFF");
    legacy.exec(`INSERT INTO users (id, name, email, password_hash) VALUES ('u1', 'Legacy', 'legacy@example.test', 'x');
      INSERT INTO student_profiles (id, user_id) VALUES ('p1', 'u1');
      INSERT INTO batch_enrollments (id, student_id, batch_id) VALUES ('e1', 'p1', 'full-stack-development-01');`);
    assert.equal(legacy.prepare("SELECT COUNT(*) c FROM sqlite_master WHERE name = 'catalog_courses'").get().c, 0, "fixture really predates the tables");
    legacy.close();
    const root = path.resolve(import.meta.dirname, "..");
    const script = path.join(dir, "open.mjs");
    fs.writeFileSync(script, `import { register } from "node:module";\nregister(new URL(${JSON.stringify("file:///" + path.join(root, "tests", "loader.mjs").split(path.sep).join("/"))}));\nawait import("@/lib/db/client");\n`);
    for (const attempt of [1, 2]) {
      const r = spawnSync(process.execPath, [script], { cwd: root, env: { ...process.env, DATABASE_URL: `file:${file.split(path.sep).join("/")}`, NODE_ENV: "test" }, encoding: "utf8" });
      assert.equal(r.status, 0, `open #${attempt}: ${r.stderr}`);
    }
    const check = new Database(file, { readonly: true });
    const tables = check.prepare("SELECT name FROM sqlite_master WHERE type = 'table'").all().map((t) => t.name);
    assert.ok(tables.includes("catalog_courses") && tables.includes("catalog_batches"));
    assert.equal(check.prepare("SELECT COUNT(*) c FROM catalog_courses").get().c, 0, "no catalog rows are invented");
    assert.equal(check.prepare("SELECT name FROM users WHERE id = 'u1'").get().name, "Legacy");
    assert.equal(check.prepare("SELECT batch_id FROM batch_enrollments WHERE id = 'e1'").get().batch_id, "full-stack-development-01");
    check.close();
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
