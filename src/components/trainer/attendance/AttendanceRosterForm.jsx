"use client";

import { useActionState, useEffect, useRef } from "react";
import { useFormStatus } from "react-dom";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import { ATTENDANCE_STATUSES } from "@/constants/lmsStatuses";
import { markAttendanceAction } from "@/lib/trainer/attendanceActions";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" loading={pending} disabled={pending}>
      Save Attendance
    </Button>
  );
}

const initialState = { status: "idle", formError: null, message: null };

/**
 * Bulk attendance roster (Phase 9.2, spec Steps 6–8). Every enrolled
 * student gets a status <select>, defaulting to their existing mark (or
 * "Not marked yet" if none) — reopening a session never wipes a prior
 * save. "Mark All Present" (spec Step 7) is a client-side convenience
 * that sets every select at once; individual corrections stay fully
 * possible afterwards, right up until submit. The actual save is one
 * Server Action (markAttendanceAction) that re-verifies ownership and
 * real enrollment for every row server-side — this form only ever posts
 * studentId + chosen status pairs.
 */
export function AttendanceRosterForm({ classSessionId, roster }) {
  const [state, formAction] = useActionState(markAttendanceAction, initialState);
  const formRef = useRef(null);
  const successRef = useRef(null);
  const errorRef = useRef(null);

  useEffect(() => {
    if (state.status === "error" && state.formError) errorRef.current?.focus();
    else if (state.status === "success") successRef.current?.focus();
  }, [state]);

  function markAllPresent() {
    const selects = formRef.current?.querySelectorAll("select[data-attendance-status]");
    selects?.forEach((select) => {
      select.value = "PRESENT";
    });
  }

  if (roster.length === 0) {
    return <p className="text-sm text-muted">No students are enrolled in this batch yet.</p>;
  }

  return (
    <form ref={formRef} action={formAction} className="flex flex-col gap-4">
      <input type="hidden" name="classSessionId" value={classSessionId} />

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

      <div className="flex justify-end">
        <Button type="button" variant="outline" size="sm" onClick={markAllPresent}>
          Mark All Present
        </Button>
      </div>

      <ul className="flex flex-col divide-y divide-border rounded-md border border-border bg-white">
        {roster.map((student) => (
          <li key={student.studentProfileId} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
            <input type="hidden" name="studentProfileId" value={student.studentProfileId} />
            <div className="min-w-0">
              <p className="text-sm font-medium text-dark">{student.name}</p>
              <p className="text-xs text-muted">{student.email}</p>
            </div>
            <Select
              aria-label={`Attendance status for ${student.name}`}
              id={`status-${student.studentProfileId}`}
              name={`status-${student.studentProfileId}`}
              data-attendance-status
              defaultValue={student.currentStatus || ""}
              className="w-40"
            >
              <option value="" disabled>
                Not marked yet
              </option>
              {ATTENDANCE_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </Select>
          </li>
        ))}
      </ul>

      <div className="flex justify-end">
        <SubmitButton />
      </div>
    </form>
  );
}
