"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import { ENROLLMENT_STATUSES, ENROLLMENT_STATUS_LABELS } from "@/constants/enrollment";
import { createEnrollmentAction, setEnrollmentStatusAction } from "@/lib/admin/enrollmentActions";

function Submit({ children, variant = "primary" }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" variant={variant} loading={pending} disabled={pending}>
      {children}
    </Button>
  );
}

/**
 * Create-enrollment form. The batch list is narrowed to the chosen course
 * for convenience only — the server re-validates student, course, batch and
 * the course/batch relationship, and the status is always ACTIVE.
 */
export function EnrollmentForm({ student, courses, batches, initialCourse, initialBatch }) {
  const [state, action] = useActionState(createEnrollmentAction, { status: "idle" });
  const [course, setCourse] = useState(state.values?.course ?? initialCourse);
  const [batch, setBatch] = useState(state.values?.batch ?? initialBatch);
  const courseBatches = batches.filter((b) => b.courseSlug === course);

  return (
    <form action={action} className="flex flex-col gap-4">
      <input type="hidden" name="studentId" value={student.id} />
      {state.status === "error" && (
        <p role="alert" className="rounded-sm border border-danger/30 bg-danger/5 px-4 py-3 text-sm text-danger">
          {state.formError}
        </p>
      )}

      <div className="flex flex-col gap-1.5">
        <span className="text-sm font-medium text-text">Student</span>
        <p className="text-sm text-dark">
          {student.name} <span className="text-muted">· {student.email}</span>
        </p>
      </div>

      <Select
        label="Course"
        id="course"
        name="course"
        value={course}
        onChange={(event) => {
          setCourse(event.target.value);
          setBatch("");
        }}
        required
      >
        <option value="" disabled>
          Select a course…
        </option>
        {courses.map((c) => (
          <option key={c.value} value={c.value}>
            {c.label}
          </option>
        ))}
      </Select>

      <Select
        label="Batch"
        id="batch"
        name="batch"
        value={batch}
        onChange={(event) => setBatch(event.target.value)}
        disabled={!course}
        required
      >
        <option value="" disabled>
          {course ? (courseBatches.length ? "Select a batch…" : "No open batches for this course") : "Select a course first"}
        </option>
        {courseBatches.map((b) => (
          <option key={b.value} value={b.value}>
            {b.label}
          </option>
        ))}
      </Select>

      <p className="text-xs text-muted">The enrollment starts as Active. You can change its status afterwards.</p>
      <div>
        <Submit>Enroll student</Submit>
      </div>
    </form>
  );
}

export function EnrollmentStatusForm({ enrollmentId, status }) {
  const [state, action] = useActionState(setEnrollmentStatusAction, { status: "idle" });
  return (
    <form action={action} className="flex flex-col gap-3">
      <input type="hidden" name="enrollmentId" value={enrollmentId} />
      <Select label="Status" id="status" name="status" defaultValue={status}>
        {ENROLLMENT_STATUSES.map((s) => (
          <option key={s} value={s}>
            {ENROLLMENT_STATUS_LABELS[s]}
          </option>
        ))}
      </Select>
      <p className="text-xs text-muted">
        Cancelling keeps the record (it is never deleted) and removes the course and batch from the student&apos;s LMS and the trainer&apos;s list.
      </p>
      <div>
        <Submit>Update status</Submit>
      </div>
      {state.status === "error" && (
        <p role="alert" className="text-sm text-danger">
          {state.formError}
        </p>
      )}
      {state.status === "success" && (
        <p role="status" className="text-sm font-medium text-success">
          {state.message}
        </p>
      )}
    </form>
  );
}
