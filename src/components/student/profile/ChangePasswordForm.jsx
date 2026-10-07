"use client";

import { useActionState, useEffect, useRef } from "react";
import { useFormStatus } from "react-dom";
import { PasswordField } from "@/components/auth/PasswordField";
import { Button } from "@/components/ui/Button";
import { changePasswordAction } from "@/lib/student/profileActions";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" loading={pending} disabled={pending}>
      Change Password
    </Button>
  );
}

const initialState = { status: "idle", errors: {}, formError: null };

/**
 * Requires the current password before accepting a new one (never just
 * an active session) — see changePasswordAction. Passwords are never
 * displayed: every field here is a real masked <input type="password">
 * via PasswordField, whose show/hide toggle only ever affects what's
 * rendered client-side, never what's sent or logged.
 */
export function ChangePasswordForm() {
  const [state, formAction] = useActionState(changePasswordAction, initialState);
  const successRef = useRef(null);

  useEffect(() => {
    if (state.status === "success") successRef.current?.focus();
  }, [state]);

  if (state.status === "success") {
    return (
      <p
        ref={successRef}
        tabIndex={-1}
        role="status"
        className="rounded-sm border border-success/30 bg-success/10 px-4 py-3 text-sm font-medium text-success outline-none"
      >
        {state.message}
      </p>
    );
  }

  return (
    <form action={formAction} noValidate className="flex flex-col gap-4">
      {state.formError && (
        <p role="alert" className="rounded-sm border border-danger/30 bg-danger/5 px-4 py-3 text-sm text-danger">
          {state.formError}
        </p>
      )}

      <PasswordField
        label="Current Password"
        id="currentPassword"
        name="currentPassword"
        autoComplete="current-password"
        error={state.errors?.currentPassword}
      />

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

      <SubmitButton />
    </form>
  );
}
