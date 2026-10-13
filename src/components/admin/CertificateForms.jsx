"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { issueCertificateAction, revokeCertificateAction } from "@/lib/certificates/actions";
import { APPROVAL_NOTE_MIN } from "@/constants/certificates";

const idle = { status: "idle" };

function Submit({ children, variant = "primary" }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" variant={variant} loading={pending} disabled={pending}>
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

/** Automatic issuance — the server re-checks eligibility and refuses if it isn't met. */
export function IssueAutoForm({ enrollmentId }) {
  const [state, action] = useActionState(issueCertificateAction, idle);
  return (
    <form action={action} className="flex flex-col gap-3">
      <input type="hidden" name="enrollmentId" value={enrollmentId} />
      <input type="hidden" name="mode" value="AUTO" />
      <div>
        <Submit>Issue certificate</Submit>
      </div>
      <Feedback state={state} />
    </form>
  );
}

/** Manual approval — recorded as a manual approval with the reason below, never as automatic completion. */
export function IssueManualForm({ enrollmentId }) {
  const [state, action] = useActionState(issueCertificateAction, idle);
  return (
    <form action={action} className="flex flex-col gap-3">
      <input type="hidden" name="enrollmentId" value={enrollmentId} />
      <input type="hidden" name="mode" value="MANUAL" />
      <Input
        label="Reason for manual approval"
        id="approvalNote"
        name="approvalNote"
        minLength={APPROVAL_NOTE_MIN}
        maxLength={500}
        placeholder="Who confirmed completion, and on what basis?"
        required
      />
      <p className="text-xs text-muted">
        The certificate will be marked as manually approved by you, with this reason. It is not recorded as automatic course completion.
      </p>
      <div>
        <Submit variant="outline">Issue with manual approval</Submit>
      </div>
      <Feedback state={state} />
    </form>
  );
}

export function RevokeCertificateForm({ certificateId }) {
  const [state, action] = useActionState(revokeCertificateAction, idle);
  return (
    <form action={action} className="flex flex-col gap-3">
      <input type="hidden" name="certificateId" value={certificateId} />
      <Input label="Reason for revoking" id="reason" name="reason" maxLength={500} required />
      <p className="text-xs text-muted">The certificate stays on record and verification will show it as revoked. This can&apos;t be undone here.</p>
      <div>
        <Submit variant="outline">Revoke certificate</Submit>
      </div>
      <Feedback state={state} />
    </form>
  );
}
