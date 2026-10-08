// CRM domain layer (Phase 10.2). Every function re-derives the caller via
// getCrmContext() and enforces the visibility/modify policy documented in
// src/lib/crm/context.js, so a direct Server Action call from an
// unauthorized role gets { ok: false } / null / an empty page and writes
// nothing. Pages never touch SQL.

import { getCrmContext, canViewLead, canModifyLead } from "@/lib/crm/context";
import {
  listLeads,
  getLeadById,
  countLeadsByStatus,
  updateLeadStatusRow,
  markLeadContactedRow,
  assignLeadRow,
  addLeadNoteRow,
  listLeadNotes,
  listActiveUsersWithRoles,
  getUserNameRole,
  listDistinctLeadValues,
} from "@/lib/db/leads";
import { LEAD_STATUSES, LEAD_ASSIGNABLE_ROLES, NOTE_MAX_LENGTH, LEADS_PAGE_SIZE } from "@/constants/crm";
import { getCourseBySlug } from "@/data/courses";
import { getBatchById } from "@/data/batches";
import { getTrainingModeBySlug } from "@/data/trainingModes";

const DENIED = { ok: false, reason: "You don't have permission to do that." };
const EMPTY_PAGE = { rows: [], page: 1, totalPages: 1, pageSize: LEADS_PAGE_SIZE, total: 0 };

function totalPagesFor(total) {
  return Math.max(1, Math.ceil(total / LEADS_PAGE_SIZE));
}

function decorate(lead) {
  return {
    ...lead,
    courseTitle: lead.courseSlug ? getCourseBySlug(lead.courseSlug)?.title ?? lead.courseSlug : null,
    modeLabel: lead.mode ? getTrainingModeBySlug(lead.mode)?.title ?? lead.mode : null,
  };
}

export async function getLeadSummary() {
  const ctx = await getCrmContext();
  if (!ctx) return null;
  const byStatus = countLeadsByStatus(ctx.scopeUserId);
  return { byStatus, total: Object.values(byStatus).reduce((a, b) => a + b, 0) };
}

// Filter dropdown data: only values that exist on leads, and (managers)
// the people leads can be assigned to.
export async function getLeadFilterOptions() {
  const ctx = await getCrmContext();
  if (!ctx) return null;
  return {
    courses: listDistinctLeadValues("course_slug", ctx.scopeUserId).map((slug) => ({
      value: slug,
      label: getCourseBySlug(slug)?.title ?? slug,
    })),
    modes: listDistinctLeadValues("mode", ctx.scopeUserId).map((slug) => ({
      value: slug,
      label: getTrainingModeBySlug(slug)?.title ?? slug,
    })),
    assignees: ctx.isManager ? listActiveUsersWithRoles(LEAD_ASSIGNABLE_ROLES) : [],
    isManager: ctx.isManager,
  };
}

// `filters.assigned`: "", "unassigned", "me", or (managers only) a user id.
export async function getLeadsPage({ q, status, source, course, mode, assigned, sort, page }) {
  const ctx = await getCrmContext();
  if (!ctx) return EMPTY_PAGE;

  let assignedFilter = assigned;
  if (assigned === "me") assignedFilter = ctx.user.id;
  else if (!ctx.isManager && assigned && assigned !== "unassigned") assignedFilter = ctx.user.id; // counsellors can't filter by other people

  const filters = { q, status, source, course, mode, assigned: assignedFilter, sort, scopeUserId: ctx.scopeUserId };
  const probe = listLeads({ ...filters, limit: 1, offset: 0 });
  const pages = totalPagesFor(probe.total);
  const current = Math.min(Math.max(1, page || 1), pages);
  const { rows, total } = listLeads({ ...filters, limit: LEADS_PAGE_SIZE, offset: (current - 1) * LEADS_PAGE_SIZE });
  return { rows: rows.map(decorate), page: current, totalPages: pages, pageSize: LEADS_PAGE_SIZE, total };
}

// Lead + notes + what this actor may do. Null for "doesn't exist" and
// "not yours to see" identically.
export async function getLeadDetail(leadId) {
  const ctx = await getCrmContext();
  if (!ctx) return null;
  const lead = getLeadById(leadId);
  if (!lead || !canViewLead(ctx, lead)) return null;

  const batch = lead.batchId ? getBatchById(lead.batchId) : null;
  const canModify = canModifyLead(ctx, lead);
  return {
    lead: decorate(lead),
    batchLabel: batch ? `${getCourseBySlug(batch.courseSlug)?.title ?? batch.courseSlug} — ${batch.mode} (${batch.startDate})` : null,
    notes: listLeadNotes(lead.id),
    permissions: {
      canModify,
      canAssign: ctx.isManager,
      canClaim: !ctx.isManager && lead.assignedTo === null,
    },
    assignees: ctx.isManager ? listActiveUsersWithRoles(LEAD_ASSIGNABLE_ROLES) : [],
  };
}

function loadModifiable(ctx, leadId) {
  const lead = getLeadById(leadId);
  if (!lead || !canViewLead(ctx, lead)) return { error: { ok: false, reason: "Lead not found." } };
  if (!canModifyLead(ctx, lead)) return { error: DENIED };
  return { lead };
}

export async function updateLeadStatus(leadId, status) {
  const ctx = await getCrmContext();
  if (!ctx) return DENIED;
  if (!LEAD_STATUSES.includes(status)) return { ok: false, reason: "Invalid status." };
  const { lead, error } = loadModifiable(ctx, leadId);
  if (error) return error;
  updateLeadStatusRow(lead.id, status);
  return { ok: true, leadId: lead.id };
}

// Explicit "I contacted this lead" event — the only path that sets
// last_contacted_at. A plain status change never does.
export async function markLeadContacted(leadId) {
  const ctx = await getCrmContext();
  if (!ctx) return DENIED;
  const { lead, error } = loadModifiable(ctx, leadId);
  if (error) return error;
  markLeadContactedRow(lead.id);
  return { ok: true, leadId: lead.id };
}

// Managers: assign to any ACTIVE user with an assignable role, or "" to
// unassign. Counsellors: may only claim an UNASSIGNED lead for themselves.
export async function assignLead(leadId, targetUserId) {
  const ctx = await getCrmContext();
  if (!ctx) return DENIED;

  const lead = getLeadById(leadId);
  if (!lead || !canViewLead(ctx, lead)) return { ok: false, reason: "Lead not found." };

  if (!ctx.isManager) {
    if (lead.assignedTo !== null || targetUserId !== ctx.user.id) return DENIED;
    assignLeadRow(lead.id, ctx.user.id);
    return { ok: true, leadId: lead.id };
  }

  if (!targetUserId) {
    assignLeadRow(lead.id, null);
    return { ok: true, leadId: lead.id };
  }
  const target = getUserNameRole(targetUserId);
  if (!target || target.status !== "ACTIVE" || !LEAD_ASSIGNABLE_ROLES.includes(target.role)) {
    return { ok: false, reason: "Please choose a valid person to assign this lead to." };
  }
  assignLeadRow(lead.id, target.id);
  return { ok: true, leadId: lead.id };
}

export async function addNote(leadId, rawNote) {
  const ctx = await getCrmContext();
  if (!ctx) return DENIED;
  const note = typeof rawNote === "string" ? rawNote.trim() : "";
  if (!note) return { ok: false, reason: "Please enter a note." };
  if (note.length > NOTE_MAX_LENGTH) return { ok: false, reason: `Notes can be at most ${NOTE_MAX_LENGTH} characters.` };
  const { lead, error } = loadModifiable(ctx, leadId);
  if (error) return error;
  addLeadNoteRow({ leadId: lead.id, authorUserId: ctx.user.id, note });
  return { ok: true, leadId: lead.id };
}
