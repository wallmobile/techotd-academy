"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { Textarea } from "@/components/ui/Textarea";
import { Button } from "@/components/ui/Button";
import { applyAction, withdrawAction } from "@/lib/placement/actions";
import { MAX } from "@/constants/placement";

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

/** The applicant is always the signed-in student; only the job id and message are sent. */
export function ApplyForm({ jobId }) {
  const [state, action] = useActionState(applyAction, idle);
  return (
    <form action={action} className="flex flex-col gap-3">
      <input type="hidden" name="jobId" value={jobId} />
      <Textarea label="Message to the recruiter (optional)" id="coverMessage" name="coverMessage" rows={4} maxLength={MAX.cover} />
      <p className="text-xs text-muted">Your name, email, phone and profile details are shared with the placement team. No resume file is uploaded.</p>
      <div>
        <Submit>Apply for this job</Submit>
      </div>
      <Feedback state={state} />
    </form>
  );
}

export function WithdrawForm({ applicationId }) {
  const [state, action] = useActionState(withdrawAction, idle);
  return (
    <form action={action} className="flex flex-col gap-2">
      <input type="hidden" name="applicationId" value={applicationId} />
      <div>
        <Submit variant="outline">Withdraw application</Submit>
      </div>
      <Feedback state={state} />
    </form>
  );
}
