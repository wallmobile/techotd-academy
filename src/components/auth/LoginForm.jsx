"use client";

import { useActionState } from "react";
import Link from "next/link";
import { Input } from "@/components/ui/Input";
import { PasswordField } from "@/components/auth/PasswordField";
import { AuthSubmitButton } from "@/components/auth/AuthSubmitButton";
import { loginAction } from "@/lib/auth/actions";

const mailIcon = (
  <svg viewBox="0 0 20 20" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2.5" y="4" width="15" height="12" rx="2.5" />
    <path d="M3 6l7 5 7-5" />
  </svg>
);

const lockIcon = (
  <svg viewBox="0 0 20 20" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <rect x="4" y="9" width="12" height="8" rx="2.5" />
    <path d="M7 9V6.5a3 3 0 016 0V9" />
  </svg>
);

const initialState = { status: "idle", errors: {}, formError: null, values: {} };

export function LoginForm() {
  const [state, formAction] = useActionState(loginAction, initialState);

  return (
    <form action={formAction} noValidate className="flex flex-col gap-3">
      {state.formError && (
        <p role="alert" className="rounded-xl border border-danger/30 bg-danger/5 px-4 py-3 text-sm text-danger">
          {state.formError}
        </p>
      )}

      <Input
        label="Email"
        icon={mailIcon}
        placeholder="you@example.com"
        id="email"
        name="email"
        type="email"
        autoComplete="email"
        defaultValue={state.values?.email}
        error={state.errors?.email}
        required
      />

      <PasswordField
        label="Password"
        icon={lockIcon}
        id="password"
        name="password"
        autoComplete="current-password"
        error={state.errors?.password}
      />

      <div className="flex items-center justify-between text-[13px]">
        <label className="flex cursor-pointer items-center gap-2 text-text">
          <input type="checkbox" name="remember" className="h-4 w-4 rounded border-border" />
          Remember me
        </label>
        <Link href="/forgot-password" className="font-medium text-primary hover:underline">
          Forgot password?
        </Link>
      </div>

      <AuthSubmitButton className="w-full">Sign in</AuthSubmitButton>

      <p className="text-center text-sm text-muted">
        New to TechOTD Academy?{" "}
        <Link href="/register" className="font-semibold text-primary hover:underline">
          Create an account
        </Link>
      </p>
    </form>
  );
}
