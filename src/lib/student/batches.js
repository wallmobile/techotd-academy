// Batch + schedule server functions (Phase 8.5). Same pattern as
// src/lib/student/courses.js: UI calls these, never src/lib/db/* directly,
// and the student identity always comes from getCurrentUser() — there is
// no studentId/batchId-as-"whose data" parameter anywhere in this file.

import { getCurrentUser } from "@/lib/auth/currentUser";
import { getOrCreateStudentProfile } from "@/lib/db/studentProfiles";
import { listBatchEnrollmentsForStudent } from "@/lib/db/batchEnrollments";
import { listSessionsForBatchIds } from "@/lib/db/classSessions";
import { getCourseBySlug } from "@/data/courses";
import { getBatchById } from "@/data/batches";

function sessionDateTime(session) {
  return new Date(`${session.sessionDate}T${session.startTime}:00`);
}

// "My Batches" — every non-cancelled batch enrollment for the signed-in
// student, enriched with its real batch (src/data/batches.js) and course
// (src/data/courses.js). Nothing here is invented: an enrollment whose
// batch id no longer exists in the catalog is dropped rather than shown
// with missing details.
export async function getMyBatchEnrollments() {
  const user = await getCurrentUser();
  if (!user || user.role !== "STUDENT") return [];

  const profile = getOrCreateStudentProfile(user.id);

  return listBatchEnrollmentsForStudent(profile.id)
    .filter((enrollment) => enrollment.status !== "CANCELLED")
    .map((enrollment) => {
      const batch = getBatchById(enrollment.batchId);
      if (!batch) return { ...enrollment, batch: null, course: null };
      return { ...enrollment, batch, course: getCourseBySlug(batch.courseSlug) };
    })
    .filter((enrollment) => Boolean(enrollment.batch));
}

// Full schedule for the signed-in student: every class_sessions row
// belonging to a batch they're actually (non-cancelled) enrolled in —
// security-scoped entirely from the session, never from a batchId a
// caller could supply. Splits into upcoming/past by comparing each
// session's real date+time against the server clock; returns empty
// arrays (never fabricated placeholder sessions) when nothing has been
// published yet.
export async function getMySchedule() {
  const user = await getCurrentUser();
  if (!user || user.role !== "STUDENT") return { upcoming: [], past: [], nextSession: null };

  const profile = getOrCreateStudentProfile(user.id);
  const batchEnrollments = listBatchEnrollmentsForStudent(profile.id).filter(
    (e) => e.status !== "CANCELLED"
  );
  const batchIds = batchEnrollments.map((e) => e.batchId);

  const sessions = listSessionsForBatchIds(batchIds)
    .map((session) => {
      const batch = getBatchById(session.batchId);
      if (!batch) return null;
      return { ...session, batch, course: getCourseBySlug(batch.courseSlug) };
    })
    .filter(Boolean);

  const now = new Date();
  const upcoming = sessions
    .filter((s) => s.status !== "CANCELLED" && sessionDateTime(s) >= now)
    .sort((a, b) => sessionDateTime(a) - sessionDateTime(b));
  const past = sessions
    .filter((s) => s.status === "CANCELLED" || sessionDateTime(s) < now)
    .sort((a, b) => sessionDateTime(b) - sessionDateTime(a));

  return { upcoming, past, nextSession: upcoming[0] || null };
}

// For the dashboard's optional "Upcoming Class" — just the single next
// real session, or null if none has been published. Reuses getMySchedule
// rather than a separate query so there's exactly one place that decides
// what "next" means.
export async function getNextUpcomingSession() {
  const { nextSession } = await getMySchedule();
  return nextSession;
}
