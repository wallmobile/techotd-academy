// Placement staff domain layer (Phase 10.6). Every function re-derives the
// caller via getPlacementContext() and validates input server-side. Returns
// { ok, ... } / { ok: false, reason, message } — never throws for expected
// business failures.

import { getPlacementContext } from "@/lib/placement/context";
import { notifyApplicationStatus, notifyPlacementConfirmed } from "@/lib/notifications/events";
import {
  getJobById,
  createJobRow,
  updateJobRow,
  setJobStatusRow,
  listJobsForStaff,
  listApplicationsForJob,
  setApplicationStatusTx,
  confirmPlacementTx,
  placementSummary,
  getApplicationRow,
  listAuditForEntity,
} from "@/lib/db/jobs";
import {
  JOB_STATUSES,
  EMPLOYMENT_TYPES,
  WORK_MODES,
  APPLICATION_STATUSES,
  STAFF_TRANSITIONS,
  ADMIN_JOBS_PAGE_SIZE,
  APPLICATION_STATUS_LABELS,
  MAX,
} from "@/constants/placement";

const MESSAGES = {
  forbidden: "You don't have permission to do that.",
  title_invalid: `Enter a job title (up to ${MAX.title} characters).`,
  company_invalid: `Enter the company name (up to ${MAX.company} characters).`,
  description_invalid: `Enter a description (up to ${MAX.description} characters).`,
  location_long: `Location can be at most ${MAX.location} characters.`,
  experience_long: `Experience can be at most ${MAX.experience} characters.`,
  skills_long: `Skills can be at most ${MAX.skills} characters.`,
  type_invalid: "Please choose an employment type.",
  mode_invalid: "Please choose a work mode.",
  deadline_invalid: "Enter a valid application deadline.",
  status_invalid: "Please choose a valid status.",
  not_found: "Not found.",
  transition_invalid: "That status change isn't allowed from the current status.",
  notes_long: `Notes can be at most ${MAX.notes} characters.`,
  not_selected: "A placement can only be confirmed for a selected candidate.",
  already_confirmed: "This placement has already been confirmed.",
};
export const placementMessage = (reason) => MESSAGES[reason] || "Something went wrong.";
const fail = (reason, extra = {}) => ({ ok: false, reason, message: placementMessage(reason), ...extra });

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
function validDate(value) {
  if (!DATE_RE.test(value)) return false;
  const d = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === value;
}

function clean(value, max) {
  const text = typeof value === "string" ? value.trim() : "";
  return text.length > max ? null : text;
}

// Shared validation for create / update.
export function validateJobInput(input) {
  const title = clean(input.title, MAX.title);
  if (!title) return { error: "title_invalid" };
  const companyName = clean(input.companyName, MAX.company);
  if (!companyName) return { error: "company_invalid" };
  const description = clean(input.description, MAX.description);
  if (!description) return { error: "description_invalid" };
  const location = clean(input.location, MAX.location);
  if (location === null) return { error: "location_long" };
  const experience = clean(input.experience, MAX.experience);
  if (experience === null) return { error: "experience_long" };
  const skills = clean(input.skills, MAX.skills);
  if (skills === null) return { error: "skills_long" };
  if (!EMPLOYMENT_TYPES.includes(input.employmentType)) return { error: "type_invalid" };
  if (!WORK_MODES.includes(input.workMode)) return { error: "mode_invalid" };
  const deadline = typeof input.applyDeadline === "string" ? input.applyDeadline.trim() : "";
  if (deadline && !validDate(deadline)) return { error: "deadline_invalid" };
  return {
    value: {
      title, companyName, description, location, experience, skills,
      employmentType: input.employmentType, workMode: input.workMode, applyDeadline: deadline,
    },
  };
}

export async function createJob(input) {
  const ctx = await getPlacementContext();
  if (!ctx) return fail("forbidden");
  const parsed = validateJobInput(input);
  if (parsed.error) return fail(parsed.error);
  return { ok: true, jobId: await createJobRow(parsed.value, ctx.user.id) };
}

export async function updateJob(jobId, input) {
  const ctx = await getPlacementContext();
  if (!ctx) return fail("forbidden");
  if (!await getJobById(jobId)) return fail("not_found");
  const parsed = validateJobInput(input);
  if (parsed.error) return fail(parsed.error);
  return await updateJobRow(jobId, parsed.value, ctx.user.id) ? { ok: true, jobId } : fail("not_found");
}

export async function setJobStatus(jobId, status) {
  const ctx = await getPlacementContext();
  if (!ctx) return fail("forbidden");
  if (!JOB_STATUSES.includes(status)) return fail("status_invalid");
  if (!await getJobById(jobId)) return fail("not_found");
  return await setJobStatusRow(jobId, status, ctx.user.id) ? { ok: true, jobId } : fail("not_found");
}

export async function getJobsPage({ q, status, sort, page }) {
  if (!(await getPlacementContext())) return { rows: [], page: 1, totalPages: 1, pageSize: ADMIN_JOBS_PAGE_SIZE, total: 0 };
  const probe = await listJobsForStaff({ q, status, sort, limit: 1, offset: 0 });
  const totalPages = Math.max(1, Math.ceil(probe.total / ADMIN_JOBS_PAGE_SIZE));
  const current = Math.min(Math.max(1, page || 1), totalPages);
  const { rows, total } = await listJobsForStaff({ q, status, sort, limit: ADMIN_JOBS_PAGE_SIZE, offset: (current - 1) * ADMIN_JOBS_PAGE_SIZE });
  return { rows, page: current, totalPages, pageSize: ADMIN_JOBS_PAGE_SIZE, total };
}

export async function getJobDetail(jobId) {
  if (!(await getPlacementContext())) return null;
  const job = await getJobById(jobId);
  if (!job) return null;
  return { job, applications: await listApplicationsForJob(job.id), history: await listAuditForEntity("job", job.id) };
}

export async function getPlacementSummary() {
  if (!(await getPlacementContext())) return null;
  return await placementSummary();
}

export async function updateApplicationStatus({ applicationId, status, notes }) {
  const ctx = await getPlacementContext();
  if (!ctx) return fail("forbidden");
  if (!APPLICATION_STATUSES.includes(status) || status === "WITHDRAWN") return fail("status_invalid");
  const note = notes === undefined || notes === null ? null : clean(notes, MAX.notes);
  if (note === null && typeof notes === "string" && notes.trim().length > MAX.notes) return fail("notes_long");
  const before = await getApplicationRow(applicationId);
  if (!before) return fail("not_found");

  const result = await setApplicationStatusTx({
    applicationId,
    status,
    notes: typeof notes === "string" ? note : null,
    actorUserId: ctx.user.id,
    transitions: STAFF_TRANSITIONS,
  });
  if (!result.ok) return fail(result.reason);
  if (before.status !== status) {
    await notifyApplicationStatus({
      userId: before.student_user_id,
      applicationId,
      jobTitle: (await getJobById(result.jobId))?.title ?? "the job",
      status,
      statusLabel: APPLICATION_STATUS_LABELS[status] || status,
    });
  }
  return { ok: true, jobId: result.jobId };
}

// Explicit confirmation that a SELECTED candidate actually took the job.
// SELECTED on its own is never counted as a placement.
export async function confirmPlacement({ applicationId, note }) {
  const ctx = await getPlacementContext();
  if (!ctx) return fail("forbidden");
  const text = typeof note === "string" ? note.trim() : "";
  if (text.length > MAX.notes) return fail("notes_long");
  const app = await getApplicationRow(applicationId);
  const result = await confirmPlacementTx({ applicationId, note: text, actorUserId: ctx.user.id });
  if (!result.ok) return fail(result.reason);
  if (app) {
    await notifyPlacementConfirmed({
      userId: app.student_user_id,
      applicationId,
      jobTitle: (await getJobById(result.jobId))?.title ?? "the job",
    });
  }
  return { ok: true, jobId: result.jobId };
}
