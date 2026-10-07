import { AuthShell } from "@/components/auth/AuthShell";
import { RegisterForm } from "@/components/auth/RegisterForm";

export const metadata = {
  title: "Create Account",
  description: "Create your free TechOTD Academy account.",
};

export default function RegisterPage() {
  return (
    <AuthShell
      eyebrow="Get started"
      aside={{ text: "Already have an account?", label: "Sign in", href: "/login" }}
      title="Create your account"
      description="Create a free student account to explore courses and book counselling."
      highlights={[
        "Free to create — no payment required to register",
        "Used for course enquiries, batches and future learner tools",
      ]}
    >
      <RegisterForm />
    </AuthShell>
  );
}
