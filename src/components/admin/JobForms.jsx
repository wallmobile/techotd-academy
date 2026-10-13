"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import { Button } from "@/components/ui/Button";
import {
  EMPLOYMENT_TYPES,
  EMPLOYMENT_TYPE_LABELS,
  WORK_MODES,
  WORK_MODE_LABELS,
  JOB_STATUSES,
  JOB_STATUS_LABELS,
  APPLICATION_STATUS_LABELS,
  STAFF_TRANSITIONS,
  MAX,
} from "@/constants/placement";
import {
  createJobAction,
  updateJobAction,
  setJobStatusAction,
  updateApplicationStatusAction,
  confirmPlacementAction,
} from "@/lib/placement/actions";

const idle = { status: "idle" };

function Submit({ children, variant = "primary", size = "md" }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" variant={variant} size={size} loading={pending} disabled={pending}>
      {children}
    </Button>
  );
}

function Feedback({ state }) {
  if (state.status === "error") {
    return (
      <p role="alert" className="rounded-sm border border-danger/30 bg-danger/5 px-3 py-2 text-sm text-danger">
        {state.formError}
      </p>
    );
  }
  if (state.status === "success") {
    return (
      <p role="status" className="text-sm font-medium text-success">
        {state.message}
      </p>
    );
  }
  return null;
}

/** Create / edit a job. New jobs always start as DRAFT; publishing is a separate, explicit action. */
export function JobForm({ job }) {
  const editing = Boolean(job);
  const [state, action] = useActionState(editing ? updateJobAction : createJobAction, idle);
  const v = state.values || {};
  const val = (name, fallback = "") => v[name] ?? job?.[name] ?? fallback;

  return (
    <form action={action} className="flex flex-col gap-4">
      {editing && <input type="hidden" name="jobId" value={job.id} />}
      <Feedback state={state} />
      <Input label="Job title" id="title" name="title" defaultValue={val("title")} maxLength={MAX.title} required />
      <Input label="Company" id="companyName" name="companyName" defaultValue={val("companyName")} maxLength={MAX.company} required />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Select label="Employment type" id="employmentType" name="employmentType" defaultValue={val("employmentType", "FULL_TIME")}>
          {EMPLOYMENT_TYPES.map((t) => (
            <option key={t} value={t}>
              {EMPLOYMENT_TYPE_LABELS[t]}
            </option>
          ))}
        </Select>
        <Select label="Work mode" id="workMode" name="workMode" defaultValue={val("workMode", "ONSITE")}>
          {WORK_MODES.map((m) => (
            <option key={m} value={m}>
              {WORK_MODE_LABELS[m]}
            </option>
          ))}
        </Select>
        <Input label="Location (optional)" id="location" name="location" defaultValue={val("location")} maxLength={MAX.location} />
        <Input label="Experience (optional)" id="experience" name="experience" placeholder="e.g. 0–1 years" defaultValue={val("experience")} maxLength={MAX.experience} />
      </div>
      <Input label="Skills (optional, comma separated)" id="skills" name="skills" defaultValue={val("skills")} maxLength={MAX.skills} />
      <Input label="Application deadline (optional)" id="applyDeadline" name="applyDeadline" type="date" defaultValue={val("applyDeadline")} />
      <Textarea label="Description" id="description" name="description" rows={8} defaultValue={val("description")} maxLength={MAX.description} required />
      <div>
        <Submit>{editing ? "Save changes" : "Create job (as draft)"}</Submit>
      </div>
    </form>
  );
}

export function JobStatusForm({ jobId, status }) {
  const [state, action] = useActionState(setJobStatusAction, idle);
  return (
    <form action={action} className="flex flex-col gap-3">
      <input type="hidden" name="jobId" value={jobId} />
      <Select label="Status" id="status" name="status" defaultValue={status}>
        {JOB_STATUSES.map((s) => (
          <option key={s} value={s}>
            {JOB_STATUS_LABELS[s]}
          </option>
        ))}
      </Select>
      <p className="text-xs text-muted">Only published jobs with an open deadline are visible to students. Closing keeps all applications.</p>
      <div>
        <Submit>Update status</Submit>
      </div>
      <Feedback state={state} />
    </form>
  );
}

/** Staff review: only the transitions the pipeline allows are offered; the server enforces them again. */
export function ApplicationReviewForm({ applicationId, status, notes }) {
  const [state, action] = useActionState(updateApplicationStatusAction, idle);
  const next = STAFF_TRANSITIONS[status] || [];
  return (
    <form action={action} className="flex flex-col gap-3">
      <input type="hidden" name="applicationId" value={applicationId} />
      <Select label="Move to" id={`status-${applicationId}`} name="status" defaultValue={status}>
        <option value={status}>{APPLICATION_STATUS_LABELS[status]} (current)</option>
        {next.map((s) => (
          <option key={s} value={s}>
            {APPLICATION_STATUS_LABELS[s]}
          </option>
        ))}
      </Select>
      <Textarea
        label="Internal notes (never shown to the student)"
        id={`notes-${applicationId}`}
        name="notes"
        rows={2}
        maxLength={MAX.notes}
        defaultValue={notes || ""}
      />
      <div>
        <Submit size="sm">Save</Submit>
      </div>
      <Feedback state={state} />
    </form>
  );
}

export function ConfirmPlacementForm({ applicationId }) {
  const [state, action] = useActionState(confirmPlacementAction, idle);
  return (
    <form action={action} className="flex flex-col gap-3">
      <input type="hidden" name="applicationId" value={applicationId} />
      <Input label="Placement note (optional)" id={`pn-${applicationId}`} name="note" maxLength={MAX.notes} placeholder="e.g. joined on 1 Nov" />
      <p className="text-xs text-muted">Only confirm once the candidate has actually accepted and joined. Selected alone is not counted as a placement.</p>
      <div>
        <Submit variant="outline" size="sm">
          Confirm placement
        </Submit>
      </div>
      <Feedback state={state} />
    </form>
  );
}
