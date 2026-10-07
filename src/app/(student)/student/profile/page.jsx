import { redirect } from "next/navigation";
import { getMyProfile } from "@/lib/student/profile";
import { StudentShell } from "@/components/student/StudentShell";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { ProfileEditForm } from "@/components/student/profile/ProfileEditForm";
import { ChangePasswordForm } from "@/components/student/profile/ChangePasswordForm";

export const metadata = {
  title: "Profile",
  robots: { index: false, follow: false },
};

const STATUS_VARIANT = { ACTIVE: "success", INACTIVE: "neutral", SUSPENDED: "danger" };

function initials(name) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

export default async function StudentProfilePage() {
  // getMyProfile() derives the student from the session itself — there is
  // no id anywhere in this route to spoof another student's profile. Its
  // return shape only ever carries display-safe fields: no passwordHash,
  // no session token, no other internal database column.
  const detail = await getMyProfile();
  if (!detail) redirect("/login");
  const { user, profile } = detail;

  return (
    <StudentShell user={user} title="Profile">
      <div className="flex flex-col gap-6">
        <Card className="flex flex-col gap-4 sm:flex-row sm:items-center">
          <span
            aria-hidden="true"
            className="flex h-16 w-16 flex-none items-center justify-center overflow-hidden rounded-full bg-primary/10 text-xl font-semibold text-primary"
          >
            {profile.avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={profile.avatarUrl} alt="" className="h-full w-full object-cover" />
            ) : (
              initials(user.name) || "S"
            )}
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="truncate text-lg font-semibold text-dark">{user.name}</h2>
            <p className="truncate text-sm text-muted">{user.email}</p>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <Badge variant="primary">{user.role}</Badge>
              <Badge variant={STATUS_VARIANT[user.status] || "neutral"}>{user.status}</Badge>
            </div>
          </div>
        </Card>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <Card className="flex flex-col gap-4">
            <div>
              <h3 className="text-sm font-semibold text-dark">Edit Profile</h3>
              <p className="mt-1 text-xs text-muted">
                Email can&apos;t be changed here yet — contact support if it needs to be updated.
              </p>
            </div>
            <ProfileEditForm
              initialValues={{
                name: user.name || "",
                phone: profile.phone || "",
                city: profile.city || "",
                bio: profile.bio || "",
              }}
            />
          </Card>

          <Card className="flex flex-col gap-4">
            <div>
              <h3 className="text-sm font-semibold text-dark">Change Password</h3>
              <p className="mt-1 text-xs text-muted">
                Changing your password signs you out of any other devices you&apos;re signed in on.
              </p>
            </div>
            <ChangePasswordForm />
          </Card>
        </div>
      </div>
    </StudentShell>
  );
}
