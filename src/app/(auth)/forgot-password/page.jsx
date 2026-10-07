import { AuthShell } from "@/components/auth/AuthShell";
import { ForgotPasswordForm } from "@/components/auth/ForgotPasswordForm";

export const metadata = {
  title: "Forgot Password",
  description: "Request a password reset for your TechOTD Academy account.",
};

export default function ForgotPasswordPage() {
  return (
    <AuthShell
      eyebrow="Account recovery"
      aside={{ text: "Remembered it?", label: "Sign in", href: "/login" }}
      title="Reset your password"
      description="Enter the email address on your account. If it matches a registered account, we'll help you reset your password."
    >
      <ForgotPasswordForm />
    </AuthShell>
  );
}
