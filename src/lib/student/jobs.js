// Student job board (Phase 10.6). Identity is the session user only — there is
// no student id parameter anywhere in this file. Students see only OPEN
// published jobs and their own applications; staff notes, other applicants
// and unpublished jobs are unreachable from here.

import { getCurrentUser } from "@/lib/auth/currentUser";
import {
  getJobById,
  isJobOpen,
  listOpenJobs,
  listAppliedJobIds,
  getStudentApplicationForJob,
  listStudentApplications,
  studentCanApply,
  applyTx,
  withdrawTx,
} from "@/lib/db/jobs";
import { STUDENT_WITHDRAWABLE, JOBS_PAGE_SIZE, MAX } from "@/constants/placement";

const MESSAGES = {
  forbidden: "You need to be signed in as a student to do that.",
  not_eligible: "Job applications are open to students with an active or completed enrollment.",
  job_not_found: "This job could not be found.",
  job_closed: "This job is no longer accepting applications.",
  deadline_passed: "The application deadline for this job has passed.",
  already_applied: "You have already applied to this job.",
  cover_long: `Your message can be at most ${MAX.cover} characters.`,
  not_found: "Application not found.",
  cannot_withdraw: "This application can no longer be withdrawn.",
};
export const jobMessage = (reason) => MESSAGES[reason] || "Something went wrong.";
const fail = (reason) => ({ ok: false, reason, message: jobMessage(reason) });

async function currentStudent() {
  const user = await getCurrentUser();
  return user && user.role === "STUDENT" ? user : null;
}

// Strip to the fields a student may see.
function publicJob(job) {
  return {
    id: job.id,
    title: job.title,
    companyName: job.companyName,
    description: job.description,
    location: job.location,
    employmentType: job.employmentType,
    workMode: job.workMode,
    experience: job.experience,
    skills: job.skills,
    applyDeadline: job.applyDeadline,
    publishedAt: job.publishedAt,
  };
}

export async function getOpenJobsPage({ q, employmentType, workMode, page }) {
  const user = await currentStudent();
  const empty = { rows: [], page: 1, totalPages: 1, pageSize: JOBS_PAGE_SIZE, total: 0, appliedJobIds: [] };
  if (!user) return empty;
  const probe = await listOpenJobs({ q, employmentType, workMode, limit: 1, offset: 0 });
  const totalPages = Math.max(1, Math.ceil(probe.total / JOBS_PAGE_SIZE));
  const current = Math.min(Math.max(1, page || 1), totalPages);
  const { rows, total } = await listOpenJobs({ q, employmentType, workMode, limit: JOBS_PAGE_SIZE, offset: (current - 1) * JOBS_PAGE_SIZE });
  return { rows: rows.map(publicJob), page: current, totalPages, pageSize: JOBS_PAGE_SIZE, total, appliedJobIds: await listAppliedJobIds(user.id) };
}

// A job is viewable when it is open — or when this student already applied
// (so they can still see its status after it closes). Never for drafts of
// others: a DRAFT is not "open" and an application to a job that was later
// unpublished is the only other way in.
export async function getJobForStudent(jobId) {
  const user = await currentStudent();
  if (!user) return null;
  const job = await getJobById(jobId);
  if (!job) return null;
  const application = await getStudentApplicationForJob(user.id, job.id);
  const open = isJobOpen(job);
  if (!open && !application) return null;
  return {
    job: publicJob(job),
    open,
    application,
    canApply: open && !application && await studentCanApply(user.id),
    canWithdraw: Boolean(application && STUDENT_WITHDRAWABLE.includes(application.status)),
    eligible: await studentCanApply(user.id),
  };
}

export async function getMyApplications() {
  const user = await currentStudent();
  if (!user) return [];
  return await listStudentApplications(user.id);
}

// Applicant = the session student; the browser supplies only the job id and
// an optional message.
export async function applyToJob({ jobId, coverMessage }) {
  const user = await currentStudent();
  if (!user) return fail("forbidden");
  const message = typeof coverMessage === "string" ? coverMessage.trim() : "";
  if (message.length > MAX.cover) return fail("cover_long");
  if (!await studentCanApply(user.id)) return fail("not_eligible");
  const result = await applyTx({ jobId: typeof jobId === "string" ? jobId : "", userId: user.id, coverMessage: message });
  return result.ok ? { ok: true, jobId } : fail(result.reason);
}

export async function withdrawApplication({ applicationId }) {
  const user = await currentStudent();
  if (!user) return fail("forbidden");
  const result = await withdrawTx({ applicationId: typeof applicationId === "string" ? applicationId : "", userId: user.id, allowed: STUDENT_WITHDRAWABLE });
  return result.ok ? { ok: true } : fail(result.reason);
}
