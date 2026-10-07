import { getCurrentUser } from "@/lib/auth/currentUser";
import { StudentShell } from "@/components/student/StudentShell";
import { Button } from "@/components/ui/Button";

export default async function StudentCertificateNotFound() {
  // Reached only once the (student) layout's requireArea("student") has
  // already passed. Also covers "this certificate exists but belongs to
  // a different student" — see getCertificateDetailForStudent() — so the
  // message stays generic rather than confirming a certificate id exists.
  const user = await getCurrentUser();

  return (
    <StudentShell user={user} title="Certificate Not Found">
      <div className="flex flex-col items-center gap-4 rounded-md border border-border bg-white p-10 text-center">
        <h2 className="text-lg font-semibold text-dark">Certificate Not Found</h2>
        <p className="max-w-md text-sm text-muted">
          This certificate doesn&apos;t exist or isn&apos;t available to you.
        </p>
        <Button href="/student/certificates">Back to Certificates</Button>
      </div>
    </StudentShell>
  );
}
