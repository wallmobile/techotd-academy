"use client";

import { useActionState, useEffect, useRef } from "react";
import { useFormStatus } from "react-dom";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import { evaluateSubmissionAction } from "@/lib/trainer/evaluationActions";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="sm" loading={pending} disabled={pending}>
      Save Evaluation
    </Button>
  );
}

const initialState = { status: "idle", errors: {}, formError: null };

/**
 * Per-submission evaluation form (spec Step 15). Writes score/feedback
 * directly onto the existing assignment_submissions row — the same row
 * the student's own assignment detail page reads (spec Step 16), so
 * there's exactly one place this information lives. No elaborate grading
 * rubric: a plain optional 0–100 score plus free-text feedback, and a
 * REVIEWED/RETURNED status choice.
 */
export function EvaluationForm({ submission }) {
  const [state, formAction] = useActionState(evaluateSubmissionAction, initialState);
  const errorRef = useRef(null);
  const successRef = useRef(null);

  useEffect(() => {
    if (state.status === "error" && state.formError) errorRef.current?.focus();
    else if (state.status === "success") successRef.current?.focus();
  }, [state]);

  return (
    <form action={formAction} noValidate className="flex flex-col gap-3 border-t border-border pt-4">
      <input type="hidden" name="submissionId" value={submission.id} />

      {state.status === "success" && (
        <p
          ref={successRef}
          tabIndex={-1}
          role="status"
          className="rounded-sm border border-success/30 bg-success/10 px-3 py-2 text-xs font-medium text-success outline-none"
        >
          {state.message}
        </p>
      )}

      {state.formError && (
        <p
          ref={errorRef}
          tabIndex={-1}
          role="alert"
          className="rounded-sm border border-danger/30 bg-danger/5 px-3 py-2 text-xs text-danger outline-none"
        >
          {state.formError}
        </p>
      )}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-[8rem_1fr]">
        <Select
          label="Decision"
          id={`status-${submission.id}`}
          name="status"
          defaultValue={submission.status === "SUBMITTED" ? "REVIEWED" : submission.status}
          error={state.errors?.status}
        >
          <option value="REVIEWED">Reviewed</option>
          <option value="RETURNED">Returned</option>
        </Select>
        <Input
          label="Score (0–100, optional)"
          id={`score-${submission.id}`}
          name="score"
          type="number"
          min={0}
          max={100}
          defaultValue={submission.score ?? ""}
          error={state.errors?.score}
        />
      </div>

      <Textarea
        label="Feedback (optional)"
        id={`feedback-${submission.id}`}
        name="feedback"
        rows={3}
        defaultValue={submission.feedback || ""}
        error={state.errors?.feedback}
      />

      <div className="flex justify-end">
        <SubmitButton />
      </div>
    </form>
  );
}
