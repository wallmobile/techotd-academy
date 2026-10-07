"use client";

import { useActionState, useEffect, useRef } from "react";
import { useFormStatus } from "react-dom";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import { Button } from "@/components/ui/Button";
import { ASSIGNMENT_STATUSES } from "@/constants/lmsStatuses";
import { createAssignmentAction, updateAssignmentAction } from "@/lib/trainer/assignmentActions";

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
 * Create/edit form for a trainer's own assignment (Phase 9.2).
 * `mode="create"` shows a course <select> scoped to courses this trainer
 * teaches (never the full catalog) plus an optional batch <select>
 * scoped to their own batches for that course (course-wide when left on
 * "All batches"). `mode="edit"` shows the course as a read-only label
 * plus a status <select>, preserving the existing DRAFT/PUBLISHED/CLOSED
 * lifecycle exactly. Both actions re-verify ownership server-side.
 */
export function AssignmentForm({ mode, courses, batches, assignment, course, assignmentId }) {
  const action = mode === "edit" ? updateAssignmentAction : createAssignmentAction;
  const [state, formAction] = useActionState(action, initialState);
  const errorRef = useRef(null);
  const successRef = useRef(null);

  useEffect(() => {
    if (state.status === "error" && state.formError) errorRef.current?.focus();
    else if (state.status === "success") successRef.current?.focus();
  }, [state]);

  const values = state.values || {};
  const fieldValue = (name, fallback = "") => values[name] ?? assignment?.[name] ?? fallback;

  return (
    <form action={formAction} noValidate className="flex flex-col gap-4">
      {mode === "edit" && <input type="hidden" name="assignmentId" value={assignmentId} />}

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
        label="Assignment Title"
        id="title"
        name="title"
        defaultValue={fieldValue("title")}
        error={state.errors?.title}
        required
      />

      {mode === "create" ? (
        <>
          <Select
            label="Course"
            id="courseSlug"
            name="courseSlug"
            defaultValue={fieldValue("courseSlug")}
            error={state.errors?.courseSlug}
            required
          >
            <option value="">Select a course…</option>
            {courses.map((c) => (
              <option key={c.slug} value={c.slug}>
                {c.title}
              </option>
            ))}
          </Select>

          <Select label="Batch (optional)" id="batchId" name="batchId" defaultValue={fieldValue("batchId")}>
            <option value="">All batches of this course</option>
            {batches.map(({ batch, course: batchCourse }) => (
              <option key={batch.id} value={batch.id}>
                {batchCourse.title} — {batch.mode}
              </option>
            ))}
          </Select>
        </>
      ) : (
        <div className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-text">Course</span>
          <p className="text-sm text-muted">{course?.title}</p>
        </div>
      )}

      <Textarea
        label="Description (optional)"
        id="description"
        name="description"
        rows={5}
        defaultValue={fieldValue("description")}
        error={state.errors?.description}
      />

      <Input
        label="Due Date (optional)"
        id="dueAt"
        name="dueAt"
        type="date"
        defaultValue={fieldValue("dueAt")}
        error={state.errors?.dueAt}
      />

      {mode === "edit" && (
        <Select
          label="Status"
          id="status"
          name="status"
          defaultValue={fieldValue("status")}
          error={state.errors?.status}
        >
          {ASSIGNMENT_STATUSES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </Select>
      )}

      <SubmitButton>{mode === "edit" ? "Save Changes" : "Create Assignment"}</SubmitButton>
    </form>
  );
}
