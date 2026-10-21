import { test } from "node:test";
import assert from "node:assert/strict";
import { tdb } from "./tdb.mjs";
import crypto from "node:crypto";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import pg from "pg";
import { pathToFileURL } from "node:url";
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

const audit = async (type, id) => await tdb.prepare("SELECT action, detail FROM audit_log WHERE entity_type = ? AND entity_id = ? ORDER BY created_at, seq").all(type, id);

// ------------------------------------------------------------ catalog merge

test("without any admin edits the catalog is exactly the code-defined data", async () => {
  const before = (await tdb.prepare("SELECT COUNT(*) c FROM catalog_courses").get()).c;
  for (const base of staticCourses) {
    const merged = await getCourse(base.slug);
    assert.equal(merged.title, base.title);
    assert.equal(merged.levelLabel, base.levelLabel);
    assert.equal(merged.status, "PUBLISHED");
    assert.equal(merged.isCustom, false);
  }
  for (const b of staticBatches) {
    const merged = await getBatch(b.id);
    if (b.datesTba) {
      // placeholder schedules are never shown as real dates/times
      assert.equal(merged.datesTba, true);
      assert.equal(merged.startDate, "Dates to be announced");
      assert.equal(merged.schedule, "Timing to be announced");
    } else {
      assert.equal(merged.startDate, b.startDate, "formatted start date identical to the code value");
    }
    assert.equal(merged.status, b.status);
  }
  assert.equal(formatBatchDate("2026-11-07"), "07 Nov 2026");
  assert.equal((await tdb.prepare("SELECT COUNT(*) c FROM catalog_courses").get()).c, before, "reading never writes");
  assert.equal(await getCourse("no-such-course"), undefined);
  assert.equal(await getBatch("no-such-batch"), null);
  assert.equal(await getCourse({ toString: () => "x" }), undefined, "non-string ids are rejected");
});

test("an admin entering a real start date and schedule replaces a placeholder batch's 'to be announced'", async () => {
  await as("ADMIN", "tba-admin");
  const base = staticBatches.find((b) => b.datesTba && b.courseSlug === "data-analytics");
  assert.ok(base, "fixture: a placeholder batch exists");
  const r = await updateBatch(base.id, { ...batchInput(base.courseSlug, { mode: base.mode, schedule: "Mon – Fri • 6:30 PM", startsOn: "2027-02-01", endsOn: "" }) });
  assert.equal(r.ok, true, JSON.stringify(r));
  const merged = await getBatch(base.id);
  assert.deepEqual([merged.datesTba, merged.startDate, merged.schedule], [false, "01 Feb 2027", "Mon – Fri • 6:30 PM"]);
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
    await (role ? await as(role, `auth-${role.toLowerCase()}`) : await signOut());
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
  assert.equal(await getCourse(slug), undefined, "nothing was created");
  assert.equal((await getCourse("full-stack-development")).status, "PUBLISHED");
  assert.equal((await tdb.prepare("SELECT COUNT(*) c FROM audit_log WHERE entity_id = ?").get(slug)).c, 0);
});

test("create course: success, audit row, status default, duplicates, validation and forged fields", async () => {
  await as("ADMIN", "course-admin");
  const input = courseInput();
  const r = await createCourse(input);
  assert.deepEqual({ ok: r.ok, slug: r.slug, status: r.status }, { ok: true, slug: input.slug, status: "UNPUBLISHED" });
  const course = await getCourse(input.slug);
  assert.equal(course.title, input.title);
  assert.deepEqual(course.technologies, ["Rust", "Cargo"]);
  assert.deepEqual(course.outcomes, ["Build a CLI tool", "Write tests"]);
  assert.equal(course.isCustom, true);
  assert.equal(course.initials.length > 0, true);
  assert.deepEqual([course.modules, course.projects, course.faqs], [[], [], []], "syllabus content defaults to empty, not undefined");
  assert.equal((await audit("course", input.slug))[0].action, "course.created");

  // duplicate slug (custom + code-defined) and duplicate title (case-insensitive)
  assert.equal((await createCourse(courseInput({ slug: input.slug }))).errors.slug.includes("already exists"), true);
  assert.ok((await createCourse(courseInput({ slug: "full-stack-development" }))).errors.slug);
  assert.ok((await createCourse(courseInput({ title: input.title.toUpperCase() }))).errors.title);
  // invalid slug / unknown category / status falls back to the safe default
  assert.ok((await createCourse(courseInput({ slug: "Not A Slug" }))).errors.slug);
  assert.ok((await createCourse(courseInput({ categorySlug: "hacking" }))).errors.categorySlug);
  const forged = courseInput({ status: "SUPER_PUBLISHED" });
  await createCourse(forged);
  assert.equal((await getCourse(forged.slug)).status, "UNPUBLISHED");
  const rows = (await tdb.prepare("SELECT COUNT(*) c FROM catalog_courses WHERE slug IN (?, ?)").get("Not A Slug", "x")).c;
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
  const base = await getCourse("react-development");
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
  const merged = await getCourse("react-development");
  assert.equal(merged.title, "React.js Development (Updated)");
  assert.equal(merged.levelLabel, base.levelLabel, "an untouched field keeps its original presentation");
  assert.deepEqual(merged.modules, base.modules, "syllabus content is untouched");
  assert.equal(merged.status, "PUBLISHED");
  assert.equal(JSON.parse((await audit("course", "react-development")).at(-1).detail).changed[0], "title");
  assert.equal((await updateCourse("react-development", edit)).unchanged, true);
  // restore for other tests in this file
  await updateCourse("react-development", { ...edit, title: base.title });

  // custom course: edit, then try to smuggle a different slug through the form
  const created = courseInput();
  await createCourse(created);
  const r2 = await updateCourse(created.slug, { ...created, slug: "full-stack-development", title: "Renamed Custom", level: "Advanced" });
  assert.equal(r2.ok, true);
  assert.equal((await getCourse(created.slug)).title, "Renamed Custom");
  assert.equal((await getCourse(created.slug)).level, "Advanced");
  assert.equal((await getCourse("full-stack-development")).title, "Full Stack Development", "the forged slug changed nothing else");
  assert.deepEqual(await updateCourse("missing-course", created), { ...(await updateCourse("missing-course", created)) });
  assert.equal((await updateCourse("missing-course", created)).reason, "not_found");
  assert.ok((await updateCourse(created.slug, { ...created, title: "Full Stack Development" })).errors.title, "title can't collide with another course");
});

test("publication: unpublished courses leave every public surface but stay resolvable for existing records", async () => {
  await as("ADMIN", "course-vis");
  const input = await newPublishedCourse();
  const slug = input.slug;
  assert.ok((await listCourses({ publishedOnly: true })).some((c) => c.slug === slug));
  assert.ok((await sitemap()).some((e) => e.url.endsWith(`/courses/${slug}`)), "published => in sitemap");
  assert.ok((await catalogRecommendations({ interests: "Rust Cargo" })).scored.some((x) => x.course.slug === slug), "recommendable");

  const batch = await createBatch(batchInput(slug, { status: "Open" }));
  assert.ok((await listBatches({ publicOnly: true })).some((b) => b.id === batch.batchId));
  const student = await makeUser("STUDENT", "vis-student");
  const enrol = await createEnrollment({ studentUserId: student.id, courseSlug: slug, batchId: batch.batchId });
  assert.equal(enrol.ok, true);

  const off = await setCourseStatus(slug, "UNPUBLISHED");
  assert.deepEqual([off.ok, off.activeEnrollments], [true, 1]);
  assert.equal(await getCourse(slug, { publishedOnly: true }), undefined, "hidden from public lookups");
  assert.ok(!(await listCourses({ publishedOnly: true })).some((c) => c.slug === slug));
  assert.ok((await listCourses()).some((c) => c.slug === slug), "still listed for admins");
  assert.ok(!(await sitemap()).some((e) => e.url.endsWith(`/courses/${slug}`)), "not in the sitemap");
  assert.ok(!(await listBatches({ publicOnly: true })).some((b) => b.id === batch.batchId), "its batches leave the public list");
  assert.ok(!(await catalogRecommendations({ interests: "Rust Cargo" })).scored.some((x) => x.course.slug === slug), "not recommended");
  assert.ok(!(await getRelatedCourses(await getCourse("full-stack-development"), 50)).some((c) => c.slug === slug));
  assert.equal((await submitLead({ name: "Visitor", phone: "9876543210", email: `v-${uid()}@example.test`, consent: true, interestedCourse: slug }, "enquiry")).ok, false, "enquiries about an unpublished course are refused");

  // existing history still resolves
  assert.equal((await getEnrollmentDetail(enrol.enrollmentId)).courseTitle, input.title);
  assert.equal((await getCourse(slug)).title, input.title);
  // ...but new enrollments are refused, and the form no longer offers it
  const other = await makeUser("STUDENT", "vis-student2");
  assert.equal((await createEnrollment({ studentUserId: other.id, courseSlug: slug, batchId: batch.batchId })).reason, "course_unpublished");
  const formData = await getEnrollmentFormData({});
  assert.ok(!formData.courses.some((c) => c.value === slug));

  assert.equal((await setCourseStatus(slug, "UNPUBLISHED")).unchanged, true);
  assert.equal((await setCourseStatus(slug, "BOGUS")).reason, "status_invalid");
  assert.equal((await setCourseStatus("nope", "PUBLISHED")).reason, "not_found");
  assert.equal((await setCourseStatus(slug, "PUBLISHED")).ok, true);
  assert.ok((await listCourses({ publishedOnly: true })).some((c) => c.slug === slug), "republished");
  assert.deepEqual((await audit("course", slug)).map((a) => a.action), ["course.created", "course.unpublished", "course.published"]);
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
    assert.equal((await getCourse(slug)).title, "Python Development");
    const enrollment = await tdb.prepare("SELECT status FROM batch_enrollments WHERE batch_id = ?").get(batch.id);
    assert.equal(enrollment.status, "ACTIVE");
    assert.equal((await tdb.prepare("SELECT COUNT(*) c FROM fee_plans WHERE course_slug = ?").get(slug)).c, 1);
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
  const b = await getBatch(first.batchId);
  assert.deepEqual([b.courseSlug, b.mode, b.startDate, b.endDate, b.status, b.location], [slug, "Live Online", "11 Jan 2027", "30 Mar 2027", "Upcoming", "Online"]);
  assert.equal((await audit("batch", first.batchId))[0].action, "batch.created");

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
  assert.equal((await listBatches({ courseSlug: slug })).length, 3, "invalid submissions created nothing");
});

test("edit batch: course is immutable, edits are audited, code-defined batches can be edited, no-ops are reported", async () => {
  await as("ADMIN", "batch-edit");
  const { slug } = await newPublishedCourse();
  const made = await createBatch(batchInput(slug));
  const id = made.batchId;
  const current = await getBatch(id);

  const r = await updateBatch(id, { ...batchInput(slug), courseSlug: "full-stack-development", schedule: "Tue – Thu • 9:00 PM", status: "Open", mode: current.mode });
  assert.deepEqual([r.ok, r.changed.sort()], [true, ["schedule", "status"]]);
  assert.equal((await getBatch(id)).courseSlug, slug, "a forged courseSlug is ignored");
  assert.equal((await getBatch(id)).schedule, "Tue – Thu • 9:00 PM");
  assert.equal(JSON.parse((await audit("batch", id)).at(-1).detail).changed.length, 2);
  assert.equal((await updateBatch(id, { ...batchInput(slug), schedule: "Tue – Thu • 9:00 PM", status: "Open" })).unchanged, true);
  assert.equal((await updateBatch("missing-batch", batchInput(slug))).reason, "not_found");
  assert.ok((await updateBatch(id, { ...batchInput(slug), schedule: "Tue – Thu • 9:00 PM", status: "Open", endsOn: "2026-01-01" })).errors.endsOn);

  // code-defined batch
  const base = staticBatches.find((b) => b.courseSlug === "cloud-devops");
  const baseEdit = { mode: base.mode, schedule: base.schedule, startsOn: base.startsOn, endsOn: "2027-02-28", status: base.status, location: base.location };
  assert.equal((await updateBatch(base.id, baseEdit)).ok, true);
  assert.equal((await getBatch(base.id)).endDate, "28 Feb 2027");
  assert.equal((await getBatch(base.id)).startDate, base.startDate);
  assert.equal((await getBatch(base.id)).origin, "BASE");
});

test("batch lifecycle: closed/completed batches stop taking enrollments and leave the public list; enrollment history is preserved", async () => {
  await as("ADMIN", "batch-life");
  const { slug } = await newPublishedCourse();
  const { batchId } = await createBatch(batchInput(slug, { status: "Open" }));
  const student = await makeUser("STUDENT", "life-student");
  const enrol = await createEnrollment({ studentUserId: student.id, courseSlug: slug, batchId });
  assert.equal(enrol.ok, true);
  const rowBefore = await tdb.prepare("SELECT * FROM batch_enrollments WHERE id = ?").get(enrol.enrollmentId);

  assert.equal((await setBatchStatus(batchId, "Closed")).ok, true);
  assert.ok(!(await listBatches({ publicOnly: true })).some((b) => b.id === batchId));
  const other = await makeUser("STUDENT", "life-student2");
  assert.equal((await createEnrollment({ studentUserId: other.id, courseSlug: slug, batchId })).reason, "batch_closed");
  const form = await getEnrollmentFormData({});
  assert.ok(!form.batches.some((b) => b.value === batchId));
  assert.deepEqual(await tdb.prepare("SELECT * FROM batch_enrollments WHERE id = ?").get(enrol.enrollmentId), rowBefore, "the enrollment row is untouched");

  // archiving is blocked while an enrollment is ACTIVE, allowed once it isn't
  assert.equal((await setBatchStatus(batchId, "Archived")).reason, "archive_blocked");
  assert.equal((await getBatch(batchId)).status, "Closed");
  assert.equal((await updateBatch(batchId, { ...batchInput(slug), mode: "Live Online", schedule: (await getBatch(batchId)).schedule, startsOn: (await getBatch(batchId)).startsOn, endsOn: (await getBatch(batchId)).endsOn, status: "Archived" })).reason, "archive_blocked");
  assert.equal((await setEnrollmentStatus(enrol.enrollmentId, "COMPLETED")).ok, true);
  assert.equal((await setBatchStatus(batchId, "Archived")).ok, true);
  assert.equal((await tdb.prepare("SELECT status FROM batch_enrollments WHERE id = ?").get(enrol.enrollmentId)).status, "COMPLETED", "history kept");
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
  assert.equal((await tdb.prepare("SELECT course_slug, batch_id FROM fee_plans WHERE enrollment_id = ?").get(enrol.enrollmentId)).batch_id, batchId);
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
  await tdb.prepare("UPDATE users SET status = 'INACTIVE' WHERE id = ?").run(inactive.id);

  assert.equal((await assignTrainerToBatchAdmin(batchId, student.id)).reason, "trainer_invalid", "not a trainer");
  assert.equal((await assignTrainerToBatchAdmin(batchId, inactive.id)).reason, "trainer_invalid", "inactive trainer");
  assert.equal((await assignTrainerToBatchAdmin(batchId, "no-such-user")).reason, "trainer_invalid");
  assert.equal((await assignTrainerToBatchAdmin("no-such-batch", trainer.id)).reason, "not_found");
  assert.equal((await listBatchIdsForTrainer(student.id)).length, 0);

  assert.equal((await assignTrainerToBatchAdmin(batchId, trainer.id)).ok, true);
  assert.equal((await assignTrainerToBatchAdmin(batchId, trainer.id)).reason, "already_assigned");
  assert.deepEqual(await listBatchIdsForTrainer(trainer.id), [batchId]);
  assert.deepEqual(await listBatchIdsForTrainer(other.id), [], "another trainer gains nothing");
  const detail = await getBatchDetailForAdmin(batchId);
  assert.deepEqual(detail.trainers.map((t) => t.id), [trainer.id]);
  assert.ok(!detail.assignableTrainers.some((t) => t.id === trainer.id));
  assert.ok(detail.assignableTrainers.some((t) => t.id === other.id));
  assert.ok(!detail.assignableTrainers.some((t) => t.id === inactive.id));

  assert.equal((await removeTrainerFromBatch(batchId, other.id)).reason, "not_assigned");
  assert.equal((await removeTrainerFromBatch(batchId, trainer.id)).ok, true);
  assert.deepEqual(await listBatchIdsForTrainer(trainer.id), []);
  assert.deepEqual((await audit("batch", batchId)).map((a) => a.action), ["batch.created", "batch.trainer_assigned", "batch.trainer_removed"]);

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

test("opening a database created before the catalog tables existed adds them in place and keeps all data", async () => {
  const adminUrl = process.env.TEST_PG_ADMIN_URL;
  const name = `techotd_t_${crypto.randomBytes(6).toString("hex")}`;
  const admin = new pg.Client({ connectionString: adminUrl });
  await admin.connect();
  await admin.query(`CREATE DATABASE "${name}"`);
  await admin.end();
  const url = new URL(adminUrl);
  url.pathname = `/${name}`;
  const databaseUrl = url.toString();
  const root = path.resolve(import.meta.dirname, "..");
  const script = path.join(os.tmpdir(), `techotd-cat-${name}.mjs`);
  fs.writeFileSync(
    script,
    `import { register } from "node:module";
register(new URL(${JSON.stringify(pathToFileURL(path.join(root, "tests", "loader.mjs")).href)}));
const { db, closeDb } = await import("@/lib/db/client");
await db.get("SELECT 1 AS ok");
await closeDb();
`
  );
  const open = () => spawnSync(process.execPath, [script], { cwd: root, env: { ...process.env, DATABASE_URL: databaseUrl, NODE_ENV: "test" }, encoding: "utf8" });
  try {
    assert.equal(open().status, 0, "first open creates the schema");
    // Make it look like a database from before this phase: no catalog tables, but real data.
    const legacy = new pg.Client({ connectionString: databaseUrl });
    await legacy.connect();
    await legacy.query("DROP TABLE catalog_courses, catalog_batches");
    await legacy.query("UPDATE schema_meta SET value = 'before-catalog' WHERE key = 'schema_hash'");
    await legacy.query(`INSERT INTO users (id, name, email, password_hash) VALUES ('u1', 'Legacy', 'legacy@example.test', 'x');
      INSERT INTO student_profiles (id, user_id) VALUES ('p1', 'u1');
      INSERT INTO batch_enrollments (id, student_id, batch_id) VALUES ('e1', 'p1', 'full-stack-development-01');`);
    assert.equal((await legacy.query("SELECT to_regclass('public.catalog_courses') AS t")).rows[0].t, null, "fixture really predates the tables");
    await legacy.end();
    for (const attempt of [1, 2]) {
      const r = open();
      assert.equal(r.status, 0, `open #${attempt}: ${r.stderr}`);
    }
    const check = new pg.Client({ connectionString: databaseUrl });
    await check.connect();
    const tables = (await check.query("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'")).rows.map((t) => t.table_name);
    assert.ok(tables.includes("catalog_courses") && tables.includes("catalog_batches"));
    assert.equal((await check.query("SELECT COUNT(*)::int c FROM catalog_courses")).rows[0].c, 0, "no catalog rows are invented");
    assert.equal((await check.query("SELECT name FROM users WHERE id = 'u1'")).rows[0].name, "Legacy");
    assert.equal((await check.query("SELECT batch_id FROM batch_enrollments WHERE id = 'e1'")).rows[0].batch_id, "full-stack-development-01");
    await check.end();
  } finally {
    fs.rmSync(script, { force: true });
  }
});

// ------------------------------------------- final-regression additions

test("certificates survive unpublishing: the public verification page and the student's list keep naming the course", async () => {
  const { issueCertificate } = await import("@/lib/certificates/service");
  const { getPublicVerification } = await import("@/lib/certificates/verify");
  const { getMyCertificates } = await import("@/lib/student/certificates");
  await as("ADMIN", "cert-admin");
  const { slug, title } = await newPublishedCourse();
  const { batchId } = await createBatch(batchInput(slug, { status: "Open" }));
  const student = await makeUser("STUDENT", "cert-student");
  const enrol = await createEnrollment({ studentUserId: student.id, courseSlug: slug, batchId });
  assert.equal(enrol.ok, true);
  const issued = await issueCertificate({ enrollmentId: enrol.enrollmentId, mode: "MANUAL", approvalNote: "Regression: approved for the catalog test" });
  assert.equal(issued.ok, true, JSON.stringify(issued));
  const token = (await tdb.prepare("SELECT verification_token t FROM certificates WHERE id = ?").get(issued.certificateId)).t;
  assert.equal((await getPublicVerification(token)).courseTitle, title);

  assert.equal((await setCourseStatus(slug, "UNPUBLISHED")).ok, true);
  const afterVerify = await getPublicVerification(token);
  assert.deepEqual([afterVerify.valid, afterVerify.courseTitle], [true, title], "verification is unaffected by unpublishing");
  await signIn(student);
  const mine = await getMyCertificates();
  assert.equal(mine.length, 1);
  assert.equal(mine[0].course.title, title, "the student's certificate still resolves its course");
  assert.equal((await tdb.prepare("SELECT status FROM certificates WHERE id = ?").get(issued.certificateId)).status, "ACTIVE");
});

test("failed catalog writes are atomic: nothing partial is left behind (row, audit entry or status)", async () => {
  const { insertCustomCourse, insertCustomBatch, setCourseStatus: dbSetStatus } = await import("@/lib/db/catalog");
  const admin = await makeUser("ADMIN", "atomic-admin");
  const fields = { title: "Atomic Course", shortDescription: "x".repeat(12), description: "y".repeat(30), categorySlug: "programming", level: "Beginner", duration: "1 Month", durationBand: "Short (Up to 2 Months)", modes: ["Live Online"], technologies: [], prerequisites: [], outcomes: [] };
  const count = async (table, col, id) => (await tdb.prepare(`SELECT COUNT(*) c FROM ${table} WHERE ${col} = ?`).get(id)).c;
  const audits = async (id) => (await tdb.prepare("SELECT COUNT(*) c FROM audit_log WHERE entity_id = ?").get(id)).c;

  // 1. a duplicate key aborts the second insert entirely
  const slug = `atomic-${uid()}`;
  await insertCustomCourse(admin.id, slug, fields, "UNPUBLISHED");
  await assert.rejects(async () => await insertCustomCourse(admin.id, slug, { ...fields, title: "Second" }, "UNPUBLISHED"));
  assert.deepEqual([await count("catalog_courses", "slug", slug), await audits(slug)], [1, 1], "still exactly one row and one audit entry");
  assert.equal((await getCourse(slug)).title, "Atomic Course", "the first record is untouched");

  // 2. a foreign-key failure (unknown actor) rolls back the row AND its audit entry
  const orphan = `atomic-fk-${uid()}`;
  await assert.rejects(async () => await insertCustomCourse("no-such-user", orphan, fields, "UNPUBLISHED"));
  assert.deepEqual([await count("catalog_courses", "slug", orphan), await audits(orphan)], [0, 0]);

  // 3. a CHECK-constraint failure on status leaves the status and the audit trail alone
  await assert.rejects(async () => await dbSetStatus(admin.id, slug, "CUSTOM", "NOT_A_STATUS"));
  assert.equal((await getCourse(slug)).status, "UNPUBLISHED");
  assert.equal(await audits(slug), 1);

  // 4. same for batches
  const bid = `${slug}-01`;
  const bf = { courseSlug: slug, mode: "Live Online", schedule: "Mon 9", startsOn: "2027-05-03", endsOn: null, status: "Upcoming", location: "Online" };
  await insertCustomBatch(admin.id, bid, bf);
  await assert.rejects(async () => await insertCustomBatch(admin.id, bid, bf));
  await assert.rejects(async () => await insertCustomBatch("no-such-user", `${slug}-02`, bf));
  assert.deepEqual([await count("catalog_batches", "id", bid), await audits(bid), await count("catalog_batches", "id", `${slug}-02`), await audits(`${slug}-02`)], [1, 1, 0, 0]);
});

test("a Completed batch keeps its enrollments, leaves the public list and refuses new enrollments", async () => {
  await as("ADMIN", "batch-completed");
  const { slug } = await newPublishedCourse();
  const { batchId } = await createBatch(batchInput(slug, { status: "Open" }));
  const student = await makeUser("STUDENT", "completed-student");
  const enrol = await createEnrollment({ studentUserId: student.id, courseSlug: slug, batchId });
  const rowBefore = await tdb.prepare("SELECT * FROM batch_enrollments WHERE id = ?").get(enrol.enrollmentId);

  assert.equal((await setBatchStatus(batchId, "Completed")).ok, true);
  assert.ok(!(await listBatches({ publicOnly: true })).some((b) => b.id === batchId));
  assert.equal((await getBatch(batchId)).status, "Completed");
  const other = await makeUser("STUDENT", "completed-other");
  assert.equal((await createEnrollment({ studentUserId: other.id, courseSlug: slug, batchId })).reason, "batch_closed");
  assert.deepEqual(await tdb.prepare("SELECT * FROM batch_enrollments WHERE id = ?").get(enrol.enrollmentId), rowBefore, "history untouched");
  assert.equal((await setBatchStatus(batchId, "Archived")).reason, "archive_blocked", "an ACTIVE enrollment still prevents archiving");
  assert.equal((await getEnrollmentDetail(enrol.enrollmentId)).batchStatus, "Completed");
});
