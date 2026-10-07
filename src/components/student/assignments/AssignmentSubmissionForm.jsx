"use client";

import { useActionState, useEffect, useRef } from "react";
import { useFormStatus } from "react-dom";
import { Textarea } from "@/components/ui/Textarea";
import { Button } from "@/components/ui/Button";
import { submitAssignmentAction } from "@/lib/student/assignmentActions";

function SubmitButton({ children }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" loading={pending} disabled={pending}>
      {children}
    </Button>
  );
}

const initialState = { status: "idle", errors: {}, formError: null, values: {} };

/**
 * Text-only submission form (Phase 8.6). File upload is deliberately not
 * offered here — no cloud storage is configured — rather than faking an
 * upload control that doesn't actually work.
 *
 * Security: submitAssignmentAction re-verifies the student, their
 * enrollment, and the assignment's open/closed state server-side on every
 * call — this component only ever sends assignmentId + submissionText and
 * displays whatever the server decides.
 */
export function AssignmentSubmissionForm({ assignmentId, existingSubmission, isClosed }) {
  const [state, formAction] = useActionState(submitAssignmentAction, initialState);
  const errorRef = useRef(null);
  const successRef = useRef(null);

  // Move focus to the outcome message after a submit, so keyboard/screen
  // reader users get immediate feedback rather than focus silently
  // staying on the (now potentially disabled) submit button.
  useEffect(() => {
    if (state.status === "error" && state.formError) errorRef.current?.focus();
    else if (state.status === "success") successRef.current?.focus();
  }, [state]);

  if (isClosed) {
    return (
      <p role="status" className="rounded-md border border-border bg-surface px-4 py-3 text-sm text-muted">
        This assignment is closed for submissions.
        {existingSubmission && " Your last submission is shown below."}
      </p>
    );
  }

  const submissionValue = state.values?.submissionText ?? existingSubmission?.submissionText ?? "";
  const isResubmit = Boolean(existingSubmission);

  return (
    <form action={formAction} noValidate className="flex flex-col gap-4">
      <input type="hidden" name="assignmentId" value={assignmentId} />

      {state.status === "success" && (
        <p
          ref={successRef}
          tabIndex={-1}
          role="status"
          className="rounded-sm border border-success/30 bg-success/10 px-4 py-3 text-sm font-medium text-success outline-none"
        >
          Your submission has been saved.
        </p>
      )}

      {state.formError && (
        <p
          ref={errorRef}
          tabIndex={-1}
          role="alert"
          className="rounded-sm border border-danger/30 bg-danger/5 px-4 py-3 text-sm text-danger outline-none"
        >
          {state.formError}
        </p>
      )}

      <Textarea
        label="Your Submission"
        id="submissionText"
        name="submissionText"
        rows={8}
        placeholder="Write or paste your answer here…"
        defaultValue={submissionValue}
        error={state.errors?.submissionText}
        required
      />

      <p className="text-xs text-muted">File submission will be available in a future update.</p>

      <SubmitButton>{isResubmit ? "Resubmit" : "Submit Assignment"}</SubmitButton>
    </form>
  );
}
