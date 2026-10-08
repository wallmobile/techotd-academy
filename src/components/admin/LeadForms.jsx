"use client";

import { useActionState, useEffect, useRef } from "react";
import { useFormStatus } from "react-dom";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import { Button } from "@/components/ui/Button";
import { LEAD_STATUSES, LEAD_STATUS_LABELS, NOTE_MAX_LENGTH } from "@/constants/crm";
import {
  updateLeadStatusAction,
  markLeadContactedAction,
  assignLeadAction,
  addLeadNoteAction,
} from "@/lib/crm/actions";

const idle = { status: "idle" };

function Submit({ children, variant = "primary", size = "md" }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size={size} variant={variant} loading={pending} disabled={pending}>
      {children}
    </Button>
  );
}

function Feedback({ state }) {
  if (state.status === "error") {
    return (
      <p role="alert" className="text-sm text-danger">
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

/** Status dropdown. The server only accepts the fixed status list. */
export function LeadStatusForm({ leadId, status }) {
  const [state, action] = useActionState(updateLeadStatusAction, idle);
  return (
    <form action={action} className="flex flex-col gap-3">
      <input type="hidden" name="leadId" value={leadId} />
      <Select label="Status" id="status" name="status" defaultValue={status}>
        {LEAD_STATUSES.map((s) => (
          <option key={s} value={s}>
            {LEAD_STATUS_LABELS[s]}
          </option>
        ))}
      </Select>
      <div>
        <Submit>Update status</Submit>
      </div>
      <Feedback state={state} />
    </form>
  );
}

/** Explicit contact event — the only control that sets "last contacted". */
export function MarkContactedForm({ leadId }) {
  const [state, action] = useActionState(markLeadContactedAction, idle);
  return (
    <form action={action} className="flex flex-col gap-2">
      <input type="hidden" name="leadId" value={leadId} />
      <div>
        <Submit variant="outline">Mark as contacted</Submit>
      </div>
      <p className="text-xs text-muted">Use this after you actually spoke to or messaged the lead. It sets status to Contacted and records the time.</p>
      <Feedback state={state} />
    </form>
  );
}

/** Manager assignment: pick from the people the server offers (it re-validates the choice). */
export function AssignLeadForm({ leadId, assignedTo, assignees }) {
  const [state, action] = useActionState(assignLeadAction, idle);
  return (
    <form action={action} className="flex flex-col gap-3">
      <input type="hidden" name="leadId" value={leadId} />
      <Select label="Assigned to" id="assignedTo" name="assignedTo" defaultValue={assignedTo || ""}>
        <option value="">Unassigned</option>
        {assignees.map((u) => (
          <option key={u.id} value={u.id}>
            {u.name} ({u.role === "COUNSELLOR" ? "Counsellor" : u.role === "SUPER_ADMIN" ? "Super Admin" : "Admin"})
          </option>
        ))}
      </Select>
      <div>
        <Submit>Save assignment</Submit>
      </div>
      <Feedback state={state} />
    </form>
  );
}

/** Counsellor self-claim of an unassigned lead. The server only accepts the caller's own id. */
export function ClaimLeadForm({ leadId, userId }) {
  const [state, action] = useActionState(assignLeadAction, idle);
  return (
    <form action={action} className="flex flex-col gap-2">
      <input type="hidden" name="leadId" value={leadId} />
      <input type="hidden" name="assignedTo" value={userId} />
      <div>
        <Submit>Assign to me</Submit>
      </div>
      <p className="text-xs text-muted">Claim this lead to update its status and add notes.</p>
      <Feedback state={state} />
    </form>
  );
}

export function LeadNoteForm({ leadId }) {
  const [state, action] = useActionState(addLeadNoteAction, idle);
  const formRef = useRef(null);

  useEffect(() => {
    if (state.status === "success") formRef.current?.reset();
  }, [state]);

  return (
    <form ref={formRef} action={action} className="flex flex-col gap-3">
      <input type="hidden" name="leadId" value={leadId} />
      <Textarea label="Add an internal note" id="note" name="note" rows={3} maxLength={NOTE_MAX_LENGTH} required />
      <div>
        <Submit>Add note</Submit>
      </div>
      <Feedback state={state} />
    </form>
  );
}
