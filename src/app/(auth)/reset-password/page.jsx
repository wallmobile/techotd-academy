import { AuthShell } from "@/components/auth/AuthShell";
import { ResetPasswordForm } from "@/components/auth/ResetPasswordForm";

export const metadata = {
  title: "Reset Password",
  description: "Choose a new password for your TechOTD Academy account.",
};

function readToken(searchParams) {
  const token = searchParams?.token;
  return typeof token === "string" ? token : "";
}

export default async function ResetPasswordPage({ searchParams }) {
  const resolvedSearchParams = await searchParams;
  const token = readToken(resolvedSearchParams);

  return (
    <AuthShell
      eyebrow="Account recovery"
      aside={{ text: "Back to", label: "Sign in", href: "/login" }}
      title="Choose a new password"
      description="Your reset link is single-use and expires shortly for your security."
    >
      <ResetPasswordForm token={token} />
    </AuthShell>
  );
}
