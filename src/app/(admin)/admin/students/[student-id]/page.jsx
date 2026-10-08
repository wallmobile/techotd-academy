import { notFound } from "next/navigation";
import { requireAdminContext } from "@/lib/admin/context";
import { getStudentDetailForAdmin } from "@/lib/admin/students";
import { AdminShell } from "@/components/admin/AdminShell";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { StatusBadge } from "@/components/admin/AdminDataList";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import Link from "next/link";
import { formatDbDate } from "@/lib/utils";

export const metadata = {
  title: "Student Detail",
  robots: { index: false, follow: false },
};

export default async function AdminStudentDetailPage({ params }) {
  const { user } = await requireAdminContext();
  const { "student-id": studentId } = await params;
  const detail = await getStudentDetailForAdmin(studentId);
  if (!detail) notFound();

  const { user: student, profile, courses, batches, attendance, submissions, certificates } = detail;

  return (
    <AdminShell user={user} title="Students">
      <div className="flex flex-col gap-6">
        <AdminPageHeader title={student.name} backHref="/admin/students" backLabel="Back to Students">
          <Button href={`/admin/enrollments/new?student=${student.id}`}>+ Enroll Student</Button>
        </AdminPageHeader>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <Card>
            <h2 className="text-sm font-semibold text-dark">Profile</h2>
            <dl className="mt-4 flex flex-col gap-2.5 text-sm">
              <Row label="Email">{student.email}</Row>
              <Row label="Phone">{student.phone || profile?.phone || "—"}</Row>
              <Row label="City">{profile?.city || "—"}</Row>
              <Row label="Bio">{profile?.bio || "—"}</Row>
              <Row label="Avatar">{profile?.avatarUrl ? "Set" : "None"}</Row>
            </dl>
            {!profile && (
              <p className="mt-4 text-xs text-muted">This student hasn&apos;t opened the Student LMS yet, so no learning profile exists.</p>
            )}
          </Card>

          <Card>
            <h2 className="text-sm font-semibold text-dark">Account</h2>
            <dl className="mt-4 flex flex-col gap-2.5 text-sm">
              <Row label="Role">Student</Row>
              <Row label="Status">
                <StatusBadge status={student.status} />
              </Row>
              <Row label="Joined">{formatDbDate(student.createdAt)}</Row>
              <Row label="Active sessions">{student.activeSessionCount}</Row>
            </dl>
          </Card>
        </div>

        <h2 className="text-base font-semibold text-dark">Learning</h2>
        <p className="-mt-4 text-sm text-muted">Course and batch enrollments, attendance, submissions and certificates.</p>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <Card>
            <h3 className="text-sm font-semibold text-dark">Course enrollments</h3>
            {courses.length === 0 ? (
              <Empty>No course enrollments.</Empty>
            ) : (
              <ul className="mt-3 divide-y divide-border">
                {courses.map((c) => (
                  <li key={c.id} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                    <span className="min-w-0 break-words text-text">{c.title}</span>
                    <span className="flex flex-none items-center gap-2">
                      {c.progressPercent !== null && <span className="text-xs text-muted">{c.progressPercent}%</span>}
                      <Badge variant="neutral">{c.status}</Badge>
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card>
            <h3 className="text-sm font-semibold text-dark">Batch enrollments</h3>
            {batches.length === 0 ? (
              <Empty>No batch enrollments.</Empty>
            ) : (
              <ul className="mt-3 divide-y divide-border">
                {batches.map((b) => (
                  <li key={b.id} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                    <Link href={`/admin/enrollments/${b.id}`} className="min-w-0 break-words text-text hover:text-primary">
                      {b.courseTitle || b.batchId}
                      {b.mode ? ` — ${b.mode}` : ""}
                    </Link>
                    <Badge variant="neutral">{b.status}</Badge>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card>
            <h3 className="text-sm font-semibold text-dark">Attendance</h3>
            {!attendance || attendance.total === 0 ? (
              <Empty>No attendance recorded.</Empty>
            ) : (
              <dl className="mt-3 flex flex-col gap-2 text-sm">
                <Row label="Records">{attendance.total}</Row>
                {Object.entries(attendance.byStatus).map(([status, count]) => (
                  <Row key={status} label={status}>
                    {count}
                  </Row>
                ))}
              </dl>
            )}
          </Card>

          <Card>
            <h3 className="text-sm font-semibold text-dark">Certificates</h3>
            {certificates.length === 0 ? (
              <Empty>No certificates issued.</Empty>
            ) : (
              <ul className="mt-3 divide-y divide-border">
                {certificates.map((c) => (
                  <li key={c.id} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                    <span className="min-w-0 break-words text-text">
                      {c.courseTitle} <span className="text-xs text-muted">({c.certificateNumber})</span>
                    </span>
                    <Badge variant={c.status === "ACTIVE" ? "success" : "danger"}>{c.status}</Badge>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>

        <Card>
          <h3 className="text-sm font-semibold text-dark">Assignment submissions</h3>
          {submissions.length === 0 ? (
            <Empty>No assignment submissions.</Empty>
          ) : (
            <ul className="mt-3 divide-y divide-border">
              {submissions.map((s) => (
                <li key={s.id} className="flex flex-wrap items-center justify-between gap-3 py-2.5 text-sm">
                  <span className="min-w-0 break-words text-text">{s.assignmentTitle}</span>
                  <span className="flex flex-none items-center gap-2 text-xs text-muted">
                    {s.score !== null && <span>Score {s.score}</span>}
                    <span>{formatDbDate(s.submittedAt)}</span>
                    <Badge variant="neutral">{s.status}</Badge>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </AdminShell>
  );
}

function Row({ label, children }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <dt className="text-muted">{label}</dt>
      <dd className="min-w-0 break-words text-right font-medium text-text">{children}</dd>
    </div>
  );
}

function Empty({ children }) {
  return <p className="mt-3 text-sm text-muted">{children}</p>;
}
