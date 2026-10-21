// Attendance server functions (Phase 8.7). Same pattern as the rest of
// src/lib/student/*: the UI calls this, never src/lib/db/* directly, and
// the student identity always comes from getCurrentUser() — there is no
// studentId parameter anywhere in this file.

import { getCurrentUser } from "@/lib/auth/currentUser";
import { getOrCreateStudentProfile } from "@/lib/db/studentProfiles";
import { listAttendanceForStudent } from "@/lib/db/attendanceRecords";
import { getClassSessionById } from "@/lib/db/classSessions";
import { getBatch, getCourse } from "@/lib/catalog";

// "Attended" counts PRESENT only; LATE and EXCUSED are their own stats
// (a late arrival isn't the same as being on time, and an excused
// absence isn't the same as an unexcused one) — nothing here collapses
// them into a single number that would misrepresent either. The overall
// percentage counts PRESENT and LATE together as "attended the class" (a
// late student still attended), out of every real record — never
// fabricated when there are no records at all.
function computeAttendanceStats(records) {
  const total = records.length;
  const present = records.filter((r) => r.status === "PRESENT").length;
  const absent = records.filter((r) => r.status === "ABSENT").length;
  const late = records.filter((r) => r.status === "LATE").length;
  const excused = records.filter((r) => r.status === "EXCUSED").length;
  const percentage = total > 0 ? Math.round(((present + late) / total) * 100) : 0;

  return { total, present, absent, late, excused, percentage };
}

// Returns every attendance record for the signed-in student, enriched
// with its batch/course (src/data/batches.js / courses.js) and, when
// classSessionId is set, the real session it belongs to — nothing here is
// invented. `stats` is null when there are no records at all, which is
// the caller's signal to show "No attendance records available yet."
// rather than a 0% that would look like a real (bad) attendance figure.
export async function getMyAttendance() {
  const user = await getCurrentUser();
  if (!user || user.role !== "STUDENT") return { records: [], stats: null };

  const profile = await getOrCreateStudentProfile(user.id);
  const records = await listAttendanceForStudent(profile.id);

  if (records.length === 0) return { records: [], stats: null };

  const enriched = await Promise.all(records.map(async (record) => {
    const batch = await getBatch(record.batchId);
    const session = record.classSessionId ? await getClassSessionById(record.classSessionId) : null;
    return {
      ...record,
      batch,
      course: batch ? await getCourse(batch.courseSlug) : null,
      session,
    };
  }));

  return { records: enriched, stats: computeAttendanceStats(records) };
}
