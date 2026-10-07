import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

// Every action here is a real, built route (Phase 8.8 final polish) — no
// disabled "coming soon" buttons left on the dashboard.
const actions = [
  { label: "Browse Courses", href: "/courses" },
  { label: "My Courses", href: "/student/courses" },
  { label: "View Schedule", href: "/student/schedule" },
  { label: "Assignments", href: "/student/assignments" },
  { label: "Attendance", href: "/student/attendance" },
  { label: "Certificates", href: "/student/certificates" },
  { label: "Update Profile", href: "/student/profile" },
];

export function QuickActions() {
  return (
    <Card>
      <h3 className="text-sm font-semibold text-dark">Quick Actions</h3>
      <div className="mt-4 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
        {actions.map((action) => (
          <Button key={action.label} href={action.href} variant="outline" size="sm">
            {action.label}
          </Button>
        ))}
      </div>
    </Card>
  );
}
