import { AuthShell } from "@/components/auth/AuthShell";
import { LoginForm } from "@/components/auth/LoginForm";

export const metadata = {
  title: "Sign In",
  description: "Sign in to your TechOTD Academy account.",
};

export default function LoginPage() {
  return (
    <AuthShell
      eyebrow="Welcome back"
      aside={{ text: "New here?", label: "Create account", href: "/register" }}
      title="Welcome back"
      description="Sign in to pick up your courses, batches and enquiries."
      highlights={[
        "One account across courses, batches and enquiries",
        "Your details stay private and are never shared without consent",
      ]}
    >
      <LoginForm />
    </AuthShell>
  );
}
