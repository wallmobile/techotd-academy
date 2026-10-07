import { Container } from "@/components/layout/Container";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { LogoutButton } from "@/components/auth/LogoutButton";

const ROLE_LABELS = {
  SUPER_ADMIN: "Super Admin",
  ADMIN: "Admin",
  COUNSELLOR: "Counsellor",
  TRAINER: "Trainer",
  ACCOUNTANT: "Accountant",
  CONTENT_MANAGER: "Content Manager",
  PLACEMENT_MANAGER: "Placement Manager",
  STUDENT: "Student",
};

/**
 * Minimal protected placeholder for /student, /trainer and /admin.
 * Phase 7 only needs to prove authentication + role-based access work end
 * to end — the actual dashboards (LMS, trainer tools, admin panel) are
 * future phases, so this deliberately does nothing beyond confirming who's
 * signed in and offering logout.
 */
export function PlaceholderDashboard({ area, user }) {
  return (
    <div className="flex min-h-screen flex-col bg-surface">
      <Container className="flex flex-1 items-center py-10">
        <Card className="mx-auto w-full max-w-lg text-center">
          <Badge variant="neutral">{area}</Badge>
          <h1 className="mt-4 text-xl font-semibold tracking-tight text-dark">
            Welcome, {user.name}
          </h1>
          <p className="mt-1 text-sm text-muted">
            Signed in as <span className="font-medium text-text">{user.email}</span>
          </p>
          <p className="mt-1 text-sm text-muted">
            Role: <span className="font-medium text-text">{ROLE_LABELS[user.role] || user.role}</span>
          </p>

          <p className="mt-6 rounded-sm border border-border bg-surface px-4 py-3 text-sm text-muted">
            The full {area.toLowerCase()} dashboard is coming in a later phase. This page only
            confirms that authentication and role-based access are working.
          </p>

          <div className="mt-6">
            <LogoutButton />
          </div>
        </Card>
      </Container>
    </div>
  );
}
