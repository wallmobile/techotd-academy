"use client";

import { useActionState, useEffect, useRef } from "react";
import { useFormStatus } from "react-dom";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import { CLASS_SESSION_STATUSES } from "@/constants/lmsStatuses";
import { createClassSessionAction, updateClassSessionAction } from "@/lib/trainer/classSessionActions";

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
 * Create/edit form for a trainer's own class session (Phase 9.2).
 * `mode="create"` shows a batch <select> scoped to the trainer's own
 * assigned batches (never the full batch catalog); `mode="edit"` shows
 * the batch as a read-only label (a session's batch doesn't move) plus a
 * status <select>. Both actions re-verify ownership server-side — this
 * component only ever sends field values and displays whatever the
 * server decides.
 */
export function ClassSessionForm({ mode, batches, detail, classSessionId }) {
  const action = mode === "edit" ? updateClassSessionAction : createClassSessionAction;
  const [state, formAction] = useActionState(action, initialState);
  const errorRef = useRef(null);
  const successRef = useRef(null);
  const session = detail?.session;

  useEffect(() => {
    if (state.status === "error" && state.formError) errorRef.current?.focus();
    else if (state.status === "success") successRef.current?.focus();
  }, [state]);

  const values = state.values || {};
  const fieldValue = (name, fallback = "") => values[name] ?? session?.[name] ?? fallback;

  return (
    <form action={formAction} noValidate className="flex flex-col gap-4">
      {mode === "edit" && <input type="hidden" name="classSessionId" value={classSessionId} />}

      {state.status === "success" && (
        <p
          ref={successRef}
          tabIndex={-1}
          role="status"
          className="rounded-sm border border-success/30 bg-success/10 px-4 py-3 text-sm font-medium text-success outline-none"
        >
          {state.message}
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

      <Input
        label="Class Title"
        id="title"
        name="title"
        defaultValue={fieldValue("title")}
        error={state.errors?.title}
        required
      />

      {mode === "create" ? (
        <Select label="Batch" id="batchId" name="batchId" defaultValue={fieldValue("batchId")} error={state.errors?.batchId} required>
          <option value="">Select a batch…</option>
          {batches.map(({ batch, course }) => (
            <option key={batch.id} value={batch.id}>
              {course.title} — {batch.mode}
            </option>
          ))}
        </Select>
      ) : (
        <div className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-text">Batch</span>
          <p className="text-sm text-muted">
            {detail?.course?.title} — {detail?.batch?.mode}
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Input
          label="Date"
          id="sessionDate"
          name="sessionDate"
          type="date"
          defaultValue={fieldValue("sessionDate")}
          error={state.errors?.sessionDate}
          required
        />
        <Input
          label="Start Time"
          id="startTime"
          name="startTime"
          type="time"
          defaultValue={fieldValue("startTime")}
          error={state.errors?.startTime}
          required
        />
        <Input
          label="End Time"
          id="endTime"
          name="endTime"
          type="time"
          defaultValue={fieldValue("endTime")}
          error={state.errors?.endTime}
          required
        />
      </div>

      <Input
        label="Meeting URL (optional)"
        id="meetingUrl"
        name="meetingUrl"
        type="url"
        placeholder="https://…"
        defaultValue={fieldValue("meetingUrl")}
        error={state.errors?.meetingUrl}
      />

      <Input
        label="Location (optional)"
        id="location"
        name="location"
        defaultValue={fieldValue("location")}
        error={state.errors?.location}
      />

      {mode === "edit" && (
        <Select
          label="Status"
          id="status"
          name="status"
          defaultValue={fieldValue("status")}
          error={state.errors?.status}
        >
          {CLASS_SESSION_STATUSES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </Select>
      )}

      <SubmitButton>{mode === "edit" ? "Save Changes" : "Schedule Class"}</SubmitButton>
    </form>
  );
}
