import Link from "next/link";
import { requireAdminContext } from "@/lib/admin/context";
import { getEnrollmentFormData } from "@/lib/admin/enrollments";
import { AdminShell } from "@/components/admin/AdminShell";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { EnrollmentForm } from "@/components/admin/EnrollmentForms";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";

export const metadata = {
  title: "New Enrollment",
  robots: { index: false, follow: false },
};

export default async function AdminNewEnrollmentPage({ searchParams }) {
  const { user } = await requireAdminContext();
  const sp = (await searchParams) || {};
  const str = (v) => (typeof v === "string" ? v.slice(0, 100) : "");
  const studentQuery = str(sp.sq).trim();
  const data = await getEnrollmentFormData({
    studentId: str(sp.student),
    studentQuery,
    course: str(sp.course),
    batch: str(sp.batch),
  });

  // Carry the course/batch prefill through the student-picking step.
  const carry = new URLSearchParams();
  if (str(sp.course)) carry.set("course", str(sp.course));
  if (str(sp.batch)) carry.set("batch", str(sp.batch));

  return (
    <AdminShell user={user} title="Enrollments">
      <div className="flex flex-col gap-6">
        <AdminPageHeader
          title="New Enrollment"
          description="Enroll an existing, active student in a course and batch."
          backHref="/admin/enrollments"
          backLabel="Back to Enrollments"
        />

        <Card className="w-full max-w-xl">
          {data.student ? (
            <EnrollmentForm
              key={`${data.student.id}-${data.initialCourse}-${data.initialBatch}`}
              student={data.student}
              courses={data.courses}
              batches={data.batches}
              initialCourse={data.initialCourse}
              initialBatch={data.initialBatch}
            />
          ) : (
            <div className="flex flex-col gap-4">
              <form method="get" action="/admin/enrollments/new" role="search" className="flex flex-col gap-3">
                {[...carry.entries()].map(([k, v]) => (
                  <input key={k} type="hidden" name={k} value={v} />
                ))}
                <Input label="Find a student" id="sq" name="sq" type="search" defaultValue={studentQuery} placeholder="Name, email or phone" maxLength={100} />
                <div>
                  <Button type="submit">Search</Button>
                </div>
              </form>
              {data.candidates.length === 0 ? (
                <EmptyState title="No students available." description="Only active student accounts can be enrolled. Try a different search." />
              ) : (
                <ul className="divide-y divide-border rounded-sm border border-border">
                  {data.candidates.map((s) => {
                    const q = new URLSearchParams(carry);
                    q.set("student", s.id);
                    return (
                      <li key={s.id} className="flex items-center justify-between gap-3 px-3 py-2.5 text-sm">
                        <span className="min-w-0">
                          <span className="block truncate font-medium text-dark">{s.name}</span>
                          <span className="block truncate text-xs text-muted">{s.email}</span>
                        </span>
                        <Link href={`/admin/enrollments/new?${q.toString()}`} className="flex-none font-medium text-primary hover:text-primary-hover">
                          Select
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          )}
        </Card>
      </div>
    </AdminShell>
  );
}
