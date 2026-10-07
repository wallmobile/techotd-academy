"use client";

import { useActionState } from "react";
import Link from "next/link";
import { PasswordField } from "@/components/auth/PasswordField";
import { AuthSubmitButton } from "@/components/auth/AuthSubmitButton";
import { resetPasswordAction } from "@/lib/auth/actions";

const initialState = { status: "idle", errors: {}, formError: null };

export function ResetPasswordForm({ token }) {
  const [state, formAction] = useActionState(resetPasswordAction, initialState);

  if (state.status === "success") {
    return (
      <div className="flex flex-col gap-3">
        <p role="status" className="rounded-sm border border-success/30 bg-success/5 px-4 py-3 text-sm text-text">
          {state.message}
        </p>
        <Link href="/login" className="text-center text-sm font-medium text-primary hover:underline">
          Continue to sign in
        </Link>
      </div>
    );
  }

  if (!token) {
    return (
      <p role="alert" className="rounded-sm border border-danger/30 bg-danger/5 px-4 py-3 text-sm text-danger">
        This password reset link is missing its token. Please request a new one from the{" "}
        <Link href="/forgot-password" className="font-medium underline">
          forgot password
        </Link>{" "}
        page.
      </p>
    );
  }

  return (
    <form action={formAction} noValidate className="flex flex-col gap-3">
      {state.formError && (
        <p role="alert" className="rounded-sm border border-danger/30 bg-danger/5 px-4 py-3 text-sm text-danger">
          {state.formError}
        </p>
      )}

      <input type="hidden" name="token" value={token} />

      <PasswordField
        label="New Password"
        id="password"
        name="password"
        autoComplete="new-password"
        error={state.errors?.password}
      />

      <PasswordField
        label="Confirm New Password"
        id="confirmPassword"
        name="confirmPassword"
        autoComplete="new-password"
        error={state.errors?.confirmPassword}
      />

      <AuthSubmitButton className="w-full">Update password</AuthSubmitButton>
    </form>
  );
}
