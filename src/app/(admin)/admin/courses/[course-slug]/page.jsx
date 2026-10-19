import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdminContext } from "@/lib/admin/context";
import { getCourseDetailForAdmin, getCourseFormOptions } from "@/lib/admin/courses";
import { AdminShell } from "@/components/admin/AdminShell";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { CourseForm, CourseStatusForm } from "@/components/admin/CatalogForms";
import { AuditList, BatchStatusBadge, CourseStatusBadge, DetailRow, enrollmentLabel } from "@/components/admin/CatalogParts";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";

export const metadata = {
  title: "Course Detail",
  robots: { index: false, follow: false },
};

export default async function AdminCourseDetailPage({ params }) {
  const { user } = await requireAdminContext();
  const { "course-slug": slug } = await params;
  const detail = await getCourseDetailForAdmin(slug);
  if (!detail) notFound();
  const { course, batches, counts, audit } = detail;
  // Only the editable fields go to the client form (not the whole syllabus).
  const initial = {
    slug: course.slug,
    title: course.title,
    shortDescription: course.shortDescription,
    description: course.description,
    categorySlug: course.categorySlug,
    level: course.level,
    duration: course.duration,
    durationBand: course.durationBand,
    modes: course.modes,
    technologies: course.technologies,
    prerequisites: course.prerequisites,
    outcomes: course.outcomes,
  };

  return (
    <AdminShell user={user} title="Courses">
      <div className="flex flex-col gap-6">
        <AdminPageHeader title={course.title} backHref="/admin/courses" backLabel="Back to Courses">
          <div className="flex items-center gap-2">
            <CourseStatusBadge status={course.status} />
            {course.isCustom && <Badge variant="secondary">Created here</Badge>}
          </div>
        </AdminPageHeader>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <Card>
            <h2 className="text-sm font-semibold text-dark">Course</h2>
            <dl className="mt-4 flex flex-col gap-2.5 text-sm">
              <DetailRow label="Public page">
                {course.status === "PUBLISHED" ? (
                  <Link href={`/courses/${course.slug}`} className="text-primary hover:text-primary-hover">
                    /courses/{course.slug}
                  </Link>
                ) : (
                  <span className="text-muted">Not public (unpublished)</span>
                )}
              </DetailRow>
              <DetailRow label="Category">{course.category}</DetailRow>
              <DetailRow label="Level">{course.level}</DetailRow>
              <DetailRow label="Duration">{course.duration}</DetailRow>
              <DetailRow label="Modes">{course.modes.join(", ") || "—"}</DetailRow>
              <DetailRow label="Technologies">{course.technologies.join(", ") || "—"}</DetailRow>
              <DetailRow label="Batches">{counts.batchCount}</DetailRow>
              <DetailRow label="Enrollments">{enrollmentLabel(counts)}</DetailRow>
            </dl>
          </Card>

          <Card>
            <h2 className="text-sm font-semibold text-dark">Publication</h2>
            <div className="mt-4">
              <CourseStatusForm slug={course.slug} status={course.status} activeEnrollments={counts.active} />
            </div>
          </Card>

          <Card className="lg:col-span-2">
            <h2 className="text-sm font-semibold text-dark">Edit course</h2>
            <div className="mt-4 max-w-3xl">
              <CourseForm mode="edit" options={getCourseFormOptions()} initial={initial} />
            </div>
          </Card>

          <Card className="lg:col-span-2">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-sm font-semibold text-dark">Batches</h2>
              <Button href={`/admin/batches/new?course=${course.slug}`} size="sm" variant="outline">
                + New batch
              </Button>
            </div>
            {batches.length === 0 ? (
              <p className="mt-3 text-sm text-muted">This course has no batches yet.</p>
            ) : (
              <ul className="mt-3 flex flex-col divide-y divide-border text-sm">
                {batches.map((b) => (
                  <li key={b.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5">
                    <div className="min-w-0">
                      <Link href={`/admin/batches/${b.id}`} className="font-medium text-dark hover:text-primary">
                        {b.mode} — {b.startDate}
                      </Link>
                      <p className="text-xs text-muted">
                        {b.schedule} · {enrollmentLabel(b)}
                      </p>
                    </div>
                    <BatchStatusBadge status={b.status} />
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card className="lg:col-span-2">
            <h2 className="text-sm font-semibold text-dark">Change history</h2>
            <div className="mt-3">
              <AuditList rows={audit} />
            </div>
          </Card>
        </div>
      </div>
    </AdminShell>
  );
}
