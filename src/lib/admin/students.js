// Admin student management (Phase 10.1) — read-only. The route id is the
// student's USER id (every STUDENT user has one; a student_profiles row is
// created lazily on first LMS visit, so it can legitimately be missing and
// a GET must not create it). Only existing data is shown; no enrollment
// creation exists yet.

import { getAdminContext } from "@/lib/admin/context";
import { PAGE_SIZE, paginate } from "@/lib/admin/listParams";
import { listStudentsPage, getUserRow, getStudentProfileRowByUserId, listSubmissionsForStudent } from "@/lib/db/adminQueries";
import { listCourseEnrollmentsForStudent } from "@/lib/db/courseEnrollments";
import { listBatchEnrollmentsForStudent } from "@/lib/db/batchEnrollments";
import { listAttendanceForStudent } from "@/lib/db/attendanceRecords";
import { listCertificatesForStudent } from "@/lib/db/certificates";
import { computeCourseProgress } from "@/lib/student/progress";
import { getCourseBySlug } from "@/data/courses";
import { getBatchById } from "@/data/batches";

const EMPTY_PAGE = { rows: [], page: 1, totalPages: 1, pageSize: PAGE_SIZE, total: 0 };

export async function getStudentsPage({ q, sort, page }) {
  if (!(await getAdminContext())) return EMPTY_PAGE;
  const probe = paginate(listStudentsPage({ q, sort, limit: 1, offset: 0 }).total, page);
  const { rows, total } = listStudentsPage({ q, sort, limit: PAGE_SIZE, offset: (probe.page - 1) * PAGE_SIZE });
  return { rows, ...paginate(total, probe.page) };
}

// Returns null for "doesn't exist" and "exists but isn't a STUDENT user"
// identically. Selects no password hash, session or reset-token data.
export async function getStudentDetailForAdmin(userId) {
  if (!(await getAdminContext())) return null;
  const user = getUserRow(userId);
  if (!user || user.role !== "STUDENT") return null;

  const profile = getStudentProfileRowByUserId(user.id);
  const base = { user, profile };
  if (!profile) {
    return { ...base, courses: [], batches: [], attendance: null, submissions: [], certificates: [] };
  }

  const courses = listCourseEnrollmentsForStudent(profile.id).map((enrollment) => {
    const course = getCourseBySlug(enrollment.courseSlug);
    return {
      id: enrollment.id,
      status: enrollment.status,
      courseSlug: enrollment.courseSlug,
      title: course?.title ?? enrollment.courseSlug,
      progressPercent: course ? computeCourseProgress(profile.id, course).percent : null,
    };
  });

  const batches = listBatchEnrollmentsForStudent(profile.id).map((enrollment) => {
    const batch = getBatchById(enrollment.batchId);
    const course = batch ? getCourseBySlug(batch.courseSlug) : null;
    return {
      id: enrollment.id,
      status: enrollment.status,
      batchId: enrollment.batchId,
      mode: batch?.mode ?? null,
      courseTitle: course?.title ?? null,
    };
  });

  const records = listAttendanceForStudent(profile.id);
  const attendance = { total: records.length, byStatus: {} };
  for (const record of records) {
    attendance.byStatus[record.status] = (attendance.byStatus[record.status] || 0) + 1;
  }

  const certificates = listCertificatesForStudent(profile.id).map((c) => ({
    id: c.id,
    certificateNumber: c.certificateNumber,
    status: c.status,
    courseTitle: getCourseBySlug(c.courseSlug)?.title ?? c.courseSlug,
  }));

  return { ...base, courses, batches, attendance, submissions: listSubmissionsForStudent(profile.id), certificates };
}
