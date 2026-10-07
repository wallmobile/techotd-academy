"use client";

import { useActionState } from "react";
import Link from "next/link";
import { Input } from "@/components/ui/Input";
import { AuthSubmitButton } from "@/components/auth/AuthSubmitButton";
import { forgotPasswordAction } from "@/lib/auth/actions";

const initialState = { status: "idle", errors: {}, message: null };

export function ForgotPasswordForm() {
  const [state, formAction] = useActionState(forgotPasswordAction, initialState);

  if (state.status === "success") {
    return (
      <div className="flex flex-col gap-3">
        <p role="status" className="rounded-sm border border-success/30 bg-success/5 px-4 py-3 text-sm text-text">
          {state.message}
        </p>
        {state.devResetPath && (
          <p className="rounded-sm border border-border bg-surface px-4 py-3 text-xs text-muted">
            Development only — no email delivery is configured yet, so here is the reset
            link that would normally be emailed:{" "}
            <Link href={state.devResetPath} className="font-medium text-primary hover:underline">
              Continue to reset password
            </Link>
          </p>
        )}
        <Link href="/login" className="text-center text-sm font-medium text-primary hover:underline">
          Back to sign in
        </Link>
      </div>
    );
  }

  return (
    <form action={formAction} noValidate className="flex flex-col gap-3">
      <Input
        label="Email"
        id="email"
        name="email"
        type="email"
        autoComplete="email"
        error={state.errors?.email}
        required
      />

      <AuthSubmitButton className="w-full">Send reset instructions</AuthSubmitButton>

      <p className="text-center text-sm text-muted">
        Remembered your password?{" "}
        <Link href="/login" className="font-medium text-primary hover:underline">
          Sign in
        </Link>
      </p>
    </form>
  );
}
