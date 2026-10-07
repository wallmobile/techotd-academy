"use server";

// Server Action for the trainer bulk-attendance form (Phase 9.2). Parses
// the roster form's per-student status fields and delegates to
// saveAttendanceForSession(), which does the real ownership + enrollment
// verification — this action itself trusts nothing from the form beyond
// "here are some studentId/status pairs to try".

import { revalidatePath } from "next/cache";
import { saveAttendanceForSession } from "@/lib/trainer/attendance";

export async function markAttendanceAction(_prevState, formData) {
  const classSessionId = formData.get("classSessionId");
  const studentIds = formData.getAll("studentProfileId");

  const entries = studentIds.map((studentProfileId) => ({
    studentProfileId,
    status: formData.get(`status-${studentProfileId}`),
  }));

  const result = await saveAttendanceForSession(classSessionId, entries);

  if (!result.ok) {
    return {
      status: "error",
      formError:
        result.reason === "not_owned"
          ? "You don't have access to this class session."
          : "Nothing was saved — please select a status for at least one student.",
    };
  }

  // So the roster reflects the just-saved marks immediately, and the
  // student attendance page (same attendance_records table) picks up the
  // change on its next visit rather than showing a stale figure.
  revalidatePath(`/trainer/attendance/${classSessionId}`);
  revalidatePath("/student/attendance");

  return { status: "success", message: `Attendance saved for ${result.count} student${result.count === 1 ? "" : "s"}.` };
}
